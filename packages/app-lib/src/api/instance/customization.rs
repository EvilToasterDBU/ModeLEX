//! Оформление инстанса от автора сборки: `<инстанс>/modlex/modlex.json` и ассеты рядом с ним.
//! Формат — docs/CUSTOMIZATION_SPEC.md (часть A).
//!
//! Всё содержимое папки приходит вместе со сборкой из интернета, то есть недоверенное: проверяем
//! пути (только внутри `modlex/`), форматы, размеры и число файлов, а интерфейсу отдаём только то,
//! что прошло проверку. Ошибка в одном блоке отбрасывает этот блок, а не всё оформление.

use crate::state::{InstanceIconConfig, State};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use std::path::{Component, Path, PathBuf};

const CUSTOMIZATION_DIR: &str = "modlex";
const MANIFEST_FILE: &str = "modlex.json";
const SUPPORTED_SCHEMA: u64 = 1;

const MAX_MANIFEST_BYTES: u64 = 64 * 1024;
const MAX_STILL_BYTES: u64 = 8 * 1024 * 1024;
const MAX_ANIMATED_BYTES: u64 = 15 * 1024 * 1024;
const MAX_FOLDER_BYTES: u64 = 64 * 1024 * 1024;
const MAX_FOLDER_FILES: usize = 64;
const MAX_DIMENSION: u32 = 4096;
const MAX_TEXT_CHARS: usize = 120;
const MAX_RELATIVE_PATH_CHARS: usize = 200;
const MAX_ICON_BYTES: u64 = 4 * 1024 * 1024;
const ICON_FILE_STEM: &str = "icon";
const IMAGE_EXTENSIONS: [&str; 6] = ["webp", "png", "jpg", "jpeg", "gif", "apng"];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AnimateMode {
    Hover,
    Always,
    Never,
}

/// Хедер или карточка инстанса: картинка «в покое» и та, что показывается при наведении.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FaceCustomization {
    pub image: Option<String>,
    pub hover: Option<String>,
    pub animate: AnimateMode,
    pub focus: Option<[f32; 2]>,
    /// Масштаб картинки внутри кадра, 1..3 (вместе с `focus` — «сдвинь и приблизь»)
    pub zoom: Option<f32>,
    pub accent: Option<String>,
    /// Слой поверх содержимого (полупрозрачная картинка): рисуется выше значка и текста, но не
    /// перехватывает мышь
    pub overlay: Option<String>,
    pub overlay_focus: Option<[f32; 2]>,
    pub overlay_zoom: Option<f32>,
    pub overlay_opacity: Option<f32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PageCustomization {
    pub banner: Option<String>,
    pub background: Option<String>,
    pub animate: AnimateMode,
    pub accent: Option<String>,
    pub banner_focus: Option<[f32; 2]>,
    pub banner_zoom: Option<f32>,
    pub background_focus: Option<[f32; 2]>,
    pub background_zoom: Option<f32>,
    /// Слой поверх шапки страницы
    pub overlay: Option<String>,
    pub overlay_focus: Option<[f32; 2]>,
    pub overlay_zoom: Option<f32>,
    pub overlay_opacity: Option<f32>,
}

/// Проверенное оформление. Пути к файлам — абсолютные, внутри папки `modlex/` инстанса.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceCustomization {
    pub schema: u32,
    pub author: Option<String>,
    pub header: Option<FaceCustomization>,
    pub card: Option<FaceCustomization>,
    pub page: Option<PageCustomization>,
    pub logo: Option<String>,
    /// Что и почему отброшено — для редактора и отладки, интерфейс это не показывает
    pub warnings: Vec<String>,
}

async fn instance_dir(instance_id: &str) -> crate::Result<PathBuf> {
    let state = State::get().await?;
    let path =
        crate::state::instances::adapters::sqlite::instance_rows::get_instance_path_by_id(
            instance_id,
            &state.pool,
        )
        .await?
        .ok_or_else(|| {
            crate::ErrorKind::InputError("Unknown instance".to_string())
        })?;
    Ok(state.directories.instances_dir().join(path))
}

/// Читает и проверяет оформление инстанса. `None` — оформления нет вовсе (нет манифеста) или
/// манифест не читается/новее поддерживаемой версии: тогда просто рисуется по умолчанию.
pub async fn get_customization(
    instance_id: &str,
) -> crate::Result<Option<InstanceCustomization>> {
    let instance_dir = instance_dir(instance_id).await?;
    // чтение файлов и декодирование заголовков картинок — блокирующие
    Ok(tokio::task::spawn_blocking(move || {
        read_customization(&instance_dir)
    })
    .await?)
}

