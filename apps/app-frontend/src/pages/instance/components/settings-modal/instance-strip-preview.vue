<script setup lang="ts">
import { PlayIcon } from '@modrinth/assets'
import { Avatar, Button } from '@modrinth/ui'
import { computed, ref } from 'vue'

import InstanceFaceBackdrop from '@/components/ui/InstanceFaceBackdrop.vue'
import InstanceFaceOverlay from '@/components/ui/InstanceFaceOverlay.vue'
import { getInstanceIconUrl } from '@/helpers/instance'
import { useInstanceCustomization } from '@/helpers/modlex-instance-customization'
import type { GameInstance } from '@/helpers/types'

// Копия разметки полоски «Jump in» (world/InstanceItem.vue) для предпросмотра в редакторе: тот же
// фон оформления, размеры и отступы, но без переходов и запуска. Всегда показывает оформление,
// независимо от пользовательских настроек «Оформление от авторов».
const props = defineProps<{
	instance: GameInstance
	forceHovered?: boolean
}>()

const { customization, animations, src } = useInstanceCustomization(() => props.instance.id, {
	force: true,
})
const face = computed(() => customization.value?.header ?? null)
const hovered = ref(false)
const shownHovered = computed(() => hovered.value || !!props.forceHovered)
</script>

<template>
	<div
		class="relative isolate grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[20px] border border-solid border-surface-4 bg-bg-raised p-3"
		:class="{ 'overflow-hidden': face }"
		:style="shownHovered && face?.accent ? { borderColor: face.accent } : undefined"
		@mouseenter="hovered = true"
		@mouseleave="hovered = false"
	>
		<InstanceFaceBackdrop
			:face="face"
			:src="src"
			:animations="animations"
			:hovered="shownHovered"
			variant="strip"
			:max-size="900"
		/>
		<Avatar
			:src="getInstanceIconUrl(instance.icon_path)"
			:tint-by="instance.id"
			no-shadow
			class="relative z-[1] !rounded-[14px]"
			size="48px"
		/>
		<div class="relative z-[1] flex min-w-0 flex-col gap-1">
			<div class="truncate text-base font-semibold text-contrast">{{ instance.name }}</div>
			<div class="truncate text-sm capitalize text-secondary">
				{{ instance.loader }} {{ instance.game_version }}
			</div>
		</div>
		<div class="relative z-[1]">
			<Button type="colored" color="brand" disabled><PlayIcon aria-hidden="true" /> Play</Button>
		</div>
		<InstanceFaceOverlay
			:face="face"
			:src="src"
			:animations="animations"
			:hovered="shownHovered"
			:max-size="900"
		/>
	</div>
</template>
