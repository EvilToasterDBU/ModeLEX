import { ref, watch } from 'vue'

// Per-device list of instance IDs hidden from the Home page (Jump in + Library).
// Frontend-only (localStorage), mirroring the existing per-world "hide from home"
// mechanism (see set_world_display_status) but without needing a DB migration.
const STORAGE_KEY = 'modlex_home_hidden_instances'

function readStored(): Set<string> {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return new Set()
		const parsed = JSON.parse(raw)
		return Array.isArray(parsed) ? new Set(parsed) : new Set()
	} catch {
		return new Set()
	}
}

export const homeHiddenInstanceIds = ref<Set<string>>(readStored())

watch(homeHiddenInstanceIds, (value) => {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...value]))
	} catch {
		// localStorage unavailable/quota exceeded — hidden state just won't persist
	}
})

export function isInstanceHiddenFromHome(instanceId: string): boolean {
	return homeHiddenInstanceIds.value.has(instanceId)
}

export function hideInstanceFromHome(instanceId: string) {
	if (homeHiddenInstanceIds.value.has(instanceId)) return
	homeHiddenInstanceIds.value = new Set(homeHiddenInstanceIds.value).add(instanceId)
}

export function showInstanceOnHome(instanceId: string) {
	if (!homeHiddenInstanceIds.value.has(instanceId)) return
	const next = new Set(homeHiddenInstanceIds.value)
	next.delete(instanceId)
	homeHiddenInstanceIds.value = next
}
