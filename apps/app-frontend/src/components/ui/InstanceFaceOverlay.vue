<script setup lang="ts">
import { computed } from 'vue'

import CustomizationImage from '@/components/ui/CustomizationImage.vue'
import type { FaceCustomization } from '@/helpers/instance'

// Слой поверх карточки или полоски инстанса из оформления автора: рисуется выше значка и текста,
// но не перехватывает мышь (клики и наведение проходят насквозь), а прозрачные места картинки
// оставляют содержимое видимым. Кладётся ПОСЛЕДНИМ ребёнком родителя с `relative`.
const props = defineProps<{
	face: FaceCustomization | null
	src: (path: string | null | undefined) => string | null
	animations: boolean
	hovered: boolean
	maxSize?: number
}>()

const overlay = computed(() => props.src(props.face?.overlay))
const position = computed(() =>
	props.face?.overlayFocus
		? `${props.face.overlayFocus[0] * 100}% ${props.face.overlayFocus[1] * 100}%`
		: undefined,
)
// анимация слоя подчиняется тому же режиму, что и картинка «при наведении»
const live = computed(() => {
	if (!props.animations) return false
	if (props.face?.animate === 'always') return true
	return props.face?.animate === 'hover' && props.hovered
})
</script>

<template>
	<div
		v-if="overlay"
		class="pointer-events-none absolute inset-0 z-[2] overflow-hidden"
		:style="{ opacity: face?.overlayOpacity ?? 1 }"
		aria-hidden="true"
	>
		<CustomizationImage
			:src="overlay"
			:live="live"
			:position="position"
			:zoom="face?.overlayZoom"
			:max-size="maxSize"
		/>
	</div>
</template>
