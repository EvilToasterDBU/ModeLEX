<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import CustomizationImage from '@/components/ui/CustomizationImage.vue'
import type { FaceCustomization } from '@/helpers/instance'

// Фон карточки или полоски инстанса из оформления автора: картинка «в покое», поверх неё
// картинка/анимация «при наведении» (плавное появление) и затемнение под текст. Кладётся первым
// ребёнком в родителя с `relative`, остальное содержимое родителя должно быть выше (z-[1]).
const props = defineProps<{
	face: FaceCustomization | null
	src: (path: string | null | undefined) => string | null
	animations: boolean
	hovered: boolean
	maxSize?: number
	/** «card» — затемнение снизу (текст внизу); «strip» — слева направо (текст слева, кнопки справа) */
	variant?: 'card' | 'strip'
}>()

const rest = computed(() => props.src(props.face?.image))
const hoverSrc = computed(() =>
	props.face && props.face.animate !== 'never' ? props.src(props.face.hover) : null,
)
const always = computed(() => props.face?.animate === 'always')
const position = computed(() =>
	props.face?.focus ? `${props.face.focus[0] * 100}% ${props.face.focus[1] * 100}%` : undefined,
)

// слой «при наведении» монтируем только после первого наведения (или сразу, если он «всегда»)
const everHovered = ref(false)
watch(
	() => props.hovered,
	(value) => {
		if (value) everHovered.value = true
	},
	{ immediate: true },
)
const hoverVisible = computed(() => always.value || props.hovered)
const scrim = computed(() =>
	props.variant === 'strip'
		? 'linear-gradient(to right, color-mix(in srgb, var(--color-raised-bg) 88%, transparent), color-mix(in srgb, var(--color-raised-bg) 30%, transparent) 55%, color-mix(in srgb, var(--color-raised-bg) 60%, transparent))'
		: 'linear-gradient(to top, color-mix(in srgb, var(--color-raised-bg) 92%, transparent), color-mix(in srgb, var(--color-raised-bg) 45%, transparent) 60%, transparent)',
)
</script>

<template>
	<div
		v-if="rest || hoverSrc"
		class="pointer-events-none absolute inset-0 z-0 overflow-hidden"
		aria-hidden="true"
	>
		<div v-if="rest" class="absolute inset-0">
			<CustomizationImage :src="rest" :position="position"
				:zoom="face?.zoom" :max-size="maxSize" />
		</div>
		<div
			v-if="hoverSrc && (always || everHovered)"
			class="absolute inset-0 transition-opacity duration-200"
			:class="hoverVisible ? 'opacity-100' : 'opacity-0'"
		>
			<CustomizationImage
				:src="hoverSrc"
				:live="animations && hoverVisible"
				:position="position"
				:zoom="face?.zoom"
				:max-size="maxSize"
			/>
		</div>
		<div class="absolute inset-0" :style="{ background: scrim }" />
	</div>
</template>