fn read_customization(instance_dir: &Path) -> Option<InstanceCustomization> {
    let root = dunce::canonicalize(instance_dir.join(CUSTOMIZATION_DIR)).ok()?;
    if !root.is_dir() {
        return None;
    }
    let manifest_path = root.join(MANIFEST_FILE);
    let manifest_meta = std::fs::metadata(&manifest_path).ok()?;
    if !manifest_meta.is_file() || manifest_meta.len() > MAX_MANIFEST_BYTES {
        return None;
    }
    let manifest: Value =
        serde_json::from_slice(&std::fs::read(&manifest_path).ok()?).ok()?;
    let manifest = manifest.as_object()?;

    // новее поддерживаемой схемы — не пытаемся угадывать, игнорируем целиком
    let schema = manifest.get("schema")?.as_u64()?;
    if schema == 0 || schema > SUPPORTED_SCHEMA {
        return None;
    }

    let mut warnings = Vec::new();
    if let Err(reason) = check_folder_limits(&root) {
        warnings.push(reason);
        return Some(InstanceCustomization {
            schema: schema as u32,
            author: None,
            header: None,
            card: None,
            page: None,
            logo: None,
            warnings,
        });
    }

    let ctx = AssetContext { root: &root };
    Some(InstanceCustomization {
        schema: schema as u32,
        author: text(manifest.get("author")),
        header: face(manifest.get("header"), "header", &ctx, &mut warnings),
        card: face(manifest.get("card"), "card", &ctx, &mut warnings),
        page: page(manifest.get("page"), &ctx, &mut warnings),
        logo: manifest
            .get("logo")
            .and_then(Value::as_object)
            .and_then(|logo| {
                asset(
                    logo.get("file"),
                    "logo.file",
                    MAX_ANIMATED_BYTES,
                    &ctx,
                    &mut warnings,
                )
            }),
        warnings,
    })
}

struct AssetContext<'a> {
    root: &'a Path,
}

fn face(
    value: Option<&Value>,
    name: &str,
    ctx: &AssetContext,
    warnings: &mut Vec<String>,
) -> Option<FaceCustomization> {
    let block = value?.as_object()?;
    let result = FaceCustomization {
        image: asset(
            block.get("image"),
            &format!("{name}.image"),
            MAX_STILL_BYTES,
            ctx,
            warnings,
        ),
        hover: asset(
            block.get("hover"),
            &format!("{name}.hover"),
            MAX_ANIMATED_BYTES,
            ctx,
            warnings,
        ),
        animate: animate_mode(block, AnimateMode::Hover),
        focus: focus(block.get("focus")),
        zoom: zoom(block.get("zoom")),
        accent: color(block.get("accent")),
        overlay: asset(
            block.get("overlay"),
            &format!("{name}.overlay"),
            MAX_ANIMATED_BYTES,
            ctx,
            warnings,
        ),
        overlay_focus: focus(block.get("overlayFocus")),
        overlay_zoom: zoom(block.get("overlayZoom")),
        overlay_opacity: opacity(block.get("overlayOpacity")),
    };
    (result.image.is_some()
        || result.hover.is_some()
        || result.accent.is_some()
        || result.overlay.is_some())
        .then_some(result)
}

fn page(
    value: Option<&Value>,
    ctx: &AssetContext,
    warnings: &mut Vec<String>,
) -> Option<PageCustomization> {
    let block = value?.as_object()?;
    let result = PageCustomization {
        banner: asset(
            block.get("banner"),
            "page.banner",
            MAX_ANIMATED_BYTES,
            ctx,
            warnings,
        ),
        background: asset(
            block.get("background"),
            "page.background",
            MAX_ANIMATED_BYTES,
            ctx,
            warnings,
        ),
        animate: animate_mode(block, AnimateMode::Always),
        accent: color(block.get("accent")),
        banner_focus: focus(block.get("bannerFocus")),
        banner_zoom: zoom(block.get("bannerZoom")),
        background_focus: focus(block.get("backgroundFocus")),
        background_zoom: zoom(block.get("backgroundZoom")),
        overlay: asset(
            block.get("overlay"),
            "page.overlay",
            MAX_ANIMATED_BYTES,
            ctx,
            warnings,
        ),
        overlay_focus: focus(block.get("overlayFocus")),
        overlay_zoom: zoom(block.get("overlayZoom")),
        overlay_opacity: opacity(block.get("overlayOpacity")),
    };
    (result.banner.is_some()
        || result.background.is_some()
        || result.accent.is_some()
        || result.overlay.is_some())
        .then_some(result)
}

fn animate_mode(block: &Map<String, Value>, default: AnimateMode) -> AnimateMode {
    match block.get("animate").and_then(Value::as_str) {
        Some("hover") => AnimateMode::Hover,
        Some("always") => AnimateMode::Always,
        Some("never") => AnimateMode::Never,
        _ => default,
    }
}

/// Короткая строка без управляющих символов; всё длиннее лимита обрезается
fn text(value: Option<&Value>) -> Option<String> {
    let text: String = value?
        .as_str()?
        .chars()
        .filter(|c| !c.is_control())
        .take(MAX_TEXT_CHARS)
        .collect();
    let text = text.trim().to_string();
    (!text.is_empty()).then_some(text)
}

/// Только `#rrggbb`
fn color(value: Option<&Value>) -> Option<String> {
    let text = value?.as_str()?;
    let hex = text.strip_prefix('#')?;
    (hex.len() == 6 && hex.chars().all(|c| c.is_ascii_hexdigit()))
        .then(|| text.to_ascii_lowercase())
}

/// Точка фокуса [x, y] в долях 0..1
fn focus(value: Option<&Value>) -> Option<[f32; 2]> {
    let array = value?.as_array()?;
    if array.len() != 2 {
        return None;
    }
    let x = array[0].as_f64()?;
    let y = array[1].as_f64()?;
    (x.is_finite() && y.is_finite())
        .then(|| [x.clamp(0.0, 1.0) as f32, y.clamp(0.0, 1.0) as f32])
}

