<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { useLauncherActivity } from '@/composables/use-launcher-activity'

// HTML-обои (Lively-стиль). Страница живёт в sandbox-iframe БЕЗ allow-same-origin:
// у неё opaque-origin, нет доступа ни к Tauri IPC, ни к данным лаунчера, ни к
// localStorage родителя. Общение односторонее — лаунчер шлёт сообщения
// (window.addEventListener('message', ...) внутри обоев), обратно мы ничего
// принимаем только строго проверенные данные (палитра, подписка на карточки, наклоны
// карточек — см. onWallpaperMessage). Формат сообщений: docs/wallpapers/README.md.

const props = defineProps<{
	src: string
	animated: boolean
	blurPx: number
	accentColor: string
	fpsLimit?: number
	volume?: number
}>()

const emit = defineEmits<{
	(e: 'palette', hex: string): void
	(e: 'layout', hint: unknown): void
}>()

// только карточки главной страницы: на библиотеке, странице инстанса и т.д. обои карточки не трогают
const CARD_SELECTOR = '[data-modlex-home] [data-library-instance-card], [data-modlex-home] [data-modlex-jumpin]'
const MAX_CARDS = 300

const frame = ref<HTMLIFrameElement | null>(null)
const loaded = ref(false)
const { windowFocused, gameRunning } = useLauncherActivity()

function post(message: Record<string, unknown>) {
	frame.value?.contentWindow?.postMessage({ source: 'modlex', ...message }, '*')
}

function sendSize() {
	const rect = frame.value?.getBoundingClientRect()
	if (!rect) return
	post({ type: 'resize', width: Math.round(rect.width), height: Math.round(rect.height) })
}

function sendTheme() {
	post({ type: 'theme', accentColor: props.accentColor || null })
}

function sendState() {
	post({
		type: 'state',
		paused: !props.animated || !windowFocused.value || gameRunning.value,
		reason: !props.animated ? 'user' : gameRunning.value ? 'game' : !windowFocused.value ? 'blur' : null,
		fpsLimit: props.fpsLimit ?? 60,
		volume: props.volume ?? 0,
	})
}

// ── Инструменты для авторов: карточки лаунчера ────────────────────────────
// Обои могут подписаться на прямоугольники карточек (рисовать свет/тень/частицы у карточек)
// и присылать «наклоны» карточек. Сами карточки не перекрашиваются — только transform
// с жёсткими лимитами; всё остальное в их внешнем виде остаётся родным.
let cardsSubscribed = false
let cardsRaf = 0
let lastCardsSignature = ''
let hoverCardId: string | null = null
const cardIndex = new Map<string, HTMLElement>()
const transformed = new Set<HTMLElement>()

function cardIdOf(element: HTMLElement): string | null {
	const jumpKey = element.dataset.modlexJumpin
	if (jumpKey) return 'jump:' + jumpKey
	const instanceId = element.dataset.instanceId
	if (!instanceId) return null
	return 'lib:' + instanceId + (element.dataset.instanceGroup ? '@' + element.dataset.instanceGroup : '')
}

function collectCards() {
	const frameRect = frame.value?.getBoundingClientRect()
	cardIndex.clear()
	const cards: { id: string; kind: string; x: number; y: number; w: number; h: number; hover: boolean }[] = []
	if (!frameRect) return cards
	const elements = document.querySelectorAll<HTMLElement>(CARD_SELECTOR)
	for (const element of elements) {
		if (cards.length >= MAX_CARDS) break
		const id = cardIdOf(element)
		if (!id) continue
		const rect = element.getBoundingClientRect()
		if (rect.width === 0 || rect.height === 0) continue
		cardIndex.set(id, element)
		cards.push({
			id,
			kind: id.startsWith('jump:') ? 'jumpin' : 'library',
			x: Math.round(rect.left - frameRect.left),
			y: Math.round(rect.top - frameRect.top),
			w: Math.round(rect.width),
			h: Math.round(rect.height),
			hover: id === hoverCardId,
		})
	}
	return cards
}

function cardsTick() {
	cardsRaf = requestAnimationFrame(cardsTick)
	if (!loaded.value || !props.animated || !windowFocused.value) return
	const cards = collectCards()
	const signature = cards.map((c) => `${c.id}${c.x},${c.y},${c.w},${c.h}${c.hover ? 'h' : ''}`).join('|')
	if (signature === lastCardsSignature) return
	lastCardsSignature = signature
	post({ type: 'cards', cards })
}

function setCardsSubscription(on: boolean) {
	if (on === cardsSubscribed) return
	cardsSubscribed = on
	if (on) {
		cardsRaf = requestAnimationFrame(cardsTick)
	} else {
		cancelAnimationFrame(cardsRaf)
		cardsRaf = 0
		lastCardsSignature = ''
		hoverCardId = null
		resetCardTransforms()
	}
}

function resetCardTransforms() {
	for (const element of transformed) {
		element.style.removeProperty('transform')
		element.style.removeProperty('will-change')
	}
	transformed.clear()
}

const clampNumber = (value: unknown, min: number, max: number, fallback: number) =>
	typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback

