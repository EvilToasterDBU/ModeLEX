// apps/app-frontend/src/helpers/modlex-settings.ts

import { computed, ref, watch } from 'vue'

import { useFeatureFlag } from './feature-flags'

const STORAGE_KEYS = {
	hideServers: 'modlex_hide_servers',
	newsSource: 'modlex_news_source',
	enableModrinth: 'modlex_enable_modrinth',
	enableCurseForge: 'modlex_enable_curseforge',
	hideMusicTab: 'modlex_hide_music_tab',
	hideAiAgent: 'modlex_hide_ai_agent',
	hideMultiLaunch: 'modlex_hide_multi_launch',
	hideFriends: 'modlex_hide_friends',
	hideRightSidebar: 'modlex_hide_right_sidebar',
	hideFloatingAccountWidget: 'modlex_hide_floating_account_widget',
	floatingGlassEffect: 'modlex_floating_glass_effect',
	settingsSearchVisible: 'modlex_settings_search_visible',
	autoAccentFromWallpaper: 'modlex_auto_accent_from_wallpaper',
	autoThemeFromWallpaper: 'modlex_auto_theme_from_wallpaper',
	navGlassEnabled: 'modlex_nav_glass_enabled',
	navGlassOpacity: 'modlex_nav_glass_opacity',
	navGlassBlur: 'modlex_nav_glass_blur',
	homeShowJumpIn: 'modlex_home_show_jump_in',
	homeShowLibrary: 'modlex_home_show_library',
	homeShowLibrarySearch: 'modlex_home_show_library_search',
	homeCardSize: 'modlex_home_card_size',
	homeJumpInSize: 'modlex_home_jump_in_size',
	useWallpaperLayout: 'modlex_use_wallpaper_layout',
	instanceCustomizationMode: 'modlex_instance_customization_mode',
	instanceAnimations: 'modlex_instance_animations',
	notifyAuthUnreachable: 'modlex_notify_auth_unreachable',
	consoleText: 'modlex_console_text',
	consoleScale: 'modlex_console_scale',
	consoleLetterGap: 'modlex_console_letter_gap',
	consoleFillChar: 'modlex_console_fill_char',
	consoleRainChars: 'modlex_console_rain_chars',
	consoleRainEnabled: 'modlex_console_rain_enabled',
	consoleFillColor: 'modlex_console_fill_color',
	consoleRainColor: 'modlex_console_rain_color',
	consoleBgColor: 'modlex_console_bg_color',
	accentColor: 'modlex_accent_color',
	bgColor: 'modlex_bg_color',
	panelColor: 'modlex_panel_color',
	textColor: 'modlex_text_color',
	iconColor: 'modlex_icon_color',
	dividerColor: 'modlex_divider_color',
	doubleBorderEnabled: 'modlex_double_border_enabled',
	doubleBorderInner: 'modlex_double_border_inner_color',
	doubleBorderOuter: 'modlex_double_border_outer_color',
	textOutlineEnabled: 'modlex_text_outline_enabled',
	textOutlineColor: 'modlex_text_outline_color',
	experiencedModeUnlocked: 'modlex_experienced_mode_unlocked',
} as const

export type NewsSource = 'github' | 'modrinth' | 'off'

function readString(key: string, fallback: string): string {
	const raw = localStorage.getItem(key)
	return raw === null ? fallback : raw
}

function readBool(key: string, fallback: boolean): boolean {
	const raw = localStorage.getItem(key)
	return raw === null ? fallback : raw === 'true'
}

function readNumber(key: string, fallback: number): number {
	const raw = localStorage.getItem(key)
	if (raw === null) return fallback
	const parsed = Number(raw)
	return Number.isFinite(parsed) ? parsed : fallback
}

// ── Для опытных ────────────────────────────────────────────────────────────
export const modlexExperiencedModeUnlocked = ref(
	readBool(STORAGE_KEYS.experiencedModeUnlocked, false),
)

// ── Внешний вид ────────────────────────────────────────────────────────────
export const modlexHideServers = ref(readBool(STORAGE_KEYS.hideServers, false))

// ── Музыка ─────────────────────────────────────────────────────────────────
export const modlexHideMusicTab = ref(readBool(STORAGE_KEYS.hideMusicTab, false))

// ── ИИ-агент ───────────────────────────────────────────────────────────────
export const modlexHideAiAgent = ref(readBool(STORAGE_KEYS.hideAiAgent, false))

// ── Мульти-запуск ──────────────────────────────────────────────────────────
export const modlexHideMultiLaunch = ref(readBool(STORAGE_KEYS.hideMultiLaunch, false))

// ── Правая панель ──────────────────────────────────────────────────────────
// Скрыть только блок "Друзья" внутри правой панели (панель при этом остаётся).
export const modlexHideFriends = ref(readBool(STORAGE_KEYS.hideFriends, false))
// Скрыть правую панель целиком (аккаунт/друзья/новости). Вместо неё — плавающая
// плашка текущего аккаунта (см. FloatingAccountWidget.vue), которую тоже можно
// скрыть по наведению — см. modlexHideFloatingAccountWidget ниже.
export const modlexHideRightSidebar = ref(readBool(STORAGE_KEYS.hideRightSidebar, false))
// Действует только при modlexHideRightSidebar — прячет и саму плавающую плашку
// за правый край экрана, показывая её только при наведении на угол.
export const modlexHideFloatingAccountWidget = ref(
	readBool(STORAGE_KEYS.hideFloatingAccountWidget, false),
)
// Полупрозрачный фон + блюр вместо сплошного — для плавающей плашки аккаунта
// и "подглядывающей" правой панели на Discover.
export const modlexFloatingGlassEffect = ref(readBool(STORAGE_KEYS.floatingGlassEffect, true))

