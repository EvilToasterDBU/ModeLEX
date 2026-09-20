<script setup lang="ts">
import { XIcon } from '@modrinth/assets'
import { Button } from '@modrinth/ui'
import { convertFileSrc } from '@tauri-apps/api/core'
import { computed, ref, watch } from 'vue'

// Одна картинка оформления: превью, рекомендуемый размер, проверка пропорций, «Выбрать/Заменить»,
// «Убрать».
const props = defineProps<{
	label: string
	description?: string
	/** Абсолютный путь к текущему файлу или null */
	path: string | null
	/** Меняется после каждой правки, чтобы webview не показывал закешированную старую картинку */
	revision: number
	/** Рекомендуемый размер, px. Если задан — показываем подсказку и сверяем пропорции файла */
	recommendedWidth?: number
	recommendedHeight?: number
	busy?: boolean
	disabled?: boolean
}>()

defineEmits<{
	pick: []
	clear: []
}>()

const previewUrl = computed(() =>
	props.path ? `${convertFileSrc(props.path)}?v=${props.revision}` : null,
)

const actual = ref<{ width: number; height: number } | null>(null)
watch(previewUrl, () => {
	actual.value = null
})
function onLoad(event: Event) {
	const image = event.target as HTMLImageElement
	actual.value = { width: image.naturalWidth, height: image.naturalHeight }
}

const recommendation = computed(() =>
	props.recommendedWidth && props.recommendedHeight
		? `${props.recommendedWidth}×${props.recommendedHeight}`
		: null,
)

/** Замечания по загруженному файлу: маленькое разрешение и чужие пропорции — обе, если есть обе */
const remarks = computed(() => {
	const size = actual.value
	if (!size || !props.recommendedWidth || !props.recommendedHeight) return []
	const ratio = size.width / size.height
	const wanted = props.recommendedWidth / props.recommendedHeight
	const off = Math.max(ratio / wanted, wanted / ratio)
	const result: string[] = []
	if (size.width < props.recommendedWidth * 0.6) {
		result.push('Разрешение маловато — картинка будет выглядеть размытой.')
	}
	if (off > 1.25) {
		result.push('Пропорции отличаются от рекомендуемых: края будут обрезаны. Выбери, что оставить в кадре, в рамке ниже.')
	}
	return result
})
</script>

<template>
	<div class="flex items-center justify-between gap-4" :class="{ 'opacity-50': disabled }">
		<div class="flex min-w-0 items-center gap-3">
			<div
				class="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-solid border-button-bg bg-bg text-xs text-secondary"
			>
				<img
					v-if="previewUrl"
					:src="previewUrl"
					alt=""
					class="h-full w-full object-contain"
					@load="onLoad"
				/>
				<span v-else>Нет</span>
			</div>
			<div class="flex min-w-0 flex-col gap-1">
				<h3 class="m-0 text-base font-semibold text-contrast">{{ label }}</h3>
				<p v-if="description" class="m-0 text-sm">{{ description }}</p>
				<p v-if="recommendation" class="m-0 text-xs text-secondary">
					Рекомендуется {{ recommendation }}<template v-if="actual">
						· загружено {{ actual.width }}×{{ actual.height }}</template
					>
				</p>
				<p v-for="remark in remarks" :key="remark" class="m-0 text-xs text-orange">{{ remark }}</p>
			</div>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<Button
				type="outlined"
				size="sm"
				native-type="button"
				:disabled="busy || disabled"
				@click="$emit('pick')"
			>
				{{ path ? 'Заменить' : 'Выбрать файл' }}
			</Button>
			<Button
				v-if="path"
				type="outlined"
				size="sm"
				native-type="button"
				:disabled="busy || disabled"
				@click="$emit('clear')"
			>
				<XIcon /> Убрать
			</Button>
		</div>
	</div>
</template>
