<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { isPossiblyAnimated } from '@/helpers/modlex-instance-customization'

// Картинка оформления. `live` — играть анимацию; иначе GIF/APNG/WebP рисуются одним кадром на
// canvas (без лагов в длинных списках). Обычные png/jpg всегда показываются как есть.
const props = withDefaults(
	defineProps<{
		src: string
		live?: boolean
		/** CSS object-position, например «50% 30%» */
		position?: string
		/** Масштаб 1..3 вокруг той же точки, что и position */
		zoom?: number | null
		/** Больший размер стороны замороженного кадра, px (экономит память в списках) */
		maxSize?: number
	}>(),
	{ live: false, position: undefined, zoom: null, maxSize: 640 },
)

const frameStyle = computed(() => ({
	objectPosition: props.position,
	transform: props.zoom && props.zoom > 1 ? `scale(${props.zoom})` : undefined,
	transformOrigin: props.position ?? '50% 50%',
}))
const needsCanvas = computed(() => !props.live && isPossiblyAnimated(props.src))
const canvas = ref<HTMLCanvasElement | null>(null)
let drawToken = 0

async function drawFrozenFrame() {
	if (!needsCanvas.value || !canvas.value) return
	const token = ++drawToken
	const image = new Image()
	image.decoding = 'async'
	image.src = props.src
	try {
		await image.decode()
	} catch {
		return
	}
	const target = canvas.value
	if (token !== drawToken || !target || !image.naturalWidth) return
	const scale = Math.min(1, props.maxSize / Math.max(image.naturalWidth, image.naturalHeight))
	target.width = Math.max(1, Math.round(image.naturalWidth * scale))
	target.height = Math.max(1, Math.round(image.naturalHeight * scale))
	target.getContext('2d')?.drawImage(image, 0, 0, target.width, target.height)
}

watch([() => props.src, needsCanvas, canvas], drawFrozenFrame, { flush: 'post', immediate: true })
</script>

<template>
	<img
		v-if="!needsCanvas"
		:src="src"
		alt=""
		draggable="false"
		class="size-full object-cover"
		:style="frameStyle"
	/>
	<canvas v-else ref="canvas" class="size-full object-cover" :style="frameStyle" />
</template>
