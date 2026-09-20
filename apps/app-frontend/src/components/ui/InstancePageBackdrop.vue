<script setup lang="ts">
import { computed } from 'vue'

import CustomizationImage from '@/components/ui/CustomizationImage.vue'
import { useLauncherActivity } from '@/composables/use-launcher-activity'
import type { PageCustomization } from '@/helpers/instance'

// Оформление страницы инстанса из настроек автора, две независимые части:
//  - `banner` кладётся первым ребёнком шапки страницы (у шапки `relative z-[1]`) и занимает ровно её;
//  - `background` кладётся первым ребёнком корня страницы (`relative`, контент выше через z-[1]).
// Обе обрезаются по скруглённому левому верхнему углу панели. Анимации замирают, когда окно
// неактивно или идёт игра, и не играют при выключенных анимациях.
const props = defineProps<{
	page: PageCustomization | null
	part: 'banner' | 'background' | 'overlay'
	src: (path: string | null | undefined) => string | null
	animations: boolean
	/** Курсор над шапкой страницы — для режима «при наведении» */
	hovered: boolean
}>()

const { windowFocused, gameRunning } = useLauncherActivity()

const asset = computed(() =>
	props.src(
		props.part === 'banner'
			? props.page?.banner
			: props.part === 'overlay'
				? props.page?.overlay
				: props.page?.background,
	),
)
const focus = computed(() => {
	const value =
		props.part === 'banner'
			? props.page?.bannerFocus
			: props.part === 'overlay'
				? props.page?.overlayFocus
				: props.page?.backgroundFocus
	return value ? `${value[0] * 100}% ${value[1] * 100}%` : undefined
})
const zoom = computed(() =>
	props.part === 'banner'
		? props.page?.bannerZoom
		: props.part === 'overlay'
			? props.page?.overlayZoom
			: props.page?.backgroundZoom,
)
const live = computed(() => {
	if (!props.animations || !windowFocused.value || gameRunning.value) return false
	if (props.page?.animate === 'always') return true
	return props.page?.animate === 'hover' && props.hovered
})

// затемнение: у баннера — слева (там название) и плавный переход вниз, у фона — ровная вуаль
const veil = computed(() =>
	props.part === 'overlay'
		? 'transparent'
		: props.part === 'banner'
		? 'linear-gradient(to bottom, transparent 60%, var(--color-bg)), linear-gradient(to right, color-mix(in srgb, var(--color-bg) 78%, transparent), color-mix(in srgb, var(--color-bg) 22%, transparent) 65%, color-mix(in srgb, var(--color-bg) 45%, transparent))'
		: 'color-mix(in srgb, var(--color-bg) 82%, transparent)',
)
</script>

<template>
	<div
		v-if="asset"
		class="pointer-events-none absolute inset-0 overflow-hidden rounded-tl-[var(--radius-xl)]"
		:class="part === 'banner' ? '-z-10' : part === 'overlay' ? 'z-[2]' : 'z-0'"
		:style="part === 'overlay' ? { opacity: page?.overlayOpacity ?? 1 } : undefined"
		aria-hidden="true"
	>
		<CustomizationImage
			:src="asset"
			:live="live"
			:position="focus"
			:zoom="zoom"
			:max-size="part === 'background' ? 1600 : 1920"
		/>
		<div v-if="part !== 'overlay'" class="absolute inset-0" :style="{ background: veil }" />
	</div>
</template>