/** ТЕСТ: акцент берётся из обоев (картинка/GIF/видео), пока включено */
export const modlexAutoAccentFromWallpaper = ref(
	readBool(STORAGE_KEYS.autoAccentFromWallpaper, false),
)
/** ТЕСТ: ВСЯ тема (акцент, фон, панели, разделители, текст, иконки) — из обоев. Приоритетнее
 * ручных цветов и тумблера «только акцент»: при включении ручные цвета блокируются в UI. */
export const modlexAutoThemeFromWallpaper = ref(readBool(STORAGE_KEYS.autoThemeFromWallpaper, false))
watch(modlexAutoThemeFromWallpaper, (v) => {
	try {
		localStorage.setItem(STORAGE_KEYS.autoThemeFromWallpaper, String(v))
	} catch {
		// localStorage недоступен
	}
})
/** Последний цвет, вытащенный из обоев (заполняет App.vue), '' — нет/не читается */
export const modlexWallpaperAccent = ref('')
/** Производная палитра из этого цвета (для «вся тема под обои») */
export const modlexWallpaperTheme = ref<{
	accent: string
	bg: string
	panel: string
	divider: string
} | null>(null)
const modlexAutoThemeActive = computed(
	() => modlexAutoThemeFromWallpaper.value && modlexWallpaperTheme.value !== null,
)
/** Акцент, который реально применён. Включённый адаптивный режим забирает акцент себе (ручной
 * цвет в UI при этом заблокирован): вся тема из обоев > акцент из обоев > ручной цвет. Если цвет из
 * обоев вытащить не удалось — остаётся ручной. */
export const modlexEffectiveAccent = computed(() => {
	if (modlexAutoThemeActive.value && modlexWallpaperTheme.value) return modlexWallpaperTheme.value.accent
	if (modlexAutoAccentFromWallpaper.value && modlexWallpaperAccent.value) return modlexWallpaperAccent.value
	return modlexAccentColor.value
})
watch(modlexAutoAccentFromWallpaper, (v) => {
	try {
		localStorage.setItem(STORAGE_KEYS.autoAccentFromWallpaper, String(v))
	} catch {
		// localStorage недоступен
	}
})

/** Показывать ли строку поиска на вкладке ModLEX в настройках */
export const modlexSettingsSearchVisible = ref(readBool(STORAGE_KEYS.settingsSearchVisible, true))
watch(modlexSettingsSearchVisible, (v) => {
	try {
		localStorage.setItem(STORAGE_KEYS.settingsSearchVisible, String(v))
	} catch {
		// localStorage недоступен
	}
})

// ── Левая панель и верхняя полоска: стекло/прозрачность ────────────────────
export const modlexNavGlassEnabled = ref(readBool(STORAGE_KEYS.navGlassEnabled, false))
/** Непрозрачность фона панелей при включённом стекле, 0.15..1 */
export const modlexNavGlassOpacity = ref(readNumber(STORAGE_KEYS.navGlassOpacity, 0.55))
/** Размытие фона за панелями при включённом стекле, px */
export const modlexNavGlassBlur = ref(readNumber(STORAGE_KEYS.navGlassBlur, 16))

// ── Раскладка главной: только шаблонные размеры/видимость, без своего CSS ──
export type HomeCardSize = 'small' | 'medium' | 'large'
export type HomeJumpInSize = 'compact' | 'normal'

function readEnum<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
	const raw = localStorage.getItem(key)
	return raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : fallback
}

/** Оформление инстансов от авторов сборок: всё / только статика / выключено */
export type InstanceCustomizationMode = 'all' | 'static' | 'off'
export const modlexInstanceCustomizationMode = ref<InstanceCustomizationMode>(
	readEnum(STORAGE_KEYS.instanceCustomizationMode, ['all', 'static', 'off'] as const, 'all'),
)
/** Предупреждать ли, что серверы авторизации Mojang недоступны */
export const modlexNotifyAuthUnreachable = ref(readBool(STORAGE_KEYS.notifyAuthUnreachable, true))
/** Проигрывать ли анимации оформления (при «всё») */
export const modlexInstanceAnimations = ref(readBool(STORAGE_KEYS.instanceAnimations, true))

export const modlexHomeShowJumpIn = ref(readBool(STORAGE_KEYS.homeShowJumpIn, true))
export const modlexHomeShowLibrary = ref(readBool(STORAGE_KEYS.homeShowLibrary, true))
export const modlexHomeShowLibrarySearch = ref(readBool(STORAGE_KEYS.homeShowLibrarySearch, true))
export const modlexHomeCardSize = ref<HomeCardSize>(
	readEnum(STORAGE_KEYS.homeCardSize, ['small', 'medium', 'large'] as const, 'medium'),
)
export const modlexHomeJumpInSize = ref<HomeJumpInSize>(
	readEnum(STORAGE_KEYS.homeJumpInSize, ['compact', 'normal'] as const, 'normal'),
)

/** Раскладка, которую предложили HTML-обои. Не сохраняется и не трогает настройки пользователя —
 * действует поверх них, пока эти обои активны и включён тумблер. */