/// Непрозрачность слоя 0.05..1
fn opacity(value: Option<&Value>) -> Option<f32> {
    let value = value?.as_f64()?;
    value.is_finite().then(|| value.clamp(0.05, 1.0) as f32)
}

/// Масштаб кадра 1..3
fn zoom(value: Option<&Value>) -> Option<f32> {
    let value = value?.as_f64()?;
    value.is_finite().then(|| value.clamp(1.0, 3.0) as f32)
}

/// Относительный путь без `..`, корня и диска — только обычные компоненты
fn is_safe_relative_path(relative: &str) -> bool {
    if relative.is_empty() || relative.chars().count() > MAX_RELATIVE_PATH_CHARS {
        return false;
    }
    Path::new(relative)
        .components()
        .all(|component| matches!(component, Component::Normal(_)))
}

/// Проверяет ассет из манифеста и возвращает его абсолютный путь. Причина отказа идёт в `warnings`.
fn asset(
    value: Option<&Value>,
    field: &str,
    max_bytes: u64,
    ctx: &AssetContext,
    warnings: &mut Vec<String>,
) -> Option<String> {
    let relative = value?.as_str()?;
    match resolve_asset(relative, max_bytes, ctx.root) {
        Ok(path) => Some(path.to_string_lossy().to_string()),
        Err(reason) => {
            warnings.push(format!("{field}: {reason}"));
            None
        }
    }
}

fn resolve_asset(
    relative: &str,
    max_bytes: u64,
    root: &Path,
) -> Result<PathBuf, &'static str> {
    if !is_safe_relative_path(relative) {
        return Err("недопустимый путь");
    }
    let extension = Path::new(relative)
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
        return Err("неподдерживаемый формат");
    }
    // canonicalize раскрывает симлинки — так файл не может указывать за пределы папки
    let path = dunce::canonicalize(root.join(relative))
        .map_err(|_| "файл не найден")?;
    if !path.starts_with(root) {
        return Err("файл вне папки оформления");
    }
    validate_image_file(&path, max_bytes)?;
    Ok(path)
}

/// Файл — обычный, не больше лимита, читается как картинка и не выше допустимого разрешения
fn validate_image_file(path: &Path, max_bytes: u64) -> Result<(), &'static str> {
    let metadata = std::fs::metadata(path).map_err(|_| "файл не читается")?;
    if !metadata.is_file() {
        return Err("это не файл");
    }
    if metadata.len() > max_bytes {
        return Err("файл слишком большой");
    }
    let (width, height) = image::ImageReader::open(path)
        .and_then(|reader| reader.with_guessed_format())
        .map_err(|_| "файл не читается")?
        .into_dimensions()
        .map_err(|_| "не удалось определить размер картинки")?;
    if width == 0 || height == 0 || width > MAX_DIMENSION || height > MAX_DIMENSION {
        return Err("слишком большое разрешение");
    }
    Ok(())
}

/// Общие лимиты папки: число файлов и суммарный размер. Симлинки внутри папки не считаем и не
/// открываем — ассеты всё равно проверяются canonicalize.
fn check_folder_limits(root: &Path) -> Result<(), String> {
    let mut files = 0_usize;
    let mut bytes = 0_u64;
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        let entries = std::fs::read_dir(&dir).map_err(|_| "папка не читается".to_string())?;
        for entry in entries.flatten() {
            let Ok(file_type) = entry.file_type() else {
                continue;
            };
            if file_type.is_symlink() {
                continue;
            }
            if file_type.is_dir() {
                stack.push(entry.path());
            } else if file_type.is_file() {
                files += 1;
                bytes = bytes.saturating_add(entry.metadata().map(|m| m.len()).unwrap_or(0));
                if files > MAX_FOLDER_FILES {
                    return Err(format!("в папке оформления больше {MAX_FOLDER_FILES} файлов"));
                }
                if bytes > MAX_FOLDER_BYTES {
                    return Err("папка оформления слишком большая".to_string());
                }
            }
        }
    }
    Ok(())
}

// ── Запись оформления (редактор, импорт, экспорт) ───────────────────────────
// Работает с тем же форматом, что и чтение выше: манифест правится точечно, а чужие/неизвестные
// поля сохраняются как есть, чтобы редактор не стирал то, что добавила более новая версия лаунчера.

#[derive(Debug, Clone, Copy)]
enum AssetSlot {
    HeaderImage,
    HeaderHover,
    CardImage,
    CardHover,
    PageBanner,
    PageBackground,
    LogoFile,
    HeaderOverlay,
    CardOverlay,
    PageOverlay,
}

impl AssetSlot {
    fn parse(slot: &str) -> Option<Self> {
        Some(match slot {
            "header.image" => Self::HeaderImage,
            "header.hover" => Self::HeaderHover,
            "card.image" => Self::CardImage,
            "card.hover" => Self::CardHover,
            "page.banner" => Self::PageBanner,
            "page.background" => Self::PageBackground,
            "logo.file" => Self::LogoFile,
            "header.overlay" => Self::HeaderOverlay,
            "card.overlay" => Self::CardOverlay,
            "page.overlay" => Self::PageOverlay,
            _ => return None,
        })
    }

