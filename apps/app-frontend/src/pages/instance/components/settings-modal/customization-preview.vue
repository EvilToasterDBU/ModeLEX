<script setup lang="ts">
import { computed, ref } from 'vue'

import InstancePageBackdrop from '@/components/ui/InstancePageBackdrop.vue'
import InstanceCardView from '@/components/ui/library/instance-group/instance-card-view.vue'
import { useInstanceCustomization } from '@/helpers/modlex-instance-customization'

import { injectInstanceSettings } from './instance-settings-context'
import InstanceStripPreview from './instance-strip-preview.vue'

// Как оформление выглядит в лаунчере: карточка целиком в трёх размерах (настройка размера
// карточек на главной), полоска «Jump in» в широком и узком окне и страница инстанса. Использует
// настоящие компоненты, поэтому картинка режется и затемняется ровно так же, как в списке.
const { instance } = injectInstanceSettings()
const { customization, animations, src } = useInstanceCustomization(() => instance.value.id, {
	force: true,
})

const hoverPreview = ref(false)
const pageHovered = computed(() => hoverPreview.value)

// минимальная ширина карточки библиотеки для настроек «маленькие / средние / крупные»
const cardSizes = [
	{ label: 'Маленькие', width: 112 },
	{ label: 'Средние', width: 160 },
	{ label: 'Крупные', width: 224 },
]
</script>

<template>
	<div class="flex flex-col gap-4 rounded-2xl border border-solid border-surface-4 p-4">
		<div class="flex items-center justify-between gap-4">
			<h2 class="m-0 text-lg font-semibold text-contrast">Как это выглядит</h2>
			<div class="flex gap-2">
				<button
					type="button"
					class="rounded-lg border border-solid px-3 py-1 text-sm font-semibold"
					:class="
						!hoverPreview
							? 'border-brand bg-brand-highlight text-contrast'
							: 'border-surface-4 text-secondary'
					"
					@click="hoverPreview = false"
				>
					В покое
				</button>
				<button
					type="button"
					class="rounded-lg border border-solid px-3 py-1 text-sm font-semibold"
					:class="
						hoverPreview
							? 'border-brand bg-brand-highlight text-contrast'
							: 'border-surface-4 text-secondary'
					"
					@click="hoverPreview = true"
				>
					При наведении
				</button>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="m-0 text-sm font-semibold text-secondary">Карточка в библиотеке</h3>
			<div class="flex flex-wrap items-start gap-4">
				<div v-for="size in cardSizes" :key="size.width" class="flex flex-col gap-1">
					<div :style="{ width: size.width + 'px' }">
						<InstanceCardView :instance="instance" preview :force-hovered="hoverPreview" />
					</div>
					<span class="text-xs text-secondary">{{ size.label }}</span>
				</div>
			</div>
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="m-0 text-sm font-semibold text-secondary">Хедер в «Jump in»</h3>
			<InstanceStripPreview :instance="instance" :force-hovered="hoverPreview" />
			<div class="max-w-[520px]">
				<InstanceStripPreview :instance="instance" :force-hovered="hoverPreview" />
			</div>
			<span class="text-xs text-secondary">Широкое окно и узкое окно: картинка обрезается по бокам.</span>
		</div>

		<div class="flex flex-col gap-2">
			<h3 class="m-0 text-sm font-semibold text-secondary">Страница инстанса</h3>
			<div
				class="relative h-40 overflow-hidden rounded-xl border border-solid border-surface-4 bg-bg"
			>
				<InstancePageBackdrop
					part="background"
					:page="customization?.page ?? null"
					:src="src"
					:animations="animations"
					:hovered="pageHovered"
				/>
				<div class="relative z-[1] flex h-16 items-center px-4">
					<InstancePageBackdrop
						part="banner"
						:page="customization?.page ?? null"
						:src="src"
						:animations="animations"
						:hovered="pageHovered"
					/>
					<InstancePageBackdrop
						part="overlay"
						:page="customization?.page ?? null"
						:src="src"
						:animations="animations"
						:hovered="pageHovered"
					/>
					<span class="text-lg font-semibold text-contrast">{{ instance.name }}</span>
				</div>
			</div>
		</div>
	</div>
</template>