export interface WallpaperLayoutHint {
	showJumpIn?: boolean
	showLibrary?: boolean
	showLibrarySearch?: boolean
	cardSize?: HomeCardSize
	jumpInSize?: HomeJumpInSize
}
export const modlexUseWallpaperLayout = ref(readBool(STORAGE_KEYS.useWallpaperLayout, true))
export const modlexWallpaperLayoutHint = ref<WallpaperLayoutHint | null>(null)
export const modlexWallpaperLayoutActive = computed(
	() => modlexUseWallpaperLayout.value && modlexWallpaperLayoutHint.value !== null,
)

/** Строгая проверка присланной обоями подсказки: только известные поля и значения. */
export function sanitizeWallpaperLayout(raw: unknown): WallpaperLayoutHint | null {
	if (typeof raw !== 'object' || raw === null) return null
	const data = raw as Record<string, unknown>
	const hint: WallpaperLayoutHint = {}
	if (typeof data.showJumpIn === 'boolean') hint.showJumpIn = data.showJumpIn
	if (typeof data.showLibrary === 'boolean') hint.showLibrary = data.showLibrary
	if (typeof data.showLibrarySearch === 'boolean') hint.showLibrarySearch = data.showLibrarySearch
	if (data.cardSize === 'small' || data.cardSize === 'medium' || data.cardSize === 'large')
		hint.cardSize = data.cardSize
	if (data.jumpInSize === 'compact' || data.jumpInSize === 'normal') hint.jumpInSize = data.jumpInSize
	return Object.keys(hint).length > 0 ? hint : null
}

/** Что реально показывается на главной: настройки пользователя или подсказка обоев. */
export const modlexHomeShowJumpInEff = computed(
	() => (modlexWallpaperLayoutActive.value ? modlexWallpaperLayoutHint.value?.showJumpIn : undefined) ?? modlexHomeShowJumpIn.value,
)
export const modlexHomeShowLibraryEff = computed(
	() => (modlexWallpaperLayoutActive.value ? modlexWallpaperLayoutHint.value?.showLibrary : undefined) ?? modlexHomeShowLibrary.value,
)
export const modlexHomeShowLibrarySearchEff = computed(
	() => (modlexWallpaperLayoutActive.value ? modlexWallpaperLayoutHint.value?.showLibrarySearch : undefined) ?? modlexHomeShowLibrarySearch.value,
)
export const modlexHomeCardSizeEff = computed(
	() => (modlexWallpaperLayoutActive.value ? modlexWallpaperLayoutHint.value?.cardSize : undefined) ?? modlexHomeCardSize.value,
)
export const modlexHomeJumpInSizeEff = computed(
	() => (modlexWallpaperLayoutActive.value ? modlexWallpaperLayoutHint.value?.jumpInSize : undefined) ?? modlexHomeJumpInSize.value,
)

for (const [source, key] of [
	[modlexNavGlassEnabled, STORAGE_KEYS.navGlassEnabled],
	[modlexNavGlassOpacity, STORAGE_KEYS.navGlassOpacity],
	[modlexNavGlassBlur, STORAGE_KEYS.navGlassBlur],
	[modlexHomeShowJumpIn, STORAGE_KEYS.homeShowJumpIn],
	[modlexHomeShowLibrary, STORAGE_KEYS.homeShowLibrary],
	[modlexHomeShowLibrarySearch, STORAGE_KEYS.homeShowLibrarySearch],
	[modlexHomeCardSize, STORAGE_KEYS.homeCardSize],
	[modlexHomeJumpInSize, STORAGE_KEYS.homeJumpInSize],
	[modlexUseWallpaperLayout, STORAGE_KEYS.useWallpaperLayout],
	[modlexInstanceCustomizationMode, STORAGE_KEYS.instanceCustomizationMode],
	[modlexInstanceAnimations, STORAGE_KEYS.instanceAnimations],
	[modlexNotifyAuthUnreachable, STORAGE_KEYS.notifyAuthUnreachable],
] as const) {
	watch(source, (value) => {
		try {
			localStorage.setItem(key, String(value))
		} catch {
			// localStorage недоступен — настройка просто не переживёт перезапуск
		}
	})
}

// ── Код раскладки главной (шеринг одной строкой, как код темы) ──────────────
interface ModlexLayoutCode {
	v: 1
	navGlassEnabled: boolean
	navGlassOpacity: number
	navGlassBlur: number
	showJumpIn: boolean
	showLibrary: boolean
	showLibrarySearch: boolean
	cardSize: HomeCardSize
	jumpInSize: HomeJumpInSize
}

export function exportLayoutCode(): string {
	const data: ModlexLayoutCode = {
		v: 1,
		navGlassEnabled: modlexNavGlassEnabled.value,
		navGlassOpacity: modlexNavGlassOpacity.value,
		navGlassBlur: modlexNavGlassBlur.value,
		showJumpIn: modlexHomeShowJumpIn.value,
		showLibrary: modlexHomeShowLibrary.value,
		showLibrarySearch: modlexHomeShowLibrarySearch.value,
		cardSize: modlexHomeCardSize.value,
		jumpInSize: modlexHomeJumpInSize.value,
	}
	return btoa(JSON.stringify(data))
}

/** Применяет код раскладки. Каждое поле проверяется по типу/диапазону —
 * неизвестное или некорректное молча пропускается. false — код нечитаем. */