    /// (блок манифеста, поле)
    fn location(self) -> (&'static str, &'static str) {
        match self {
            Self::HeaderImage => ("header", "image"),
            Self::HeaderHover => ("header", "hover"),
            Self::CardImage => ("card", "image"),
            Self::CardHover => ("card", "hover"),
            Self::PageBanner => ("page", "banner"),
            Self::PageBackground => ("page", "background"),
            Self::LogoFile => ("logo", "file"),
            Self::HeaderOverlay => ("header", "overlay"),
            Self::CardOverlay => ("card", "overlay"),
            Self::PageOverlay => ("page", "overlay"),
        }
    }

    fn file_stem(self) -> String {
        let (block, field) = self.location();
        format!("{block}-{field}")
    }

    fn max_bytes(self) -> u64 {
        match self {
            Self::HeaderImage | Self::CardImage => MAX_STILL_BYTES,
            _ => MAX_ANIMATED_BYTES,
        }
    }
}

fn input_error(message: impl Into<String>) -> crate::Error {
    crate::ErrorKind::InputError(message.into()).into()
}

/// Манифест для правки: существующий объект или новый с `schema`
fn load_manifest_for_edit(root: &Path) -> Map<String, Value> {
    let path = root.join(MANIFEST_FILE);
    let existing = std::fs::metadata(&path)
        .ok()
        .filter(|meta| meta.is_file() && meta.len() <= MAX_MANIFEST_BYTES)
        .and_then(|_| std::fs::read(&path).ok())
        .and_then(|bytes| serde_json::from_slice::<Value>(&bytes).ok())
        .and_then(|value| match value {
            Value::Object(map) => Some(map),
            _ => None,
        });
    let mut manifest = existing.unwrap_or_default();
    manifest
        .entry("schema")
        .or_insert_with(|| Value::from(SUPPORTED_SCHEMA));
    manifest
}

/// Пишет манифест через временный файл, чтобы оборванная запись не оставила битый JSON
fn write_manifest(
    root: &Path,
    mut manifest: Map<String, Value>,
) -> crate::Result<()> {
    // пустые блоки не храним
    manifest.retain(|_, value| value.as_object().is_none_or(|block| !block.is_empty()));
    std::fs::create_dir_all(root)?;
    let path = root.join(MANIFEST_FILE);
    let temp = root.join(format!("{MANIFEST_FILE}.tmp"));
    std::fs::write(&temp, serde_json::to_vec_pretty(&manifest)?)?;
    std::fs::rename(&temp, &path)?;
    Ok(())
}

fn block_mut<'a>(
    manifest: &'a mut Map<String, Value>,
    name: &str,
) -> &'a mut Map<String, Value> {
    let entry = manifest
        .entry(name.to_string())
        .or_insert_with(|| Value::Object(Map::new()));
    if !entry.is_object() {
        *entry = Value::Object(Map::new());
    }
    entry.as_object_mut().expect("just made an object")
}

/// Удаляет старый файл ассета, если он лежит внутри `modlex/`
fn remove_managed_file(root: &Path, relative: &str) {
    if !is_safe_relative_path(relative) {
        return;
    }
    let path = root.join(relative);
    let Ok(canonical) = dunce::canonicalize(&path) else {
        return;
    };
    if canonical.starts_with(root) && canonical.is_file() {
        let _ = std::fs::remove_file(canonical);
    }
}

fn write_asset(
    instance_dir: &Path,
    slot: AssetSlot,
    source: Option<&Path>,
) -> crate::Result<Option<InstanceCustomization>> {
    let root = instance_dir.join(CUSTOMIZATION_DIR);
    // очищать нечего — не создаём пустую папку оформления
    if source.is_none() && !root.is_dir() {
        return Ok(None);
    }
    let (block_name, field) = slot.location();
    let mut manifest = load_manifest_for_edit(&root);
    let old = manifest
        .get(block_name)
        .and_then(Value::as_object)
        .and_then(|block| block.get(field))
        .and_then(Value::as_str)
        .map(str::to_string);

    let mut new_name = None;
    if let Some(source) = source {
        let extension = source
            .extension()
            .and_then(|ext| ext.to_str())
            .map(str::to_ascii_lowercase)
            .unwrap_or_default();
        if !IMAGE_EXTENSIONS.contains(&extension.as_str()) {
            return Err(input_error("Неподдерживаемый формат файла"));
        }
        validate_image_file(source, slot.max_bytes()).map_err(input_error)?;

        std::fs::create_dir_all(&root)?;
        let root_canonical = dunce::canonicalize(&root)?;
        let file_name = format!("{}.{extension}", slot.file_stem());
        let target = root_canonical.join(&file_name);
        // выбрали файл, который и так лежит в папке оформления — копировать не надо
        let same_file = dunce::canonicalize(source).is_ok_and(|s| s == target);
        if !same_file {
            let temp = root_canonical.join(format!("{file_name}.tmp"));
            std::fs::copy(source, &temp)?;
            std::fs::rename(&temp, &target)?;
        }
        block_mut(&mut manifest, block_name).insert(field.to_string(), Value::from(file_name.clone()));
        new_name = Some(file_name);
    } else if let Some(block) = manifest.get_mut(block_name).and_then(Value::as_object_mut) {
        block.remove(field);
    }

    if let Some(old) = old
        && new_name.as_deref() != Some(old.as_str())
        && let Ok(root_canonical) = dunce::canonicalize(&root)
    {
        remove_managed_file(&root_canonical, &old);
    }

    write_manifest(&root, manifest)?;
    Ok(read_customization(instance_dir))
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct FaceOptions {
    pub animate: Option<AnimateMode>,
    pub focus: Option<[f32; 2]>,
    pub zoom: Option<f32>,
    pub accent: Option<String>,
    pub overlay_focus: Option<[f32; 2]>,
    pub overlay_zoom: Option<f32>,
    pub overlay_opacity: Option<f32>,
}

#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct PageOptions {
    pub animate: Option<AnimateMode>,
    pub accent: Option<String>,
    pub banner_focus: Option<[f32; 2]>,
    pub banner_zoom: Option<f32>,
    pub background_focus: Option<[f32; 2]>,
    pub background_zoom: Option<f32>,
    pub overlay_focus: Option<[f32; 2]>,
    pub overlay_zoom: Option<f32>,
    pub overlay_opacity: Option<f32>,
}

