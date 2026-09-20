import { onUnmounted, type Ref, watch } from 'vue'

/** Держит <video> в паузе, пока `shouldPlay` ложно, и играющим, пока истинно.
 * Помимо декларативного .play()/.pause() и @play-гарда (возвращаемого как
 * `onPlay`, повесь его на @play видео), добавлен интервальный сторож — на
 * всякий случай, если что-то ещё запускает видео в обход этой логики (браузерный
 * autoplay-тайминг, HMR и т.п.). */
export function useVideoPauseWatchdog(videoRef: Ref<HTMLVideoElement | null>, shouldPlay: Ref<boolean>) {
	function sync() {
		const video = videoRef.value
		if (!video) return
		if (shouldPlay.value) {
			video.play().catch(() => {})
		} else {
			video.pause()
		}
	}

	function onPlay() {
		if (!shouldPlay.value) videoRef.value?.pause()
	}

	let watchdog: number | undefined
	watch(
		shouldPlay,
		(playing) => {
			sync()
			if (watchdog) {
				clearInterval(watchdog)
				watchdog = undefined
			}
			if (!playing) {
				watchdog = window.setInterval(() => {
					const video = videoRef.value
					if (video && !video.paused) video.pause()
				}, 250)
			}
		},
		{ immediate: true },
	)
	watch(videoRef, (el) => {
		if (el) sync()
	})
	onUnmounted(() => {
		if (watchdog) clearInterval(watchdog)
	})

	return { onPlay }
}