export function importLayoutCode(code: string): boolean {
	let data: Partial<ModlexLayoutCode>
	try {
		data = JSON.parse(atob(code.replace(/\s+/g, '')))
	} catch {
		return false
	}
	if (typeof data !== 'object' || data === null) return false
	if (typeof data.navGlassEnabled === 'boolean') modlexNavGlassEnabled.value = data.navGlassEnabled
	if (typeof data.navGlassOpacity === 'number' && Number.isFinite(data.navGlassOpacity))
		modlexNavGlassOpacity.value = Math.min(1, Math.max(0.15, data.navGlassOpacity))
	if (typeof data.navGlassBlur === 'number' && Number.isFinite(data.navGlassBlur))
		modlexNavGlassBlur.value = Math.min(40, Math.max(0, data.navGlassBlur))
	if (typeof data.showJumpIn === 'boolean') modlexHomeShowJumpIn.value = data.showJumpIn
	if (typeof data.showLibrary === 'boolean') modlexHomeShowLibrary.value = data.showLibrary
	if (typeof data.showLibrarySearch === 'boolean')
		modlexHomeShowLibrarySearch.value = data.showLibrarySearch
	if (data.cardSize === 'small' || data.cardSize === 'medium' || data.cardSize === 'large')
		modlexHomeCardSize.value = data.cardSize
	if (data.jumpInSize === 'compact' || data.jumpInSize === 'normal')
		modlexHomeJumpInSize.value = data.jumpInSize
	return true
}

// ── Новости ────────────────────────────────────────────────────────────────
export const modlexNewsSource = ref<NewsSource>(
	readString(STORAGE_KEYS.newsSource, 'github') as NewsSource,
)

export const modlexUseGithubNews = computed(() => modlexNewsSource.value === 'github')
export const modlexHideNews = computed(() => modlexNewsSource.value === 'off')
export const modlexUseModrinthNews = computed(() => modlexNewsSource.value === 'modrinth')

// ── Платформы поиска ───────────────────────────────────────────────────────
export const modlexEnableModrinth = ref(readBool(STORAGE_KEYS.enableModrinth, true))
export const modlexEnableCurseForge = ref(readBool(STORAGE_KEYS.enableCurseForge, true))

/**
 * Какие платформы реально доступны (хотя бы одна должна быть включена).
 * useFeatureFlag вызывается лениво внутри computed (а не на верхнем уровне
 * модуля), потому что он использует Pinia (useTheming) — на верхнем уровне
 * модуля Pinia может быть ещё не подключена в зависимости от порядка импортов.
 */
export const availablePlatforms = computed<Array<'modrinth' | 'curseforge'>>(() => {
	const list: Array<'modrinth' | 'curseforge'> = []
	if (modlexEnableModrinth.value) list.push('modrinth')
	// Фича-флаг может отключить CurseForge независимо от выбора пользователя
	// (useFeatureFlag сам учитывает devMode — см. helpers/feature-flags.ts)
	if (modlexEnableCurseForge.value && useFeatureFlag('curseforge_platform_v2').enabled.value) {
		list.push('curseforge')
	}
	// хотя бы одна всегда есть — если обе выкл, возвращаем modrinth как fallback
	return list.length > 0 ? list : ['modrinth']
})

// ── Консоль запуска (текст/размер/зазор пустого экрана) ──────────────────────
// Пустая строка = стандартный "NO SIGNAL". scale = 0 = автоподбор под размер
// терминала (см. BaseTerminal.vue::computeLetterScale).
export const modlexConsoleText = ref(readString(STORAGE_KEYS.consoleText, ''))
export const modlexConsoleScale = ref(readNumber(STORAGE_KEYS.consoleScale, 0))
export const modlexConsoleLetterGap = ref(readNumber(STORAGE_KEYS.consoleLetterGap, 2))
export const modlexConsoleFillChar = ref(readString(STORAGE_KEYS.consoleFillChar, ''))
export const modlexConsoleRainChars = ref(readString(STORAGE_KEYS.consoleRainChars, ''))
// Отключает анимацию матричного дождя на пустом экране консоли — вместо неё
// статичный ASCII-арт спящего волка (см. BaseTerminal.vue::writeSleepingWolf).
export const modlexConsoleRainEnabled = ref(readBool(STORAGE_KEYS.consoleRainEnabled, false))
// Пустая строка = стандартный цвет (тёмно-серый для заполнителя, зелёный для дождя).
export const modlexConsoleFillColor = ref(readString(STORAGE_KEYS.consoleFillColor, ''))
export const modlexConsoleRainColor = ref(readString(STORAGE_KEYS.consoleRainColor, ''))
// Фон самой консоли — независимо от общего фона лаунчера (--surface-2 по умолчанию).
export const modlexConsoleBgColor = ref(readString(STORAGE_KEYS.consoleBgColor, ''))

/** Сбрасывает все настройки консоли (текст/размер/зазор/символы/цвета/дождь)
 * к значениям по умолчанию. */
export function resetConsoleSettings(): void {
	modlexConsoleText.value = ''
	modlexConsoleScale.value = 0
	modlexConsoleLetterGap.value = 2
	modlexConsoleFillChar.value = ''
	modlexConsoleRainChars.value = ''
	modlexConsoleRainEnabled.value = false
	modlexConsoleFillColor.value = ''
	modlexConsoleRainColor.value = ''
	modlexConsoleBgColor.value = ''
}

// ── Акцентный цвет ─────────────────────────────────────────────────────────
// Пустая строка = стандартный цвет темы (оверрайд не применяется).
export const modlexAccentColor = ref(readString(STORAGE_KEYS.accentColor, ''))

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
	const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
	if (!match) return null
	const num = parseInt(match[1], 16)
	return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

