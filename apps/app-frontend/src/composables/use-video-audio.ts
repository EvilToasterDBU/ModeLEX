import { computed, onBeforeUnmount, type Ref, watch } from 'vue'

/** Громкость видео-обоев. Видео стартует без звука (иначе автовоспроизведение блокируется), а
 * звук включается, когда он нужен (`audible`, громкость > 0) и пользователь уже хоть раз
 * взаимодействовал с окном — разблокировать звук до этого браузер не даёт и ставит видео на паузу. */
export function useVideoAudio(
	videoRef: Ref<HTMLVideoElement | null>,
	volume: Ref<number>,
	audible: Ref<boolean>,
) {
	const wantSound = computed(() => audible.value && volume.value > 0)

	function apply() {
		const video = videoRef.value
		if (!video) return
		video.volume = Math.min(1, Math.max(0, volume.value))
		if (!wantSound.value) {
			video.muted = true
			return
		}
		if (navigator.userActivation?.hasBeenActive ?? true) video.muted = false
	}

	// до первого действия пользователя звук не включить — ждём его и повторяем
	const onActivate = () => apply()
	window.addEventListener('pointerdown', onActivate, { passive: true })
	window.addEventListener('keydown', onActivate, { passive: true })
	onBeforeUnmount(() => {
		window.removeEventListener('pointerdown', onActivate)
		window.removeEventListener('keydown', onActivate)
	})

	watch([videoRef, wantSound, volume], apply, { immediate: true, flush: 'post' })
}
