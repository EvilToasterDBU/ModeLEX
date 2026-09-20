import { reactive } from 'vue'

// Подсказки, которые человек закрыл крестиком. Хранится в localStorage, вернуть можно в настройках
// ModLEX («Уведомления» → «Показать скрытые подсказки»).
const KEY = 'modlex_dismissed_hints'

export type HintId = 'onboarding-checklist' | 'offline-multiplayer-quirk'

function read(): Record<string, boolean> {
	try {
		const parsed = JSON.parse(localStorage.getItem(KEY) ?? '{}')
		return parsed && typeof parsed === 'object' ? parsed : {}
	} catch {
		return {}
	}
}

const state = reactive<Record<string, boolean>>(read())

function persist() {
	try {
		localStorage.setItem(KEY, JSON.stringify(state))
	} catch {
		// localStorage недоступен — подсказка вернётся после перезапуска
	}
}

export function isHintDismissed(id: HintId): boolean {
	return state[id] === true
}

export function dismissHint(id: HintId) {
	state[id] = true
	persist()
}

export function resetDismissedHints() {
	for (const key of Object.keys(state)) delete state[key]
	persist()
}