/// Настройки оформления без файлов. Редактор шлёт состояние целиком: `None` — «убрать поле».
#[derive(Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct CustomizationOptions {
    pub author: Option<String>,
    pub header: FaceOptions,
    pub card: FaceOptions,
    pub page: PageOptions,
}

fn set_or_remove(block: &mut Map<String, Value>, key: &str, value: Option<Value>) {
    match value {
        Some(value) => {
            block.insert(key.to_string(), value);
        }
        None => {
            block.remove(key);
        }
    }
}

fn checked_accent(accent: &Option<String>) -> crate::Result<Option<Value>> {
    match accent {
        None => Ok(None),
        Some(text) => color(Some(&Value::from(text.as_str())))
            .map(|hex| Some(Value::from(hex)))
            .ok_or_else(|| input_error("Цвет должен быть в формате #rrggbb")),
    }
}

fn checked_opacity(opacity: Option<f32>) -> crate::Result<Option<Value>> {
    match opacity {
        None => Ok(None),
        Some(value) if value.is_finite() => {
            Ok(Some(serde_json::json!(value.clamp(0.05, 1.0))))
        }
        Some(_) => Err(input_error("Некорректная непрозрачность")),
    }
}

fn animate_value(mode: Option<AnimateMode>) -> Option<Value> {
    mode.and_then(|mode| serde_json::to_value(mode).ok())
}

fn checked_focus(focus: Option<[f32; 2]>) -> crate::Result<Option<Value>> {
    match focus {
        None => Ok(None),
        Some([x, y]) if x.is_finite() && y.is_finite() => Ok(Some(serde_json::json!([
            x.clamp(0.0, 1.0),
            y.clamp(0.0, 1.0)
        ]))),
        Some(_) => Err(input_error("Некорректная точка фокуса")),
    }
}

fn checked_zoom(zoom: Option<f32>) -> crate::Result<Option<Value>> {
    match zoom {
        None => Ok(None),
        Some(value) if value.is_finite() => {
            Ok(Some(serde_json::json!(value.clamp(1.0, 3.0))))
        }
        Some(_) => Err(input_error("Некорректный масштаб")),
    }
}

fn apply_face_options(
    manifest: &mut Map<String, Value>,
    name: &str,
    options: &FaceOptions,
) -> crate::Result<()> {
    let accent = checked_accent(&options.accent)?;
    let focus = checked_focus(options.focus)?;
    let zoom = checked_zoom(options.zoom)?;
    let overlay_focus = checked_focus(options.overlay_focus)?;
    let overlay_zoom = checked_zoom(options.overlay_zoom)?;
    let overlay_opacity = checked_opacity(options.overlay_opacity)?;
    let block = block_mut(manifest, name);
    set_or_remove(block, "animate", animate_value(options.animate));
    set_or_remove(block, "focus", focus);
    set_or_remove(block, "zoom", zoom);
    set_or_remove(block, "accent", accent);
    set_or_remove(block, "overlayFocus", overlay_focus);
    set_or_remove(block, "overlayZoom", overlay_zoom);
    set_or_remove(block, "overlayOpacity", overlay_opacity);
    Ok(())
}

fn write_options(
    instance_dir: &Path,
    options: &CustomizationOptions,
) -> crate::Result<Option<InstanceCustomization>> {
    let root = instance_dir.join(CUSTOMIZATION_DIR);
    let mut manifest = load_manifest_for_edit(&root);

    // сначала всё проверяем, потом меняем — при ошибке манифест остаётся прежним
    let author = match &options.author {
        None => None,
        Some(text_value) => text(Some(&Value::from(text_value.as_str()))).map(Value::from),
    };
    apply_face_options(&mut manifest, "header", &options.header)?;
    apply_face_options(&mut manifest, "card", &options.card)?;
    let page_accent = checked_accent(&options.page.accent)?;
    let banner_focus = checked_focus(options.page.banner_focus)?;
    let banner_zoom = checked_zoom(options.page.banner_zoom)?;
    let background_focus = checked_focus(options.page.background_focus)?;
    let background_zoom = checked_zoom(options.page.background_zoom)?;
    let page_overlay_focus = checked_focus(options.page.overlay_focus)?;
    let page_overlay_zoom = checked_zoom(options.page.overlay_zoom)?;
    let page_overlay_opacity = checked_opacity(options.page.overlay_opacity)?;
    let page_block = block_mut(&mut manifest, "page");
    set_or_remove(page_block, "animate", animate_value(options.page.animate));
    set_or_remove(page_block, "accent", page_accent);
    set_or_remove(page_block, "bannerFocus", banner_focus);
    set_or_remove(page_block, "bannerZoom", banner_zoom);
    set_or_remove(page_block, "backgroundFocus", background_focus);
    set_or_remove(page_block, "backgroundZoom", background_zoom);
    set_or_remove(page_block, "overlayFocus", page_overlay_focus);
    set_or_remove(page_block, "overlayZoom", page_overlay_zoom);
    set_or_remove(page_block, "overlayOpacity", page_overlay_opacity);
    set_or_remove(&mut manifest, "author", author);

    write_manifest(&root, manifest)?;
    Ok(read_customization(instance_dir))
}