// Переменные, которые просто наследуют --color-brand через var(...) в
// variables.scss, оверрайдить отдельно не нужно — родительского --color-brand
// достаточно. Эти — с собственными rgba(...)-значениями, поэтому оверрайдим
// их тоже, тем же цветом на разной прозрачности.
const ALPHA_OVERRIDES: Record<string, number> = {
	'--color-brand-highlight': 0.25,
	'--color-brand-shadow': 0.7,
	'--brand-gradient-button': 0.1,
	'--brand-gradient-border': 0.2,
}

// Двухстоповые градиенты-подложки (карточки в новостях, "туман" снизу
// правой панели и т.п.) — пересобираем с тем же углом, но обоими стопами от
// выбранного акцента, чтобы не было рассинхрона с остальным акцентным UI.
const GRADIENT_VARS = [
	'--brand-gradient-bg',
	'--brand-gradient-strong-bg',
	'--brand-gradient-fade-out-color',
] as const

/**
 * Оверрайдит --color-brand и производные инлайн-стилем на <html> — это бьёт
 * по специфичности любые правила из variables.scss, независимо от активной
 * темы.
 */
/** Чёрный или белый — что контрастнее на фоне заданного цвета (WCAG). */
function readableOn(rgb: { r: number; g: number; b: number }): '#000000' | '#ffffff' {
	const lin = (channel: number) => {
		const c = channel / 255
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
	}
	const luminance = 0.2126 * lin(rgb.r) + 0.7152 * lin(rgb.g) + 0.0722 * lin(rgb.b)
	return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#ffffff' : '#000000'
}

