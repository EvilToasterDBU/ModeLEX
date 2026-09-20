import { onUnmounted, type Ref, watch } from 'vue'

/** Зацикливает видео на отрезке [start, end] (end = 0 — до конца файла).
 * Нативный `loop` тут не годится: он всегда возвращает в 0, поэтому при активной
 * обрезке `loop` у видео нужно отключить, а возврат на start делаем сами. */
export function useVideoTrim(
	videoRef: Ref<HTMLVideoElement | null>,
	start: Ref<number>,
	end: Ref<number>,
	active: Ref<boolean>,
) {
	let detach: (() => void) | undefined

	function rewind(video: HTMLVideoElement) {
		try {
			video.currentTime = start.value
		} catch {
			// метаданные ещё не загружены — вернёмся на loadedmetadata
		}
	}

	function attach(video: HTMLVideoElement) {
		let frameHandle = 0
		const check = () => {
			if (!active.value) return
			const limit = end.value > 0 ? Math.min(end.value, video.duration || end.value) : video.duration
			if (video.currentTime < start.value - 0.05 || (limit && video.currentTime >= limit - 0.02)) {
				rewind(video)
				if (!video.paused) video.play().catch(() => {})
			}
		}
		// requestVideoFrameCallback точен до кадра; timeupdate (~4 Гц) — запасной путь
		const useFrameCallback = typeof (video as any).requestVideoFrameCallback === 'function'
		const frameLoop = () => {
			check()
			frameHandle = (video as any).requestVideoFrameCallback(frameLoop)
		}
		const onLoaded = () => {
			if (active.value) rewind(video)
		}
		video.addEventListener('loadedmetadata', onLoaded)
		video.addEventListener('ended', check)
		if (useFrameCallback) frameHandle = (video as any).requestVideoFrameCallback(frameLoop)
		else video.addEventListener('timeupdate', check)
		if (video.readyState >= 1) onLoaded()
		detach = () => {
			video.removeEventListener('loadedmetadata', onLoaded)
			video.removeEventListener('ended', check)
			video.removeEventListener('timeupdate', check)
			if (useFrameCallback && frameHandle) (video as any).cancelVideoFrameCallback(frameHandle)
		}
	}

	watch(
		videoRef,
		(video) => {
			detach?.()
			detach = undefined
			if (video) attach(video)
		},
		{ immediate: true },
	)
	// при смене границ — сразу перейти в новый отрезок
	watch([start, end], () => {
		const video = videoRef.value
		if (video && active.value) rewind(video)
	})
	onUnmounted(() => detach?.())
}