/// Удаляет только саму папку `modlex/` инстанса (симлинк вместо папки не трогаем)
fn clear_folder(instance_dir: &Path) -> crate::Result<()> {
    let root = instance_dir.join(CUSTOMIZATION_DIR);
    match std::fs::symlink_metadata(&root) {
        Ok(meta) if meta.is_dir() && !meta.file_type().is_symlink() => {
            std::fs::remove_dir_all(&root)?;
        }
        Ok(_) => return Err(input_error("modlex — не папка оформления")),
        Err(_) => {}
    }
    Ok(())
}

fn collect_files(root: &Path) -> crate::Result<Vec<(PathBuf, String)>> {
    let mut result = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        for entry in std::fs::read_dir(&dir)?.flatten() {
            let file_type = entry.file_type()?;
            if file_type.is_symlink() {
                continue;
            }
            let path = entry.path();
            if file_type.is_dir() {
                stack.push(path);
            } else if file_type.is_file() {
                let relative = path
                    .strip_prefix(root)?
                    .components()
                    .map(|c| c.as_os_str().to_string_lossy().to_string())
                    .collect::<Vec<_>>()
                    .join("/");
                result.push((path, relative));
            }
        }
    }
    Ok(result)
}

fn export_zip(instance_dir: &Path, destination: &Path) -> crate::Result<()> {
    let root = dunce::canonicalize(instance_dir.join(CUSTOMIZATION_DIR))
        .map_err(|_| input_error("У инстанса нет оформления"))?;
    if !root.join(MANIFEST_FILE).is_file() {
        return Err(input_error("У инстанса нет оформления"));
    }
    check_folder_limits(&root).map_err(input_error)?;

    let file = std::fs::File::create(destination)?;
    let mut writer = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    for (path, relative) in collect_files(&root)? {
        // временные файлы записи в архив не попадают
        if relative.ends_with(".tmp") {
            continue;
        }
        writer
            .start_file(relative, options)
            .map_err(std::io::Error::from)?;
        std::io::copy(&mut std::fs::File::open(&path)?, &mut writer)?;
    }
    writer.finish().map_err(std::io::Error::from)?;
    Ok(())
}

const IMPORT_STAGING_DIR: &str = ".modlex-import";

fn import_zip(
    instance_dir: &Path,
    source: &Path,
) -> crate::Result<Option<InstanceCustomization>> {
    let staging_parent = instance_dir.join(IMPORT_STAGING_DIR);
    let staging_root = staging_parent.join(CUSTOMIZATION_DIR);
    let _ = std::fs::remove_dir_all(&staging_parent);

    let result = (|| -> crate::Result<()> {
        let file = std::fs::File::open(source)?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|_| input_error("Файл не является архивом оформления"))?;
        if archive.len() > MAX_FOLDER_FILES {
            return Err(input_error("В архиве слишком много файлов"));
        }

        // архив можно упаковать и вместе с папкой modlex/ — срезаем общий префикс
        let names: Vec<Option<PathBuf>> = (0..archive.len())
            .map(|index| {
                archive
                    .by_index_raw(index)
                    .ok()
                    .and_then(|entry| entry.enclosed_name())
            })
            .collect();
        let strip_prefix = names
            .iter()
            .flatten()
            .all(|name| name.starts_with(CUSTOMIZATION_DIR));

        std::fs::create_dir_all(&staging_root)?;
        let mut total = 0_u64;
        for index in 0..archive.len() {
            let mut entry = archive.by_index(index).map_err(std::io::Error::from)?;
            if entry.is_dir() {
                continue;
            }
            let Some(name) = entry.enclosed_name() else {
                return Err(input_error("В архиве недопустимый путь"));
            };
            let relative = if strip_prefix {
                name.strip_prefix(CUSTOMIZATION_DIR).map(Path::to_path_buf).unwrap_or(name)
            } else {
                name
            };
            let relative_text = relative.to_string_lossy().replace('\\', "/");
            let extension = relative
                .extension()
                .and_then(|ext| ext.to_str())
                .map(str::to_ascii_lowercase)
                .unwrap_or_default();
            let allowed = relative_text == MANIFEST_FILE
                || IMAGE_EXTENSIONS.contains(&extension.as_str());
            if !allowed || !is_safe_relative_path(&relative_text) {
                // лишние файлы (скрипты, exe и т.п.) просто не распаковываем
                continue;
            }
            let target = staging_root.join(&relative);
            if let Some(parent) = target.parent() {
                std::fs::create_dir_all(parent)?;
            }
            // заявленный в архиве размер может врать — ограничиваем реальное чтение
            let remaining = MAX_FOLDER_BYTES.saturating_sub(total);
            let mut limited = std::io::Read::take(&mut entry, remaining + 1);
            let mut output = std::fs::File::create(&target)?;
            let written = std::io::copy(&mut limited, &mut output)?;
            total += written;
            if total > MAX_FOLDER_BYTES {
                return Err(input_error("Архив оформления слишком большой"));
            }
        }

        if read_customization(&staging_parent).is_none() {
            return Err(input_error("В архиве нет корректного оформления"));
        }

        clear_folder(instance_dir)?;
        std::fs::rename(&staging_root, instance_dir.join(CUSTOMIZATION_DIR))?;
        Ok(())
    })();

    let _ = std::fs::remove_dir_all(&staging_parent);
    result?;
    Ok(read_customization(instance_dir))
}