export function applyAccentColor(hex: string): void {
	const root = document.documentElement
	const rgb = hex ? hexToRgb(hex) : null
	if (!rgb) {
		root.style.removeProperty('--color-accent-contrast')
		root.style.removeProperty('--color-brand-inverted')
		root.style.removeProperty('--color-brand')
		for (const varName of Object.keys(ALPHA_OVERRIDES)) root.style.removeProperty(varName)
		for (const varName of GRADIENT_VARS) root.style.removeProperty(varName)
		return
	}
	root.style.setProperty('--color-brand', `#${hex.replace('#', '')}`)
	// Текст/иконки НА акценте (выбранная вкладка, залитые кнопки, иконка ИИ-агента) —
	// белые на белом акценте были невидимы. Считаем чёрный/белый по контрасту.
	const onAccent = readableOn(rgb)
	root.style.setProperty('--color-accent-contrast', onAccent)
	root.style.setProperty('--color-brand-inverted', onAccent)
	for (const [varName, alpha] of Object.entries(ALPHA_OVERRIDES)) {
		root.style.setProperty(varName, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`)
	}
	const bgGradient = `linear-gradient(0deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.22) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.08) 100%)`
	root.style.setProperty('--brand-gradient-bg', bgGradient)
	root.style.setProperty('--brand-gradient-strong-bg', bgGradient)
	// "Туман" снизу карточек — фейд в ту же сторону, что в оригинале (сверху
	// вниз, от прозрачного к более плотному), просто тонирован акцентом.
	root.style.setProperty(
		'--brand-gradient-fade-out-color',
		`linear-gradient(to bottom, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35) 80%)`,
	)
}

applyAccentColor(modlexAccentColor.value)

// ── Расширенная кастомизация (фон, текст, иконки, разделители) ───────────────
// Пустая строка = стандартный цвет темы (оверрайд не применяется).
export const modlexBgColor = ref(readString(STORAGE_KEYS.bgColor, ''))
export const modlexPanelColor = ref(readString(STORAGE_KEYS.panelColor, ''))
export const modlexTextColor = ref(readString(STORAGE_KEYS.textColor, ''))
export const modlexIconColor = ref(readString(STORAGE_KEYS.iconColor, ''))
export const modlexDividerColor = ref(readString(STORAGE_KEYS.dividerColor, ''))
export const modlexDoubleBorderEnabled = ref(readBool(STORAGE_KEYS.doubleBorderEnabled, false))
export const modlexDoubleBorderInner = ref(readString(STORAGE_KEYS.doubleBorderInner, '#ffffff'))
export const modlexDoubleBorderOuter = ref(readString(STORAGE_KEYS.doubleBorderOuter, '#000000'))
export const modlexTextOutlineEnabled = ref(readBool(STORAGE_KEYS.textOutlineEnabled, false))
export const modlexTextOutlineColor = ref(readString(STORAGE_KEYS.textOutlineColor, '#000000'))

// Затемняет rgb на factor (0..1) в сторону чёрного — используется, чтобы из
// одного выбранного цвета текста получить иерархию "яркий/обычный/приглушённый",
// как в стандартной теме (--color-text-primary > -default > -tertiary).
function shade(rgb: { r: number; g: number; b: number }, factor: number): string {
	return `rgb(${Math.round(rgb.r * factor)}, ${Math.round(rgb.g * factor)}, ${Math.round(rgb.b * factor)})`
}

// Насколько каждый уровень surface-* светлее "базового" уровня своего яруса
// в стандартной тёмной теме (посчитано из variables.scss) — сохраняем эти же
// смещения поверх выбранного пользователем цвета, чтобы соседние уровни
// (например surface-4 относительно surface-3) остались читаемо светлее.
// Ярус "фон": сам контент (surface-1/1-5/2/2-5) — задаётся полем "Фон".
const BG_LEVEL_DELTAS: Record<string, { r: number; g: number; b: number }> = {
	'--surface-1': { r: 0, g: 0, b: 0 },
	'--surface-1-5': { r: 4, g: 4, b: 4 },
	'--surface-2': { r: 7, g: 7, b: 7 },
	'--surface-2-5': { r: 12, g: 12, b: 13 },
}
// Ярус "панели/карточки": приподнятые поверхности (surface-3/4/5) — кнопки,
// карточки инстансов, боковые панели. Задаётся отдельным полем "Панели и
// карточки", независимо от основного фона.
const PANEL_LEVEL_DELTAS: Record<string, { r: number; g: number; b: number }> = {
	'--surface-3': { r: 0, g: 0, b: 0 },
	'--surface-4': { r: 13, g: 13, b: 14 },
	'--surface-5': { r: 27, g: 27, b: 28 },
}

function clampChannel(v: number): number {
	return Math.max(0, Math.min(255, Math.round(v)))
}

function applySurfaceTier(
	hex: string,
	deltas: Record<string, { r: number; g: number; b: number }>,
): void {
	const root = document.documentElement
	const rgb = hex ? hexToRgb(hex) : null
	if (!rgb) {
		for (const varName of Object.keys(deltas)) root.style.removeProperty(varName)
		return
	}
	for (const [varName, delta] of Object.entries(deltas)) {
		const r = clampChannel(rgb.r + delta.r)
		const g = clampChannel(rgb.g + delta.g)
		const b = clampChannel(rgb.b + delta.b)
		root.style.setProperty(varName, `rgb(${r}, ${g}, ${b})`)
	}
}

/** Оверрайдит основной фон контента (surface-1/1-5/2/2-5). Панели и карточки
 * (surface-3/4/5) — отдельная настройка, см. applyPanelColor. */
export function applyBgColor(hex: string): void {
	applySurfaceTier(hex, BG_LEVEL_DELTAS)
}

/** Оверрайдит фон приподнятых поверхностей — карточки инстансов, кнопки,
 * боковые панели (surface-3/4/5). Не трогает основной фон, см. applyBgColor. */
export function applyPanelColor(hex: string): void {
	applySurfaceTier(hex, PANEL_LEVEL_DELTAS)
}

/** Оверрайдит цвет текста (contrast/default/tertiary) одним выбранным
 * цветом с производными более тёмными оттенками для сохранения иерархии. */
export function applyTextColor(hex: string): void {
	const root = document.documentElement
	const rgb = hex ? hexToRgb(hex) : null
	if (!rgb) {
		// Текст не задан вручную: если пользователь перекрасил фон/панели, подбираем
		// читаемый (чёрный/белый) сами — иначе белый текст на белой панели невидим.
		const surfaces = [modlexEffectiveBg.value, modlexEffectivePanel.value]
			.map((value) => (value ? hexToRgb(value) : null))
			.filter((value): value is { r: number; g: number; b: number } => value !== null)
		if (surfaces.length === 0) {
			root.style.removeProperty('--color-text-primary')
			root.style.removeProperty('--color-text-default')
			root.style.removeProperty('--color-text-tertiary')
			return
		}
		const avg = {
			r: surfaces.reduce((sum, c) => sum + c.r, 0) / surfaces.length,
			g: surfaces.reduce((sum, c) => sum + c.g, 0) / surfaces.length,
			b: surfaces.reduce((sum, c) => sum + c.b, 0) / surfaces.length,
		}
		const primary =
			readableOn(avg) === '#ffffff' ? { r: 255, g: 255, b: 255 } : { r: 13, g: 13, b: 16 }
		const mixToward = (t: number) =>
			`rgb(${Math.round(primary.r + (avg.r - primary.r) * t)}, ${Math.round(primary.g + (avg.g - primary.g) * t)}, ${Math.round(primary.b + (avg.b - primary.b) * t)})`
		root.style.setProperty('--color-text-primary', `rgb(${primary.r}, ${primary.g}, ${primary.b})`)
		root.style.setProperty('--color-text-default', mixToward(0.2))
		root.style.setProperty('--color-text-tertiary', mixToward(0.4))
		return
	}
	root.style.setProperty('--color-text-primary', `#${hex.replace('#', '')}`)
	root.style.setProperty('--color-text-default', shade(rgb, 0.75))
	root.style.setProperty('--color-text-tertiary', shade(rgb, 0.6))
}

/** Оверрайдит цвет неактивных иконок бокового меню (--modlex-icon-color,
 * читается в NavButton.vue с фоллбэком на стандартный --color-text-default). */
export function applyIconColor(hex: string): void {
	const root = document.documentElement
	if (!hex) {
		root.style.removeProperty('--modlex-icon-color')
		root.removeAttribute('data-modlex-icon-color')
		return
	}
	root.style.setProperty('--modlex-icon-color', `#${hex.replace('#', '')}`)
	// Не только боковое меню: нейтральные иконки по всему интерфейсу — см. глобальное
	// правило [data-modlex-icon-color] в App.vue.
	root.setAttribute('data-modlex-icon-color', '')
}

/** Оверрайдит цвет разделителей (--color-divider). Цвет краёв карточек
 * (border-surface-4/5) теперь часть общего фона — см. applyBgColor. */
