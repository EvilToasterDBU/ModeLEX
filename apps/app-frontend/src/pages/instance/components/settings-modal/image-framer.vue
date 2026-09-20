<script setup lang="ts">
import { Button, Slider } from '@modrinth/ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

// Редактор кадра как у аватарки в мессенджерах: картинка лежит в рамке с реальными пропорциями того
// места, где она будет показана, её можно таскать мышью и приближать. Поверх — упрощённый макет
// интерфейса (название, кнопки), чтобы было видно, что закроется. Математика совпадает с показом
// в лаунчере (object-fit: cover + object-position + масштаб вокруг той же точки).
const props = defineProps<{
	/** Готовый URL картинки (с версией) */
	src: string | null
	/** Ширина / высота рамки */
	aspect: number
	focus: [number, number] | null
	zoom: number | null
	mock: 'strip' | 'banner' | 'card' | 'background'
	hint?: string
	/** Режим слоя поверх: макет интерфейса лежит под картинкой, без затемнения */
	overlay?: boolean
	/** Непрозрачность слоя (для режима overlay) */
	opacity?: number
}>()

const emit = defineEmits<{
	commit: [value: { focus: [number, number]; zoom: number }]
}>()

const frame = ref<HTMLElement | null>(null)
const natural = ref<{ width: number; height: number } | null>(null)
const draftFocus = ref<[number, number]>(props.focus ?? [0.5, 0.5])
const draftZoom = ref(props.zoom ?? 1)
const dragging = ref(false)

watch(
	() => [props.focus, props.zoom, props.src] as const,
	() => {
		if (dragging.value) return
		draftFocus.value = props.focus ?? [0.5, 0.5]
		draftZoom.value = props.zoom ?? 1
	},
)
watch(
	() => props.src,
	() => {
		natural.value = null
	},
)

const clamp = (value: number) => Math.min(1, Math.max(0, value))
const position = computed(() => `${draftFocus.value[0] * 100}% ${draftFocus.value[1] * 100}%`)
const imageStyle = computed(() => ({
	objectPosition: position.value,
	transform: draftZoom.value > 1 ? `scale(${draftZoom.value})` : undefined,
	transformOrigin: position.value,
}))
const isDefault = computed(
	() => draftFocus.value[0] === 0.5 && draftFocus.value[1] === 0.5 && draftZoom.value === 1,
)

function commit() {
	emit('commit', { focus: [...draftFocus.value] as [number, number], zoom: draftZoom.value })
}

let start = { x: 0, y: 0, fx: 0.5, fy: 0.5 }
function onPointerDown(event: PointerEvent) {
	if (!props.src || !natural.value || event.button !== 0) return
	dragging.value = true
	;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
	start = { x: event.clientX, y: event.clientY, fx: draftFocus.value[0], fy: draftFocus.value[1] }
}
function onPointerMove(event: PointerEvent) {
	if (!dragging.value || !frame.value || !natural.value) return
	const rect = frame.value.getBoundingClientRect()
	const cover = Math.max(rect.width / natural.value.width, rect.height / natural.value.height)
	const overflowX = natural.value.width * cover * draftZoom.value - rect.width
	const overflowY = natural.value.height * cover * draftZoom.value - rect.height
	// картинка едет за курсором: сдвиг вправо = точка фокуса уходит влево
	const fx = overflowX > 1 ? clamp(start.fx - (event.clientX - start.x) / overflowX) : start.fx
	const fy = overflowY > 1 ? clamp(start.fy - (event.clientY - start.y) / overflowY) : start.fy
	draftFocus.value = [fx, fy]
}
function onPointerUp() {
	if (!dragging.value) return
	dragging.value = false
	commit()
}

let zoomTimer: ReturnType<typeof setTimeout> | undefined
function onZoom(percent: number) {
	draftZoom.value = percent / 100
	if (zoomTimer) clearTimeout(zoomTimer)
	zoomTimer = setTimeout(commit, 350)
}
onBeforeUnmount(() => {
	if (zoomTimer) clearTimeout(zoomTimer)
})

function reset() {
	draftFocus.value = [0.5, 0.5]
	draftZoom.value = 1
	commit()
}

function onLoad(event: Event) {
	const image = event.target as HTMLImageElement
	natural.value = { width: image.naturalWidth, height: image.naturalHeight }
}
</script>