/// Кладёт (или убирает, если `source` не задан) картинку в слот оформления
pub async fn set_customization_asset(
    instance_id: &str,
    slot: &str,
    source: Option<&Path>,
) -> crate::Result<Option<InstanceCustomization>> {
    let slot = AssetSlot::parse(slot)
        .ok_or_else(|| input_error("Неизвестный слот оформления"))?;
    let dir = instance_dir(instance_id).await?;
    let source = source.map(Path::to_path_buf);
    tokio::task::spawn_blocking(move || write_asset(&dir, slot, source.as_deref())).await?
}

pub async fn set_customization_options(
    instance_id: &str,
    options: CustomizationOptions,
) -> crate::Result<Option<InstanceCustomization>> {
    let dir = instance_dir(instance_id).await?;
    tokio::task::spawn_blocking(move || write_options(&dir, &options)).await?
}

pub async fn clear_customization(instance_id: &str) -> crate::Result<()> {
    let dir = instance_dir(instance_id).await?;
    tokio::task::spawn_blocking(move || clear_folder(&dir)).await?
}

/// Упаковывает оформление в архив — переносить между инстансами или делиться
pub async fn export_customization(
    instance_id: &str,
    destination: &Path,
) -> crate::Result<()> {
    if let Err(error) = sync_icon(instance_id).await {
        tracing::warn!(instance_id, error = %error, "Failed to add instance icon to customization export");
    }
    let dir = instance_dir(instance_id).await?;
    let destination = destination.to_path_buf();
    tokio::task::spawn_blocking(move || export_zip(&dir, &destination)).await?
}

/// Заменяет оформление инстанса содержимым архива (проверенным)
pub async fn import_customization(
    instance_id: &str,
    source: &Path,
) -> crate::Result<Option<InstanceCustomization>> {
    let dir = instance_dir(instance_id).await?;
    let source = source.to_path_buf();
    let result =
        tokio::task::spawn_blocking(move || import_zip(&dir, &source)).await??;
    // человек сам выбрал этот архив — иконка из него заменяет текущую
    if let Err(error) = apply_customization_icon(instance_id, true).await {
        tracing::warn!(instance_id, error = %error, "Failed to apply icon from imported customization");
    }
    Ok(result)
}

// ── Иконка инстанса едет вместе с оформлением ───────────────────────────────
// При экспорте готовая иконка кладётся в `modlex/icon.<расширение>`, а в манифесте появляется
// `"icon": { "file": "icon.png", "config": { ... } }` (config — id фона и символа, если иконка
// сгенерирована в редакторе). При импорте иконка применяется к новому инстансу.

fn write_icon_block(
    instance_dir: &Path,
    icon_path: &str,
    config: Option<&InstanceIconConfig>,
) -> crate::Result<()> {
    // иконка, взятая с сайта, у другого лаунчера подтянется сама — файла у нас нет
    if icon_path.starts_with("http://") || icon_path.starts_with("https://") {
        return Ok(());
    }
    let source = PathBuf::from(icon_path);
    validate_image_file(&source, MAX_ICON_BYTES).map_err(input_error)?;
    let extension = source
        .extension()
        .and_then(|ext| ext.to_str())
        .map(str::to_ascii_lowercase)
        .filter(|ext| IMAGE_EXTENSIONS.contains(&ext.as_str()))
        .unwrap_or_else(|| "png".to_string());

    let root = instance_dir.join(CUSTOMIZATION_DIR);
    std::fs::create_dir_all(&root)?;
    let file_name = format!("{ICON_FILE_STEM}.{extension}");
    let target = root.join(&file_name);
    let already_there = match (dunce::canonicalize(&source), dunce::canonicalize(&target)) {
        (Ok(a), Ok(b)) => a == b,
        _ => false,
    };
    if !already_there {
        let temp = root.join(format!("{file_name}.tmp"));
        std::fs::copy(&source, &temp)?;
        std::fs::rename(&temp, &target)?;
    }

    let mut manifest = load_manifest_for_edit(&root);
    let mut icon = Map::new();
    icon.insert("file".to_string(), Value::from(file_name));
    if let Some(config) = config {
        icon.insert("config".to_string(), serde_json::to_value(config)?);
    }
    manifest.insert("icon".to_string(), Value::Object(icon));
    write_manifest(&root, manifest)
}