export function applyDividerColor(hex: string): void {
	const root = document.documentElement
	if (!hex) {
		root.style.removeProperty('--color-divider')
		return
	}
	root.style.setProperty('--color-divider', `#${hex.replace('#', '')}`)
}

/** Двойная обводка (внутренняя + внешняя) поверх стандартных краёв/границ —
 * см. глобальное CSS-правило [data-modlex-double-border] в App.vue. */
export function applyDoubleBorder(enabled: boolean, innerHex: string, outerHex: string): void {
	const root = document.documentElement
	if (enabled) {
		root.setAttribute('data-modlex-double-border', '')
		root.style.setProperty('--modlex-border-inner-color', innerHex || '#ffffff')
		root.style.setProperty('--modlex-border-outer-color', outerHex || '#000000')
	} else {
		root.removeAttribute('data-modlex-double-border')
		root.style.removeProperty('--modlex-border-inner-color')
		root.style.removeProperty('--modlex-border-outer-color')
	}
}

/** Обводка текста (--modlex-text-outline-color + [data-modlex-text-outline])
 * — независимо от двойной обводки карточек, см. глобальное CSS-правило
 * [data-modlex-text-outline] в App.vue. */
export function applyTextOutline(enabled: boolean, color: string): void {
	const root = document.documentElement
	if (enabled) {
		root.setAttribute('data-modlex-text-outline', '')
		root.style.setProperty('--modlex-text-outline-color', color || '#000000')
	} else {
		root.removeAttribute('data-modlex-text-outline')
		root.style.removeProperty('--modlex-text-outline-color')
	}
}

// Эффективные значения: вся тема из обоев (если включена) перекрывает ручные цвета.
const modlexEffectiveBg = computed(() =>
	modlexAutoThemeActive.value && modlexWallpaperTheme.value
		? modlexWallpaperTheme.value.bg
		: modlexBgColor.value,
)
const modlexEffectivePanel = computed(() =>
	modlexAutoThemeActive.value && modlexWallpaperTheme.value
		? modlexWallpaperTheme.value.panel
		: modlexPanelColor.value,
)
const modlexEffectiveDivider = computed(() =>
	modlexAutoThemeActive.value && modlexWallpaperTheme.value
		? modlexWallpaperTheme.value.divider
		: modlexDividerColor.value,
)
// Текст и иконки при авто-теме считаются сами по контрасту (ручные игнорируются).
const modlexEffectiveText = computed(() => (modlexAutoThemeActive.value ? '' : modlexTextColor.value))
const modlexEffectiveIcon = computed(() => (modlexAutoThemeActive.value ? '' : modlexIconColor.value))

watch(modlexEffectiveBg, (v) => applyBgColor(v), { immediate: true })
watch(modlexEffectivePanel, (v) => applyPanelColor(v), { immediate: true })
watch(modlexEffectiveDivider, (v) => applyDividerColor(v), { immediate: true })
watch(modlexEffectiveIcon, (v) => applyIconColor(v), { immediate: true })
watch(
	[modlexEffectiveText, modlexEffectiveBg, modlexEffectivePanel],
	() => applyTextColor(modlexEffectiveText.value),
	{ immediate: true },
)
applyDoubleBorder(
	modlexDoubleBorderEnabled.value,
	modlexDoubleBorderInner.value,
	modlexDoubleBorderOuter.value,
)
applyTextOutline(modlexTextOutlineEnabled.value, modlexTextOutlineColor.value)

// ── Экспорт/импорт темы ───────────────────────────────────────────────────
interface ModlexThemeCode {
	v: 1
	accentColor: string
	bgColor: string
	panelColor: string
	textColor: string
	iconColor: string
	dividerColor: string
	doubleBorderEnabled: boolean
	doubleBorderInner: string
	doubleBorderOuter: string
	textOutlineEnabled: boolean
	textOutlineColor: string
}

/** Собирает все настройки кастомизации цвета в один code-строку (base64 от
 * JSON) — чтобы можно было сохранить/переслать тему одной строкой. */
export function exportThemeCode(): string {
	const data: ModlexThemeCode = {
		v: 1,
		accentColor: modlexAccentColor.value,
		bgColor: modlexBgColor.value,
		panelColor: modlexPanelColor.value,
		textColor: modlexTextColor.value,
		iconColor: modlexIconColor.value,
		dividerColor: modlexDividerColor.value,
		doubleBorderEnabled: modlexDoubleBorderEnabled.value,
		doubleBorderInner: modlexDoubleBorderInner.value,
		doubleBorderOuter: modlexDoubleBorderOuter.value,
		textOutlineEnabled: modlexTextOutlineEnabled.value,
		textOutlineColor: modlexTextOutlineColor.value,
	}
	return btoa(JSON.stringify(data))
}

/** Обратная операция — применяет код темы к текущим настройкам. Возвращает
 * false, если код нечитаем (неверный формат/повреждён). */