function applyCardTransforms(items: unknown) {
	if (!cardsSubscribed || !Array.isArray(items)) return
	for (const item of items.slice(0, MAX_CARDS)) {
		if (!item || typeof item !== 'object') continue
		const { id, rx, ry, tz, s } = item as Record<string, unknown>
		if (typeof id !== 'string' || id.length > 300) continue
		const element = cardIndex.get(id)
		if (!element) continue
		const rotateX = clampNumber(rx, -45, 45, 0)
		const rotateY = clampNumber(ry, -45, 45, 0)
		const translateZ = clampNumber(tz, -100, 100, 0)
		const scale = clampNumber(s, 0.8, 1.2, 1)
		element.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`
		element.style.willChange = 'transform'
		transformed.add(element)
	}
}

function onWallpaperMessage(event: MessageEvent) {
	// принимаем только от нашего iframe и только данные известного вида
	if (event.source !== frame.value?.contentWindow) return
	const data = event.data as Record<string, unknown> | null
	if (!data || typeof data !== 'object' || data.source !== 'modlex-wallpaper') return
	switch (data.type) {
		case 'subscribe':
			setCardsSubscription(data.cards === true)
			break
		case 'palette':
			if (typeof data.accent === 'string' && /^#[0-9a-f]{6}$/i.test(data.accent)) {
				emit('palette', data.accent.toLowerCase())
			}
			break
		case 'layout':
			emit('layout', data.layout)
			break
		case 'card-transforms':
			applyCardTransforms(data.items)
			break
		case 'card-transforms-clear':
			resetCardTransforms()
			break
	}
}

function onLoad() {
	loaded.value = true
	sendSize()
	sendTheme()
	sendState()
}

// Мышь пересылаем в координатах iframe: слой обоев лежит ПОД интерфейсом и
// pointer-events: none, поэтому сами события до него не доходят.
let pendingMove: { x: number; y: number; buttons: number } | null = null
let moveFrame = 0

function flushMove() {
	moveFrame = 0
	const rect = frame.value?.getBoundingClientRect()
	if (!pendingMove || !rect) return
	post({
		type: 'pointer',
		kind: 'move',
		x: pendingMove.x - rect.left,
		y: pendingMove.y - rect.top,
		buttons: pendingMove.buttons,
		width: rect.width,
		height: rect.height,
	})
	pendingMove = null
}

function onPointerMove(event: PointerEvent) {
	if (!loaded.value || !props.animated) return
	if (cardsSubscribed) {
		const card = (document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null)?.closest<HTMLElement>(CARD_SELECTOR)
		hoverCardId = card ? cardIdOf(card) : null
	}
	pendingMove = { x: event.clientX, y: event.clientY, buttons: event.buttons }
	if (!moveFrame) moveFrame = requestAnimationFrame(flushMove)
}

function onPointerButton(kind: 'down' | 'up') {
	return (event: PointerEvent) => {
		if (!loaded.value || !props.animated) return
		const rect = frame.value?.getBoundingClientRect()
		if (!rect) return
		post({
			type: 'pointer',
			kind,
			x: event.clientX - rect.left,
			y: event.clientY - rect.top,
			buttons: event.buttons,
			width: rect.width,
			height: rect.height,
		})
	}
}

const onPointerDown = onPointerButton('down')
const onPointerUp = onPointerButton('up')
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
	window.addEventListener('message', onWallpaperMessage)
	window.addEventListener('pointermove', onPointerMove, { passive: true })
	window.addEventListener('pointerdown', onPointerDown, { passive: true })
	window.addEventListener('pointerup', onPointerUp, { passive: true })
	if (frame.value) {
		resizeObserver = new ResizeObserver(sendSize)
		resizeObserver.observe(frame.value)
	}
})

onBeforeUnmount(() => {
	emit('layout', null)
	setCardsSubscription(false)
	window.removeEventListener('message', onWallpaperMessage)
	window.removeEventListener('pointermove', onPointerMove)
	window.removeEventListener('pointerdown', onPointerDown)
	window.removeEventListener('pointerup', onPointerUp)
	if (moveFrame) cancelAnimationFrame(moveFrame)
	resizeObserver?.disconnect()
})

watch(() => [props.animated, windowFocused.value, gameRunning.value, props.fpsLimit, props.volume], sendState)
watch(
	() => props.animated,
	(animated) => {
		if (!animated) resetCardTransforms()
	},
)
watch(() => props.accentColor, sendTheme)
watch(
	() => props.src,
	() => {
		loaded.value = false
		setCardsSubscription(false)
		emit('palette', '')
		emit('layout', null)
	},
)
</script>

<template>
	<iframe
		ref="frame"
		:key="src"
		:src="src"
		sandbox="allow-scripts"
		referrerpolicy="no-referrer"
		tabindex="-1"
		aria-hidden="true"
		title="ModLEX wallpaper"
		class="h-full w-full border-0 bg-transparent"
		:style="{ filter: `blur(${blurPx}px)`, colorScheme: 'light' }"
		@load="onLoad"
	/>
</template>
