<script setup lang="ts">
import { ChevronDownIcon, RefreshCwIcon } from '@modrinth/assets'
import {
	injectNotificationManager,
	injectPopupNotificationManager,
	TeleportOverflowMenu,
} from '@modrinth/ui'
import { computed, inject, ref } from 'vue'

import { detectModrinthApp, importModrinthInstances } from '@/helpers/modlex-modrinth-sync'

// Кнопка «Синхронизация с Modrinth» с двумя вариантами: перенести все инстансы сразу или выбрать
// нужные (открывает окно импорта). Повторный запуск не создаёт дубликатов.
const { handleError } = injectNotificationManager()
const popup = injectPopupNotificationManager()
const showImportModal = inject<() => void>('showImportModal')

const busy = ref(false)

async function syncAll() {
	if (busy.value) return
	busy.value = true
	try {
		const detection = await detectModrinthApp()
		if (!detection) {
			popup.addPopupNotification({
				contentType: 'standard',
				title: 'Modrinth App не найден',
				text: 'Не нашли установленный Modrinth App с инстансами. Если он лежит в другом месте, выбери «Выбрать инстансы» и укажи папку вручную.',
				type: 'info',
			})
			return
		}
		if (detection.fresh.length === 0) {
			popup.addPopupNotification({
				contentType: 'standard',
				title: 'Уже всё синхронизировано',
				text: `Все ${detection.instances.length} инстансов из Modrinth App уже есть в ModLEX.`,
				type: 'success',
			})
			return
		}
		popup.addPopupNotification({
				contentType: 'standard',
			title: 'Синхронизация началась',
			text: `Переносим ${detection.fresh.length} инстансов из Modrinth App — они появятся в списке по мере готовности.`,
			type: 'info',
		})
		const result = await importModrinthInstances(detection.path, detection.fresh)
		popup.addPopupNotification({
				contentType: 'standard',
			title: 'Перенос запущен',
			text:
				`Запущено: ${result.imported.length}. Инстансы появятся в списке, когда копирование закончится.` +
				(result.failed.length ? ` Не удалось: ${result.failed.join(', ')}.` : ''),
			type: result.failed.length ? 'info' : 'success',
		})
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
	}
}

const options = computed(() => [
	{ id: 'all', label: 'Перенести все инстансы сразу', action: syncAll, disabled: busy.value },
	{ id: 'select', label: 'Выбрать инстансы…', action: () => showImportModal?.() },
])
</script>

<template>
	<TeleportOverflowMenu
		label="Синхронизация с Modrinth"
		:options="options"
		:icon-only="false"
		:circular="false"
		:disabled="busy"
	>
		<RefreshCwIcon :class="{ 'animate-spin': busy }" />
		Синхронизация с Modrinth
		<ChevronDownIcon />
	</TeleportOverflowMenu>
</template>
