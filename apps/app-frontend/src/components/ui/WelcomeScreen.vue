<script setup lang="ts">
import { ImportIcon, PlusIcon } from '@modrinth/assets'
import { Button, defineMessages, IntlFormatted, useVIntl } from '@modrinth/ui'
import { injectPopupNotificationManager } from '@modrinth/ui'
import { inject, onMounted, onUnmounted, ref } from 'vue'

import {
	detectModrinthApp,
	importModrinthInstances,
	type ModrinthDetection,
} from '@/helpers/modlex-modrinth-sync'

import modrinthSocialIcon from '../../assets/welcome/modrinth-social-icon.png'

const showCreationModal = inject<() => void>('showCreationModal')
const showImportModal = inject<() => void>('showImportModal')

const { formatMessage } = useVIntl()
const popup = injectPopupNotificationManager()

// Раньше сидел на Modrinth App? Предлагаем сразу перенести все его инстансы.
const modrinthDetection = ref<ModrinthDetection | null>(null)
const modrinthSyncing = ref(false)
async function syncModrinth() {
	const detection = modrinthDetection.value
	if (!detection || modrinthSyncing.value) return
	modrinthSyncing.value = true
	try {
		const result = await importModrinthInstances(detection.path, detection.fresh)
		popup.addPopupNotification({
				contentType: 'standard',
			title: 'Перенос запущен',
			text:
				`Запущено: ${result.imported.length}. Инстансы появятся в списке, когда копирование закончится.` +
				(result.failed.length ? ` Не удалось: ${result.failed.join(', ')}.` : ''),
			type: result.failed.length ? 'info' : 'success',
		})
		modrinthDetection.value = null
	} finally {
		modrinthSyncing.value = false
	}
}

const messages = defineMessages({
	welcomeTitle: {
		id: 'app.welcome-screen.title',
		defaultMessage: 'Welcome to ModLEX',
	},
	welcomeDescription: {
		id: 'app.welcome-screen.description',
		defaultMessage: 'Ready to start playing?',
	},
	createInstance: {
		id: 'app.welcome-screen.create-instance',
		defaultMessage: 'Create an instance',
	},
	quickCreateHint: {
		id: 'app.welcome-screen.quick-create-hint',
		defaultMessage: 'Press <shortcut>N</shortcut> to quick create an instance',
	},
	importPrompt: {
		id: 'app.welcome-screen.import-prompt',
		defaultMessage: 'Escaping another launcher?',
	},
	importFromLauncher: {
		id: 'app.welcome-screen.import-from-launcher',
		defaultMessage: 'Import from launcher',
	},
})

const offline = ref(!navigator.onLine)

function handleOffline() {
	offline.value = true
}

function handleOnline() {
	offline.value = false
}

function handleQuickCreate(event: KeyboardEvent) {
	const target = event.target as HTMLElement | null
	if (
		event.key.toLowerCase() !== 'n' ||
		event.repeat ||
		event.metaKey ||
		event.ctrlKey ||
		event.altKey ||
		target?.isContentEditable ||
		['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName ?? '')
	) {
		return
	}

	if (!offline.value) {
		event.preventDefault()
		showCreationModal?.()
	}
}

onMounted(async () => {
	modrinthDetection.value = await detectModrinthApp().catch(() => null)
	window.addEventListener('offline', handleOffline)
	window.addEventListener('online', handleOnline)
	window.addEventListener('keydown', handleQuickCreate)
})

onUnmounted(() => {
	window.removeEventListener('offline', handleOffline)
	window.removeEventListener('online', handleOnline)
	window.removeEventListener('keydown', handleQuickCreate)
})
</script>

<template>
	<div class="flex flex-col min-h-full px-6 pb-6 pt-16">
		<div class="relative flex grow items-center justify-center">
			<div class="relative isolate flex flex-col items-center gap-6">
				<div
					class="dot-pattern pointer-events-none absolute left-1/2 -top-52 -z-10 h-[29.875rem] w-[min(25.9375rem,80vw)] -translate-x-1/2 rounded-2xl [@media(max-height:700px)]:h-[23rem]"
					aria-hidden="true"
				/>
				<div class="size-[6.25rem]">
					<img :src="modrinthSocialIcon" alt="" class="pointer-events-none size-full" />
				</div>
				<div class="flex flex-col items-center gap-2">
					<h1 class="m-0 flex items-center gap-2 text-2xl font-semibold leading-8 text-contrast">
						{{ formatMessage(messages.welcomeTitle) }}
					</h1>
					<p class="m-0 text-center text-base leading-6 text-primary">
						{{ formatMessage(messages.welcomeDescription) }}
					</p>
				</div>
				<div class="flex w-72 flex-col items-center gap-4">
					<Button
						type="colored"
						color="brand"
						size="lg"
						class="!shadow-none"
						:disabled="offline"
						@click="showCreationModal?.()"
					>
						<PlusIcon />
						{{ formatMessage(messages.createInstance) }}
					</Button>
					<span class="flex items-center gap-1 text-sm leading-5 text-secondary">
						<IntlFormatted :message-id="messages.quickCreateHint">
							<template #shortcut="{ children }">
								<kbd
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-solid border-surface-5 bg-button-bg px-1 text-xs font-normal leading-4 text-primary"
								>
									<component :is="() => children" />
								</kbd>
							</template>
						</IntlFormatted>
					</span>
				</div>
			</div>
		</div>
		<div
			v-if="modrinthDetection && modrinthDetection.fresh.length > 0"
			class="mx-auto mb-6 flex max-w-md flex-col items-center gap-3 rounded-2xl border border-solid border-surface-5 bg-button-bg p-4 text-center"
		>
			<span class="text-base font-semibold text-contrast">
				Нашли Modrinth App: {{ modrinthDetection.fresh.length }} инстансов
			</span>
			<span class="text-sm text-secondary">
				Можно перенести их все сразу — миры, моды и настройки останутся как были.
			</span>
			<div class="flex flex-wrap justify-center gap-2">
				<Button type="colored" color="brand" :disabled="modrinthSyncing || offline" @click="syncModrinth">
					<ImportIcon />
					{{ modrinthSyncing ? 'Переносим…' : 'Синхронизировать все' }}
				</Button>
				<Button :disabled="modrinthSyncing || offline" @click="showImportModal?.()">
					Выбрать
				</Button>
			</div>
		</div>
		<div
			class="flex flex-col h-max items-center justify-end gap-4 text-sm leading-5 text-secondary"
		>
			<span class="whitespace-nowrap">{{ formatMessage(messages.importPrompt) }}</span>
			<Button size="lg" class="!font-medium" :disabled="offline" @click="showImportModal?.()">
				<ImportIcon />
				{{ formatMessage(messages.importFromLauncher) }}
			</Button>
		</div>
	</div>
</template>

<style scoped>
.dot-pattern {
	background-image: radial-gradient(
		circle,
		color-mix(in srgb, var(--color-text-primary) 25%, transparent) 0.5px,
		transparent 0.75px
	);
	background-size: 0.5625rem 0.5625rem;
	opacity: 0.8;
	-webkit-mask-image: radial-gradient(ellipse at center, black 10%, transparent 68%);
	mask-image: radial-gradient(ellipse at center, black 10%, transparent 68%);
	-webkit-mask-repeat: no-repeat;
	mask-repeat: no-repeat;
}
</style>