export function importThemeCode(code: string): boolean {
	let data: Partial<ModlexThemeCode>
	try {
		// ModLEX: копипаст из чата/терминала иногда протаскивает пробелы или
		// переносы строк, которые попали в буфер обмена на месте визуального
		// переноса длинной base64-строки — из-за этого atob() падал на
		// валидном по сути коде. Чистим весь whitespace целиком, не только
		// по краям.
		const cleaned = code.replace(/\s+/g, '')
		data = JSON.parse(atob(cleaned))
	} catch {
		return false
	}
	if (typeof data !== 'object' || data === null) return false
	if (typeof data.accentColor === 'string') modlexAccentColor.value = data.accentColor
	if (typeof data.bgColor === 'string') modlexBgColor.value = data.bgColor
	if (typeof data.panelColor === 'string') modlexPanelColor.value = data.panelColor
	if (typeof data.textColor === 'string') modlexTextColor.value = data.textColor
	if (typeof data.iconColor === 'string') modlexIconColor.value = data.iconColor
	if (typeof data.dividerColor === 'string') modlexDividerColor.value = data.dividerColor
	if (typeof data.doubleBorderEnabled === 'boolean')
		modlexDoubleBorderEnabled.value = data.doubleBorderEnabled
	if (typeof data.doubleBorderInner === 'string')
		modlexDoubleBorderInner.value = data.doubleBorderInner
	if (typeof data.doubleBorderOuter === 'string')
		modlexDoubleBorderOuter.value = data.doubleBorderOuter
	if (typeof data.textOutlineEnabled === 'boolean')
		modlexTextOutlineEnabled.value = data.textOutlineEnabled
	if (typeof data.textOutlineColor === 'string')
		modlexTextOutlineColor.value = data.textOutlineColor
	return true
}

// ── Watchers ───────────────────────────────────────────────────────────────
function broadcast() {
	window.dispatchEvent(
		new CustomEvent('modlex-settings-changed', {
			detail: {
				hideServers: modlexHideServers.value,
				newsSource: modlexNewsSource.value,
				enableModrinth: modlexEnableModrinth.value,
				enableCurseForge: modlexEnableCurseForge.value,
				hideMusicTab: modlexHideMusicTab.value,
				hideMultiLaunch: modlexHideMultiLaunch.value,
			},
		}),
	)
}

watch(modlexExperiencedModeUnlocked, (v) => {
	localStorage.setItem(STORAGE_KEYS.experiencedModeUnlocked, String(v))
})
watch(modlexHideServers, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideServers, String(v))
	broadcast()
})
watch(modlexHideMusicTab, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideMusicTab, String(v))
	broadcast()
})
watch(modlexHideAiAgent, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideAiAgent, String(v))
})
watch(modlexHideMultiLaunch, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideMultiLaunch, String(v))
	broadcast()
})
watch(modlexHideFriends, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideFriends, String(v))
	broadcast()
})
watch(modlexHideRightSidebar, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideRightSidebar, String(v))
	broadcast()
})
watch(modlexHideFloatingAccountWidget, (v) => {
	localStorage.setItem(STORAGE_KEYS.hideFloatingAccountWidget, String(v))
	broadcast()
})
watch(modlexFloatingGlassEffect, (v) => {
	localStorage.setItem(STORAGE_KEYS.floatingGlassEffect, String(v))
	broadcast()
})
watch(modlexNewsSource, (v) => {
	localStorage.setItem(STORAGE_KEYS.newsSource, v)
	broadcast()
})
watch(modlexEnableModrinth, (v) => {
	localStorage.setItem(STORAGE_KEYS.enableModrinth, String(v))
	broadcast()
})
watch(modlexEnableCurseForge, (v) => {
	localStorage.setItem(STORAGE_KEYS.enableCurseForge, String(v))
	broadcast()
})
watch(modlexConsoleText, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleText, v)
	broadcast()
})
watch(modlexConsoleScale, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleScale, String(v))
	broadcast()
})
watch(modlexConsoleLetterGap, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleLetterGap, String(v))
	broadcast()
})
watch(modlexConsoleFillChar, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleFillChar, v)
	broadcast()
})
watch(modlexConsoleRainChars, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleRainChars, v)
	broadcast()
})
watch(modlexConsoleRainEnabled, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleRainEnabled, String(v))
	broadcast()
})
watch(modlexConsoleFillColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleFillColor, v)
	broadcast()
})
watch(modlexConsoleRainColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleRainColor, v)
	broadcast()
})
watch(modlexConsoleBgColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.consoleBgColor, v)
	broadcast()
})
watch(modlexAccentColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.accentColor, v)
	broadcast()
})
watch(
	modlexEffectiveAccent,
	(v) => {
		applyAccentColor(v)
	},
	{ immediate: true },
)
watch(modlexBgColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.bgColor, v)
	broadcast()
})
watch(modlexPanelColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.panelColor, v)
	broadcast()
})
watch(modlexTextColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.textColor, v)
	broadcast()
})
watch(modlexIconColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.iconColor, v)
	broadcast()
})
watch(modlexDividerColor, (v) => {
	localStorage.setItem(STORAGE_KEYS.dividerColor, v)
	broadcast()
})
watch(
	[modlexDoubleBorderEnabled, modlexDoubleBorderInner, modlexDoubleBorderOuter],
	([enabled, inner, outer]) => {
		localStorage.setItem(STORAGE_KEYS.doubleBorderEnabled, String(enabled))
		localStorage.setItem(STORAGE_KEYS.doubleBorderInner, inner)
		localStorage.setItem(STORAGE_KEYS.doubleBorderOuter, outer)
		applyDoubleBorder(enabled, inner, outer)
		broadcast()
	},
)
watch([modlexTextOutlineEnabled, modlexTextOutlineColor], ([enabled, color]) => {
	localStorage.setItem(STORAGE_KEYS.textOutlineEnabled, String(enabled))
	localStorage.setItem(STORAGE_KEYS.textOutlineColor, color)
	applyTextOutline(enabled, color)
	broadcast()
})
