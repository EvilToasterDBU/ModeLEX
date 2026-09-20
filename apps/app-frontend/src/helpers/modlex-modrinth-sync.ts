import { get_default_launcher_path, get_importable_instances, import_instance } from '@/helpers/import.js'
import { list } from '@/helpers/instance'

// Синхронизация с настоящим Modrinth App: находим его инстансы и переносим в ModLEX. Повторная
// синхронизация не создаёт дубликатов — то, что уже есть в библиотеке, пропускается.

const LAUNCHER = 'ModrinthApp'

export interface ModrinthDetection {
	path: string
	/** все инстансы Modrinth App */
	instances: string[]
	/** ещё не перенесённые в ModLEX */
	fresh: string[]
}

/** Ищет установленный Modrinth App и его инстансы; `null` — не найден или пуст */
export async function detectModrinthApp(): Promise<ModrinthDetection | null> {
	const path = (await get_default_launcher_path(LAUNCHER).catch(() => null)) as string | null
	if (!path) return null
	const all = ((await get_importable_instances(LAUNCHER, path).catch(() => [])) ?? []) as string[]
	if (all.length === 0) return null

	const existing = new Set(
		((await list().catch(() => [])) ?? []).map((instance: { name: string }) =>
			instance.name.toLowerCase(),
		),
	)
	// перенос идёт фоном: пока он не закончился, инстанс уже есть в библиотеке, а если упал — его
	// там нет, и следующая синхронизация предложит его снова
	const unique = [...new Set(all)]
	const fresh = unique.filter((name) => !existing.has(name.toLowerCase()))
	return { path, instances: unique, fresh }
}

export interface ModrinthSyncResult {
	imported: string[]
	failed: string[]
}

/** Переносит инстансы по очереди; ошибка одного не останавливает остальные */
export async function importModrinthInstances(
	path: string,
	names: string[],
	onProgress?: (done: number, total: number, name: string) => void,
): Promise<ModrinthSyncResult> {
	const result: ModrinthSyncResult = { imported: [], failed: [] }
	for (const [index, name] of names.entries()) {
		onProgress?.(index, names.length, name)
		try {
			await import_instance(LAUNCHER, path, name)
			result.imported.push(name)
		} catch {
			result.failed.push(name)
		}
	}
	onProgress?.(names.length, names.length, '')
	return result
}
