import { convertFileSrc } from '@tauri-apps/api/core'
import { computed, type MaybeRefOrGetter, reactive, toValue, watch } from 'vue'

import { useFeatureFlag } from '@/helpers/feature-flags'
import { get_customization, type InstanceCustomization } from '@/helpers/instance'
import {
	modlexInstanceAnimations,
	modlexInstanceCustomizationMode,
} from '@/helpers/modlex-settings'

// Оформление инстансов от авторов сборок (docs/CUSTOMIZATION_SPEC.md). Общий кэш на приложение:
// карточка в библиотеке, полоска на главной и страница инстанса читают одно и то же, а после
// правки в настройках инстанса все места обновляются сразу.

interface CacheEntry {
	value: InstanceCustomization | null
	loadedAt: number
	/** Растёт при каждой правке — подмешивается в URL, чтобы webview не держал старую картинку */
	revision: number
}

const STALE_AFTER_MS = 30_000
const entries = reactive(new Map<string, CacheEntry>())
const inflight = new Set<string>()
// пока шло чтение, пришёл запрос на обновление (файлы могли появиться позже) — перечитать сразу после
const reloadAfter = new Set<string>()

async function load(instanceId: string) {
	if (inflight.has(instanceId)) return
	inflight.add(instanceId)
	try {
		const value = await get_customization(instanceId)
		const previous = entries.get(instanceId)
		const changed = JSON.stringify(previous?.value ?? null) !== JSON.stringify(value)
		entries.set(instanceId, {
			value,
			loadedAt: Date.now(),
			revision: (previous?.revision ?? 0) + (changed ? 1 : 0),
		})
	} catch {
		// не читается — рисуем без оформления, но не долбим бэкенд на каждый рендер
		const previous = entries.get(instanceId)
		entries.set(instanceId, {
			value: previous?.value ?? null,
			loadedAt: Date.now(),
			revision: previous?.revision ?? 0,
		})
	} finally {
		inflight.delete(instanceId)
		if (reloadAfter.delete(instanceId)) void load(instanceId)
	}
}

/** Принудительно перечитать оформление с диска — например, когда установка сборки закончила
 * распаковку папки `modlex/`, а карточка уже успела запомнить «оформления нет». */
export function refreshInstanceCustomization(instanceId: string) {
	if (inflight.has(instanceId)) reloadAfter.add(instanceId)
	else void load(instanceId)
}

/** Есть ли уже запись в кэше (кто-то показывает этот инстанс) */
export function hasInstanceCustomizationEntry(instanceId: string): boolean {
	return entries.has(instanceId)
}

function ensureLoaded(instanceId: string) {
	const entry = entries.get(instanceId)
	if (!entry || Date.now() - entry.loadedAt > STALE_AFTER_MS) void load(instanceId)
}

/** Вкладка «Оформление» сообщает свежее состояние — остальные места обновляются сразу */
export function setInstanceCustomization(
	instanceId: string,
	value: InstanceCustomization | null,
) {
	entries.set(instanceId, {
		value,
		loadedAt: Date.now(),
		revision: (entries.get(instanceId)?.revision ?? 0) + 1,
	})
}

/** gif/apng/webp могут быть анимированными: их нужно уметь замораживать */
export function isPossiblyAnimated(pathOrUrl: string): boolean {
	return /\.(gif|apng|webp)(\?|$)/i.test(pathOrUrl)
}

/** `force` — предпросмотр в редакторе: показывает оформление независимо от пользовательских настроек */
export function useInstanceCustomization(
	instanceId: MaybeRefOrGetter<string | undefined>,
	options?: { force?: boolean },
) {
	const { enabled } = useFeatureFlag('instance_customization')
	const force = !!options?.force
	const active = computed(
		() => force || (enabled.value && modlexInstanceCustomizationMode.value !== 'off'),
	)

	watch(
		[() => toValue(instanceId), active],
		([id, isActive]) => {
			if (id && isActive) ensureLoaded(id)
		},
		{ immediate: true },
	)

	const entry = computed(() => {
		const id = toValue(instanceId)
		return id ? entries.get(id) : undefined
	})
	const customization = computed(() => (active.value ? (entry.value?.value ?? null) : null))
	/** Можно ли проигрывать анимации: режим «всё» и включённый тумблер анимаций */
	const animations = computed(
		() =>
			force ||
			(modlexInstanceCustomizationMode.value === 'all' && modlexInstanceAnimations.value),
	)

	function src(path: string | null | undefined): string | null {
		return path ? `${convertFileSrc(path)}?v=${entry.value?.revision ?? 0}` : null
	}

	return { customization, animations, src }
}