<template>
	<div class="flex flex-col gap-2">
		<div
			ref="frame"
			class="relative w-full touch-none select-none overflow-hidden rounded-xl border border-solid border-surface-4 bg-bg"
			:class="src ? (dragging ? 'cursor-grabbing' : 'cursor-grab') : ''"
			:style="{ aspectRatio: String(aspect) }"
			@pointerdown="onPointerDown"
			@pointermove="onPointerMove"
			@pointerup="onPointerUp"
			@pointercancel="onPointerUp"
		>
			<img
				v-if="src"
				:src="src"
				alt=""
				draggable="false"
				class="pointer-events-none size-full object-cover"
				:class="overlay ? 'absolute inset-0 z-[2]' : ''"
				:style="{ ...imageStyle, opacity: overlay ? (opacity ?? 1) : undefined }"
				@load="onLoad"
			/>
			<div v-else class="flex size-full items-center justify-center text-xs text-secondary">
				Нет картинки
			</div>

			<!-- макет интерфейса поверх картинки -->
			<div v-if="src" class="pointer-events-none absolute inset-0">
				<template v-if="mock === 'strip' || mock === 'banner'">
					<div
						v-if="!overlay"
						class="absolute inset-0"
						:style="{
							background:
								'linear-gradient(to right, color-mix(in srgb, var(--color-raised-bg) 85%, transparent), color-mix(in srgb, var(--color-raised-bg) 25%, transparent) 60%, color-mix(in srgb, var(--color-raised-bg) 55%, transparent))',
						}"
					/>
					<div class="absolute inset-0 flex items-center gap-2 px-3">
						<div
							class="shrink-0 rounded-xl bg-surface-4"
							:class="mock === 'banner' ? 'size-10' : 'size-8'"
						/>
						<div class="flex flex-col gap-1">
							<div class="h-2 w-24 rounded bg-contrast opacity-70" />
							<div class="h-1.5 w-16 rounded bg-secondary opacity-60" />
						</div>
						<div class="ml-auto h-5 w-14 rounded-lg bg-brand opacity-80" />
					</div>
				</template>
				<template v-else-if="mock === 'card'">
					<div
						v-if="!overlay"
						class="absolute inset-0"
						:style="{
							background:
								'linear-gradient(to top, color-mix(in srgb, var(--color-raised-bg) 92%, transparent), color-mix(in srgb, var(--color-raised-bg) 45%, transparent) 60%, transparent)',
						}"
					/>
					<div class="absolute inset-x-[8%] top-[6%] aspect-square rounded-2xl bg-surface-4 opacity-80" />
					<div class="absolute inset-x-[8%] bottom-[6%] flex flex-col gap-1">
						<div class="h-2 w-3/4 rounded bg-contrast opacity-70" />
						<div class="h-1.5 w-1/2 rounded bg-secondary opacity-60" />
					</div>
				</template>
				<template v-else>
					<div
						v-if="!overlay"
						class="absolute inset-0"
						:style="{ background: 'color-mix(in srgb, var(--color-bg) 82%, transparent)' }"
					/>
					<div class="absolute inset-x-[4%] top-[6%] flex items-center gap-2">
						<div class="size-6 rounded-lg bg-surface-4" />
						<div class="h-2 w-20 rounded bg-contrast opacity-70" />
					</div>
					<div class="absolute inset-x-[4%] top-[30%] flex flex-col gap-2">
						<div class="h-6 rounded-lg bg-surface-4 opacity-70" />
						<div class="h-6 rounded-lg bg-surface-4 opacity-70" />
						<div class="h-6 rounded-lg bg-surface-4 opacity-70" />
					</div>
				</template>
			</div>
		</div>
		<div class="flex items-center gap-3">
			<span class="shrink-0 text-xs text-secondary">Масштаб</span>
			<div class="w-56">
				<Slider
					:model-value="Math.round(draftZoom * 100)"
					:min="100"
					:max="300"
					:step="10"
					unit="%"
					:disabled="!src"
					@update:model-value="onZoom"
				/>
			</div>
			<Button
				v-if="src && !isDefault"
				type="outlined"
				size="sm"
				native-type="button"
				@click="reset"
			>
				Сбросить
			</Button>
		</div>
		<p v-if="hint" class="m-0 text-xs text-secondary">{{ hint }}</p>
	</div>
</template>
