// ModLEX: глобальный фон лаунчера (Home/Library) — shared-ref модуль, а не
// component-local state (см. workflow_shared_account_state в памяти сессии):
// и Settings-вкладка (пишет), и App.vue (рендерит слой фона) должны видеть
// одно и то же состояние сразу, без ручной синхронизации между разными
// смонтированными компонентами.
import { computed, ref } from 'vue'

import { get as getSettings, set as setSettings } from '@/helpers/settings'

export const globalBackgroundPath = ref<string | null>(null)
export const globalBackgroundOpacity = ref(0.5)
export const globalBackgroundBlurPx = ref(0)
export const globalBackgroundAnimated = ref(true)

// Отрезок видео и кадр для паузы. Хранятся в localStorage и привязаны к файлу: при смене
// файла сбрасываются (а не в Rust-настройках — новые поля потребовали бы миграцию БД).
const RANGE_STORAGE_KEY = 'modlex_bg_video_range'
/** Начало отрезка, с */
export const globalBackgroundTrimStart = ref(0)
/** Конец отрезка, с; 0 — до конца файла */
export const globalBackgroundTrimEnd = ref(0)
/** Кадр для паузы, с; -1 — авто (начало отрезка) */
export const globalBackgroundFreezeAt = ref(-1)

function loadBackgroundRange(path: string | null) {
	let range: { path?: string; start?: number; end?: number; freeze?: number } = {}
	try {
		range = JSON.parse(localStorage.getItem(RANGE_STORAGE_KEY) ?? '{}')
	} catch {
		// битое значение — берём значения по умолчанию
	}
	const valid = !!path && range.path === path
	const num = (value: unknown, fallback: number) =>
		typeof value === 'number' && Number.isFinite(value) ? value : fallback
	globalBackgroundTrimStart.value = valid ? Math.max(0, num(range.start, 0)) : 0
	globalBackgroundTrimEnd.value = valid ? Math.max(0, num(range.end, 0)) : 0
	globalBackgroundFreezeAt.value = valid ? num(range.freeze, -1) : -1
}

export function persistBackgroundRange(patch: { start?: number; end?: number; freeze?: number }) {
	if (patch.start !== undefined) globalBackgroundTrimStart.value = patch.start
	if (patch.end !== undefined) globalBackgroundTrimEnd.value = patch.end
	if (patch.freeze !== undefined) globalBackgroundFreezeAt.value = patch.freeze
	try {
		localStorage.setItem(
			RANGE_STORAGE_KEY,
			JSON.stringify({
				path: globalBackgroundPath.value,
				start: globalBackgroundTrimStart.value,
				end: globalBackgroundTrimEnd.value,
				freeze: globalBackgroundFreezeAt.value,
			}),
		)
	} catch {
		// localStorage недоступен — отрезок не переживёт перезапуск
	}
}

// Громкость звука обоев (видео; HTML-обои получают значение в сообщении state). Общая для всех файлов.
const VOLUME_STORAGE_KEY = 'modlex_bg_volume'
function readVolume() {
	try {
		const raw = localStorage.getItem(VOLUME_STORAGE_KEY)
		const value = raw === null ? NaN : Number(raw)
		return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.3
	} catch {
		return 0.3
	}
}
export const globalBackgroundVolume = ref(readVolume())
export function persistBackgroundVolume(value: number) {
	globalBackgroundVolume.value = Math.min(1, Math.max(0, value))
	try {
		localStorage.setItem(VOLUME_STORAGE_KEY, String(globalBackgroundVolume.value))
	} catch {
		// localStorage недоступен — громкость не переживёт перезапуск
	}
}

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'mkv'])
const HTML_EXTENSIONS = new Set(['html', 'htm'])

export const globalBackgroundIsVideo = computed(() => {
	const path = globalBackgroundPath.value
	if (!path) return false
	const ext = path.split('.').pop()?.toLowerCase() ?? ''
	return VIDEO_EXTENSIONS.has(ext)
})

export const globalBackgroundIsGif = computed(() => {
	const path = globalBackgroundPath.value
	if (!path) return false
	return (path.split('.').pop()?.toLowerCase() ?? '') === 'gif'
})

// HTML-обои (Lively-стиль): один самодостаточный .html, рисуется в sandbox-iframe.
export const globalBackgroundIsHtml = computed(() => {
	const path = globalBackgroundPath.value
	if (!path) return false
	return HTML_EXTENSIONS.has(path.split('.').pop()?.toLowerCase() ?? '')
})

export const globalBackgroundIsAnimated = computed(
	() => globalBackgroundIsVideo.value || globalBackgroundIsGif.value || globalBackgroundIsHtml.value,
)

export async function refreshGlobalBackground() {
	const settings = await getSettings()
	globalBackgroundPath.value = settings.modlex_global_background_path ?? null
	globalBackgroundOpacity.value = settings.modlex_global_background_opacity ?? 0.5
	globalBackgroundBlurPx.value = settings.modlex_global_background_blur_px ?? 0
	globalBackgroundAnimated.value = settings.modlex_global_background_animated ?? true
	loadBackgroundRange(globalBackgroundPath.value)
}

export async function persistGlobalBackground(patch: {
	path?: string | null
	opacity?: number
	blurPx?: number
	animated?: boolean
}) {
	if (patch.path !== undefined) {
		globalBackgroundPath.value = patch.path
		persistBackgroundRange({ start: 0, end: 0, freeze: -1 })
	}
	if (patch.opacity !== undefined) globalBackgroundOpacity.value = patch.opacity
	if (patch.blurPx !== undefined) globalBackgroundBlurPx.value = patch.blurPx
	if (patch.animated !== undefined) globalBackgroundAnimated.value = patch.animated

	const settings = await getSettings()
	settings.modlex_global_background_path = globalBackgroundPath.value
	settings.modlex_global_background_opacity = globalBackgroundOpacity.value
	settings.modlex_global_background_blur_px = globalBackgroundBlurPx.value
	settings.modlex_global_background_animated = globalBackgroundAnimated.value
	await setSettings(settings)
}