/// Кладёт иконку инстанса в его `modlex/`, чтобы она попала в экспорт
pub(crate) async fn sync_icon(instance_id: &str) -> crate::Result<()> {
    let Some(metadata) = super::get::get(instance_id).await? else {
        return Ok(());
    };
    let Some(icon_path) = metadata.instance.icon_path.clone() else {
        return Ok(());
    };
    let dir = instance_dir(instance_id).await?;
    let config = metadata.icon_config.clone();
    tokio::task::spawn_blocking(move || {
        write_icon_block(&dir, &icon_path, config.as_ref())
    })
    .await?
}

fn read_icon_block(
    instance_dir: &Path,
) -> Option<(PathBuf, Option<InstanceIconConfig>)> {
    let root = dunce::canonicalize(instance_dir.join(CUSTOMIZATION_DIR)).ok()?;
    let manifest = load_manifest_for_edit(&root);
    let icon = manifest.get("icon")?.as_object()?;
    let path = resolve_asset(icon.get("file")?.as_str()?, MAX_ICON_BYTES, &root).ok()?;
    let config = icon
        .get("config")
        .and_then(|value| serde_json::from_value::<InstanceIconConfig>(value.clone()).ok())
        .filter(|config| super::icon::validate_generated_icon_config(config).is_ok());
    Some((path, config))
}

/// Применяет иконку из оформления к инстансу. Без `force` — только если у инстанса ещё стандартная
/// иконка (свою не затираем). `true` — иконка применена.
pub async fn apply_customization_icon(
    instance_id: &str,
    force: bool,
) -> crate::Result<bool> {
    let Some(metadata) = super::get::get(instance_id).await? else {
        return Ok(false);
    };
    if !force && metadata.instance.icon_path.is_some() {
        return Ok(false);
    }
    let dir = instance_dir(instance_id).await?;
    let found = tokio::task::spawn_blocking(move || read_icon_block(&dir)).await?;
    let Some((path, config)) = found else {
        return Ok(false);
    };
    super::icon::edit_icon_with_config(instance_id, &path, config).await?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;

    struct TempDir(PathBuf);
    impl TempDir {
        fn new(label: &str) -> Self {
            let unique = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos();
            let dir = std::env::temp_dir()
                .join(format!("modlex-customization-{label}-{unique}"));
            std::fs::create_dir_all(dir.join(CUSTOMIZATION_DIR)).unwrap();
            Self(dir)
        }
        fn modlex(&self) -> PathBuf {
            self.0.join(CUSTOMIZATION_DIR)
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }

    fn write_png(path: &Path, width: u32, height: u32) {
        image::RgbaImage::new(width, height).save(path).unwrap();
    }

    #[test]
    fn rejects_unsafe_paths() {
        for bad in ["", "../x.png", "/etc/x.png", "a/../../x.png", "C:\\x.png"] {
            assert!(!is_safe_relative_path(bad), "{bad}");
        }
        assert!(is_safe_relative_path("header.webp"));
        assert!(is_safe_relative_path("sub/header.webp"));
    }

    #[test]
    fn validates_colors_and_focus() {
        assert_eq!(color(Some(&Value::from("#7DD3FC"))), Some("#7dd3fc".into()));
        assert_eq!(color(Some(&Value::from("red"))), None);
        assert_eq!(color(Some(&Value::from("#12345"))), None);
        assert_eq!(
            focus(Some(&serde_json::json!([2.0, -1.0]))),
            Some([1.0, 0.0])
        );
        assert_eq!(focus(Some(&serde_json::json!([0.5]))), None);
    }

    #[test]
    fn missing_manifest_or_unknown_schema_means_no_customization() {
        let dir = TempDir::new("schema");
        assert!(read_customization(&dir.0).is_none());
        std::fs::write(dir.modlex().join(MANIFEST_FILE), r#"{"schema": 99}"#).unwrap();
        assert!(read_customization(&dir.0).is_none());
    }

    #[test]
    fn applies_valid_blocks_and_drops_bad_ones() {
        let dir = TempDir::new("blocks");
        write_png(&dir.modlex().join("header.png"), 4, 2);
        write_png(&dir.modlex().join("huge.png"), 5000, 2);
        std::fs::write(
            dir.modlex().join(MANIFEST_FILE),
            r##"{
                "schema": 1,
                "author": "Команда",
                "header": {"image": "header.png", "animate": "never", "accent": "#7dd3fc"},
                "card": {"image": "../escape.png"},
                "page": {"banner": "huge.png"},
                "future": {"anything": true}
            }"##,
        )
        .unwrap();
        let result = read_customization(&dir.0).unwrap();
        assert_eq!(result.author.as_deref(), Some("Команда"));
        let header = result.header.unwrap();
        assert!(header.image.unwrap().ends_with("header.png"));
        assert_eq!(header.animate, AnimateMode::Never);
        assert_eq!(header.accent.as_deref(), Some("#7dd3fc"));
        assert!(result.card.is_none());
        assert!(result.page.is_none());
        assert_eq!(result.warnings.len(), 2);
    }

    #[test]
    fn too_many_files_drops_everything() {
        let dir = TempDir::new("limit");
        std::fs::write(dir.modlex().join(MANIFEST_FILE), r#"{"schema": 1}"#).unwrap();
        for index in 0..=MAX_FOLDER_FILES {
            std::fs::write(dir.modlex().join(format!("f{index}.txt")), b"x").unwrap();
        }
        let result = read_customization(&dir.0).unwrap();
        assert!(result.header.is_none());
        assert_eq!(result.warnings.len(), 1);
    }
}
