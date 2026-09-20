use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::time::Duration;

use sqlx::sqlite::{SqliteConnectOptions, SqliteConnection};
use sqlx::ConnectOptions;

use crate::{
    State,
    install::{InstallPhaseDetails, InstallProgressReporter},
    pack::{
        import::{self, finish_import},
        install_from::{self, CreatePackDescription, PackDependency},
    },
    state::ModLoader,
};

/// ModLEX: the real Modrinth App is the exact same fork lineage as this app —
/// same `instances`/`instance_content_sets` schema — so instead of parsing a
/// foreign config format like the other importers, we read its `app.db`
/// directly (read-only; we never write to another app's database).
async fn open_read_only(db_path: &Path) -> crate::Result<SqliteConnection> {
    let conn_options = SqliteConnectOptions::new()
        .filename(db_path)
        .busy_timeout(Duration::from_secs(5))
        .read_only(true)
        .create_if_missing(false);

    Ok(conn_options.connect().await?)
}

fn db_path(base_path: &Path) -> PathBuf {
    base_path.join("app.db")
}

/// Папка данных Modrinth App: у него в настройках можно задать свою (`custom_dir`), и тогда профили лежат
/// там, а не в `%APPDATA%/ModrinthApp`. Берём её, если задана и существует.
async fn data_dir(conn: &mut SqliteConnection, base_path: &Path) -> PathBuf {
    let custom: Option<String> =
        sqlx::query_scalar::<_, Option<String>>("SELECT custom_dir FROM settings LIMIT 1")
            .fetch_optional(&mut *conn)
            .await
            .ok()
            .flatten()
            .flatten();
    match custom {
        Some(dir) if !dir.trim().is_empty() && Path::new(&dir).is_dir() => PathBuf::from(dir),
        _ => base_path.to_path_buf(),
    }
}

pub async fn get_instances(base_path: &Path) -> crate::Result<Vec<String>> {
    let mut conn = match open_read_only(&db_path(base_path)).await {
        Ok(conn) => conn,
        // Not every machine with a ModrinthApp data folder actually has an
        // app.db yet (fresh install, or an old pre-DB version) — that's not
        // an error, it just means there's nothing importable here.
        Err(_) => return Ok(Vec::new()),
    };

    let rows: Vec<(String, String)> = sqlx::query_as(
        "SELECT name, path FROM instances ORDER BY name COLLATE NOCASE",
    )
    .fetch_all(&mut conn)
    .await
    .unwrap_or_default();
    let profiles = data_dir(&mut conn, base_path).await.join("profiles");

    // запись без папки на диске импортировать нечего — не предлагаем её
    let rows: Vec<(String, String)> = rows
        .into_iter()
        .filter(|(_, path)| profiles.join(path).is_dir())
        .collect();

    // у нескольких инстансов может быть одно имя — тогда различаем их по имени папки
    let mut counts: HashMap<String, usize> = HashMap::new();
    for (name, _) in &rows {
        *counts.entry(name.to_lowercase()).or_default() += 1;
    }
    Ok(rows
        .into_iter()
        .map(|(name, path)| {
            if counts.get(&name.to_lowercase()).copied().unwrap_or(0) > 1 {
                path
            } else {
                name
            }
        })
        .collect())
}

struct ModrinthAppInstanceRow {
    path: String,
    icon_path: Option<String>,
    game_version: Option<String>,
    loader: Option<String>,
    loader_version: Option<String>,
}

async fn get_instance_row(
    conn: &mut SqliteConnection,
    instance_name: &str,
) -> crate::Result<ModrinthAppInstanceRow> {
    let row: (String, Option<String>, Option<String>, Option<String>, Option<String>) = sqlx::query_as(
        "SELECT i.path, i.icon_path, cs.game_version, cs.loader, cs.loader_version \
         FROM instances i \
         LEFT JOIN instance_content_sets cs ON cs.id = i.applied_content_set_id \
         WHERE i.path = ?1 OR i.name = ?1 \
         ORDER BY (i.path = ?1) DESC, i.modified DESC LIMIT 1",
    )
    .bind(instance_name)
    .fetch_optional(conn)
    .await?
    .ok_or_else(|| {
        crate::ErrorKind::InputError(format!(
            "Could not find instance '{instance_name}' in the Modrinth App database"
        ))
    })?;

    Ok(ModrinthAppInstanceRow {
        path: row.0,
        icon_path: row.1,
        game_version: row.2,
        loader: row.3,
        loader_version: row.4,
    })
}

pub async fn import_modrinth_app_instance(
    base_path: PathBuf,
    instance_name: String,
    instance_id: &str,
    reporter: InstallProgressReporter,
    details: InstallPhaseDetails,
) -> crate::Result<()> {
    let mut conn = open_read_only(&db_path(&base_path)).await?;
    let row = get_instance_row(&mut conn, &instance_name).await?;
    let data_dir = data_dir(&mut conn, &base_path).await;
    // Close the connection promptly rather than holding it for the whole
    // (potentially slow) file copy below.
    drop(conn);

    // без папки инстанса копировать нечего — понятная ошибка вместо «исчезнувшего» инстанса
    let instance_folder = data_dir.join("profiles").join(&row.path);
    if !instance_folder.is_dir() {
        return Err(crate::ErrorKind::InputError(format!(
            "Папка инстанса '{}' не найдена: {}",
            instance_name,
            instance_folder.display()
        ))
        .into());
    }

    // иконка — не повод отменять весь импорт
    let icon = match row.icon_path {
        Some(icon_path) => {
            match import::recache_icon(data_dir.join(icon_path)).await {
                Ok(icon) => icon,
                Err(error) => {
                    tracing::warn!("Skipping icon of imported Modrinth instance: {error}");
                    None
                }
            }
        }
        None => None,
    };

    let description = CreatePackDescription {
        icon,
        override_title: Some(instance_name),
        project_id: None,
        version_id: None,
        instance_id: instance_id.to_string(),
        source_filename: None,
    };

    let mut dependencies = HashMap::new();
    if let Some(game_version) = row.game_version {
        dependencies.insert(PackDependency::Minecraft, game_version);
    }
    if let (Some(loader), Some(loader_version)) =
        (row.loader.as_deref(), row.loader_version)
    {
        let dependency = match ModLoader::from_string(loader) {
            ModLoader::Forge => Some(PackDependency::Forge),
            ModLoader::NeoForge => Some(PackDependency::NeoForge),
            ModLoader::Fabric => Some(PackDependency::FabricLoader),
            ModLoader::Quilt => Some(PackDependency::QuiltLoader),
            ModLoader::Vanilla => None,
        };
        if let Some(dependency) = dependency {
            dependencies.insert(dependency, loader_version);
        }
    }

    install_from::set_instance_information(
        instance_id.to_string(),
        &description,
        "Imported Modrinth Instance",
        None,
        &dependencies,
        false,
    )
    .await?;

    let state = State::get().await?;
    finish_import(
        instance_id,
        instance_folder,
        &state.io_semaphore,
        reporter,
        details,
    )
    .await?;

    Ok(())
}
