import { onBeforeUnmount, onMounted, ref } from 'vue'

import { useAppEvent } from '@/composables/use-app-event'
import { get_all } from '@/helpers/process'
import type { AppEvents } from '@/providers/app-events'

/** Активно ли окно лаунчера и идёт ли игра. Нужно слоям фона, чтобы не играть звук/анимацию,
 * пока пользователь в игре или в другом окне. */
/** `events` нужно передать явно, когда вызываешь из самого App.vue: он сам создаёт провайдер событий, и
 * inject из корневого компонента его не увидит (бросает при монтировании — окно не открывается). */
export function useLauncherActivity(events?: AppEvents) {
	const windowFocused = ref(true)
	const gameRunning = ref(false)

	const onFocus = () => {
		windowFocused.value = true
	}
	const onBlur = () => {
		windowFocused.value = false
	}

	async function refreshGameRunning() {
		const processes = await get_all().catch(() => [])
		gameRunning.value = Array.isArray(processes) && processes.length > 0
	}

	useAppEvent('process', refreshGameRunning, events)

	onMounted(() => {
		window.addEventListener('focus', onFocus)
		window.addEventListener('blur', onBlur)
		windowFocused.value = document.hasFocus()
		void refreshGameRunning()
	})
	onBeforeUnmount(() => {
		window.removeEventListener('focus', onFocus)
		window.removeEventListener('blur', onBlur)
	})

	return { windowFocused, gameRunning }
}
