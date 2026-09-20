<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { onBeforeUnmount, ref, watch } from 'vue'

import { frameAt, type GifInfo, openGifDecoder, readGifInfo } from '@/helpers/gif-frames'

// GIF, нарисованный кадр за кадром на canvas: можно играть только отрезок [start, end] по кругу
// или показывать один выбранный кадр. Если декодер недоступен или файл не разобрался, шлёт
// `failed` — родитель возвращается к обычной <img>.
const props = withDefaults(
	defineProps<{
		url: string
		/** играть отрезок по кругу; иначе показывать один кадр */
		playing: boolean
		/** начало отрезка, с */
		start?: number
		/** конец отрезка, с; 0 — до конца */
		end?: number
		/** какой момент показывать, когда не играет, с; отрицательное — начало отрезка */
		stillAt?: number
		maxSize?: number
	}>(),
	{ start: 0, end: 0, stillAt: -1, maxSize: 1920 },
)

const emit = defineEmits<{ failed: [] }>()

const canvas = ref<HTMLCanvasElement | null>(null)
let decoder: any = null
let info: GifInfo | null = null
let generation = 0
let timer: ReturnType<typeof setTimeout> | undefined

function stop() {
	generation++
	if (timer) clearTimeout(timer)
	timer = undefined
}

async function drawFrame(index: number) {
	const target = canvas.value
	if (!decoder || !target || !info) return
	const { image } = await decoder.decode({ frameIndex: index, completeFramesOnly: true })
	try {
		const scale = Math.min(1, props.maxSize / Math.max(info.width, info.height))
		const width = Math.max(1, Math.round(info.width * scale))
		const height = Math.max(1, Math.round(info.height * scale))
		if (target.width !== width || target.height !== height) {
			target.width = width
			target.height = height
		}
		target.getContext('2d')?.drawImage(image, 0, 0, width, height)
	} finally {
		image.close()
	}
}

function range() {
	if (!info) return { first: 0, last: 0 }
	const first = frameAt(info, props.start)
	const last = props.end > 0 ? Math.max(first, frameAt(info, props.end)) : info.frameCount - 1
	return { first, last }
}

async function sync() {
	stop()
	const current = generation
	if (!decoder || !info) return
	try {
		if (!props.playing) {
			await drawFrame(props.stillAt >= 0 ? frameAt(info, props.stillAt) : range().first)
			return
		}
		const { first, last } = range()
		let index = first
		const step = async () => {
			if (current !== generation || !info) return
			const startedAt = performance.now()
			await drawFrame(index)
			if (current !== generation || !info) return
			const duration = info.starts[index + 1] !== undefined
				? info.starts[index + 1] - info.starts[index]
				: info.totalMs - info.starts[index]
			index = index >= last ? first : index + 1
			timer = setTimeout(step, Math.max(0, duration - (performance.now() - startedAt)))
		}
		await step()
	} catch {
		emit('failed')
	}
}

async function load() {
	stop()
	decoder?.close?.()
	decoder = null
	info = null
	const current = generation
	try {
		const opened = await openGifDecoder(props.url)
		const loaded = await readGifInfo(props.url, opened)
		if (current !== generation) {
			opened.close?.()
			return
		}
		decoder = opened
		info = loaded
		await sync()
	} catch {
		emit('failed')
	}
}

watch(() => props.url, load, { immediate: true })
watch(() => [props.playing, props.start, props.end, props.stillAt], sync)
onBeforeUnmount(() => {
	stop()
	decoder?.close?.()
	decoder = null
})
</script>

<template>
	<canvas ref="canvas" class="size-full object-cover" />
</template>
