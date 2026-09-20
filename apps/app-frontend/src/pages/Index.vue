<script setup lang="ts">
import { EyeIcon, EyeOffIcon, PlayIcon, PlusIcon } from '@modrinth/assets'
import { Button, defineMessages, injectNotificationManager, useVIntl } from '@modrinth/ui'
import dayjs from 'dayjs'
import { computed, inject, onActivated, ref } from 'vue'

import ContextMenu from '@/components/ui/context-menu/index.vue'
import LibrarySection from '@/components/ui/library/index.vue'
import WelcomeScreen from '@/components/ui/WelcomeScreen.vue'
import RecentWorldsList from '@/components/ui/world/RecentWorldsList.vue'
import { useAppEvent } from '@/composables/use-app-event'
import { useAppSettings } from '@/composables/use-app-settings.ts'
import { toError } from '@/helpers/errors'
import { list } from '@/helpers/instance'
import {
	modlexHomeShowJumpInEff,
	modlexHomeShowLibraryEff,
} from '@/helpers/modlex-settings'
import {
	homeHiddenInstanceIds,
	showInstanceOnHome,
} from '@/helpers/modlex-home-hidden-instances'
import type { GameInstance } from '@/helpers/types'
import { useRootBreadcrumb } from '@/providers/breadcrumbs'
import { injectOnboardingChecklist } from '@/providers/onboarding-checklist'

defineOptions({
	name: 'LibraryPage',
})

const { handleError } = injectNotificationManager()
const { formatMessage } = useVIntl()
const { hasCreatedInstance, isReady } = injectOnboardingChecklist()
const showCreationModal = inject<() => void>('showCreationModal')
const pageOptions = ref<InstanceType<typeof ContextMenu>>()
const appSettings = useAppSettings()

const messages = defineMessages({
	home: {
		id: 'app.navigation.home',
		defaultMessage: 'Home',
	},
	newInstance: {
		id: 'app.library.context-menu.create-instance',
		defaultMessage: 'New instance',
	},
	hiddenFromHomeToggle: {
		id: 'app.home.modlex-hidden-from-home-toggle',
		defaultMessage: '{count} hidden from Home',
	},
	showOnHome: {
		id: 'app.home.modlex-show-on-home',
		defaultMessage: 'Show',
	},
})

const homeBreadcrumb = useRootBreadcrumb({
	slot: 'root',
	id: 'home',
	label: formatMessage(messages.home),
	to: '/',
	visual: { type: 'icon', component: PlayIcon },
})
onActivated(homeBreadcrumb.reset)

const instances = ref<GameInstance[]>([])
let latestInstanceFetch = 0

// ===== MODLEX: скрытие отдельных инстансов с главной =====
const homeVisibleInstances = computed(() =>
	instances.value.filter((instance) => !homeHiddenInstanceIds.value.has(instance.id)),
)
const homeHiddenInstancesList = computed(() =>
	instances.value.filter((instance) => homeHiddenInstanceIds.value.has(instance.id)),
)
const showHiddenInstancesPanel = ref(false)
// ===== /MODLEX =====

const recentInstances = computed(() =>
	homeVisibleInstances.value
		.slice()
		.sort((a, b) => dayjs(b.last_played ?? b.created).diff(dayjs(a.last_played ?? a.created))),
)

async function fetchInstances() {
	const fetchId = ++latestInstanceFetch
	try {
		const nextInstances = await list()
		if (fetchId === latestInstanceFetch) {
			instances.value = nextInstances
		}
	} catch (error: unknown) {
		if (fetchId === latestInstanceFetch) {
			handleError(toError(error))
		}
	}
}

if (hasCreatedInstance.value) {
	await fetchInstances()
}

useAppEvent('instance', fetchInstances)
useAppEvent('instance_groups_changed', fetchInstances)

function openPageContextMenu(event: MouseEvent) {
	if (
		!(event.target instanceof HTMLElement) ||
		!event.target.hasAttribute('data-library-page-background')
	) {
		return
	}

	event.preventDefault()
	event.stopPropagation()
	pageOptions.value?.showMenu(event, {}, [{ name: 'new_instance' }])
}

function handlePageOption({ option }: { option: string }) {
	if (option === 'new_instance') {
		showCreationModal?.()
	}
}
</script>

<template>
	<WelcomeScreen v-if="isReady && !hasCreatedInstance" />
	<div
		v-else-if="isReady"
		data-library-page-background
		data-modlex-home
		class="flex min-h-full flex-col gap-3 p-6"
		@contextmenu="openPageContextMenu"
	>
		<RecentWorldsList
			v-if="
			modlexHomeShowJumpInEff &&
			recentInstances?.length > 0 &&
			appSettings.getFeatureFlag('worlds_in_home')
		"
			:recent-instances="recentInstances"
		/>
		<LibrarySection v-if="modlexHomeShowLibraryEff" :instances="homeVisibleInstances" />

		<!-- ===== MODLEX: список скрытых с главной инстансов ===== -->
		<div
			v-if="homeHiddenInstancesList.length > 0"
			class="mt-auto flex flex-col gap-2 pt-4 opacity-40 transition-opacity duration-150 hover:opacity-100"
			:class="{ '!opacity-100': showHiddenInstancesPanel }"
		>
			<button
				type="button"
				class="flex w-fit cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm text-secondary hover:text-primary"
				@click="showHiddenInstancesPanel = !showHiddenInstancesPanel"
			>
				<EyeOffIcon aria-hidden="true" class="size-4" />
				{{
					formatMessage(messages.hiddenFromHomeToggle, { count: homeHiddenInstancesList.length })
				}}
			</button>
			<div
				v-if="showHiddenInstancesPanel"
				class="flex flex-col gap-1 rounded-2xl border border-solid border-surface-4 bg-bg-raised p-2"
			>
				<div
					v-for="instance in homeHiddenInstancesList"
					:key="instance.id"
					class="flex items-center gap-2 rounded-xl px-2 py-1.5"
				>
					<span class="flex-1 truncate text-sm text-primary">{{ instance.name }}</span>
					<Button size="sm" @click="showInstanceOnHome(instance.id)">
						<EyeIcon aria-hidden="true" />
						{{ formatMessage(messages.showOnHome) }}
					</Button>
				</div>
			</div>
		</div>
		<!-- ===== /MODLEX ===== -->

		<ContextMenu ref="pageOptions" @option-clicked="handlePageOption">
			<template #new_instance> <PlusIcon /> {{ formatMessage(messages.newInstance) }} </template>
		</ContextMenu>
	</div>
</template>
