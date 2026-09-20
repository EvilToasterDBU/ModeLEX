<script setup lang="ts">
import { DownloadIcon, UploadIcon } from '@modrinth/assets'
import { Button, DropdownSelect, injectNotificationManager, Slider } from '@modrinth/ui'
import { convertFileSrc } from '@tauri-apps/api/core'
import { confirm, open, save } from '@tauri-apps/plugin-dialog'
import { computed, onMounted, ref } from 'vue'

import {
	clear_customization,
	type CustomizationAnimate,
	type CustomizationOptions,
	type CustomizationSlot,
	export_customization,
	get_customization,
	import_customization,
	type InstanceCustomization,
	set_customization_asset,
	set_customization_options,
} from '@/helpers/instance'
import {
	refreshInstanceCustomization,
	setInstanceCustomization,
} from '@/helpers/modlex-instance-customization'

import CustomizationPreview from './customization-preview.vue'
import CustomizationSlotRow from './customization-slot.vue'
import ImageFramer from './image-framer.vue'
import { injectInstanceSettings } from './instance-settings-context'

// Вкладка «Оформление»: хедер, карточка, страница и логотип инстанса. Формат и правила —
// docs/CUSTOMIZATION_SPEC.md. Картинки копируются в папку инстанса `modlex/`, поэтому они
// переезжают вместе со сборкой при экспорте. Для каждой картинки есть рамка с реальными
// пропорциями, где её можно двигать и приближать.

const { handleError } = injectNotificationManager()
const { instance } = injectInstanceSettings()

const customization = ref<InstanceCustomization | null>(null)
const revision = ref(0)
const busy = ref(false)

const IMAGE_FILTER = [
	{ name: 'Изображения', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'apng'] },
]

onMounted(async () => {
	try {
		customization.value = await get_customization(instance.value.id)
		// общий кэш мог отстать от диска (например, после импорта сборки) — синхронизируем
		refreshInstanceCustomization(instance.value.id)
	} catch (error) {
		handleError(error as Error)
	}
})

function applyResult(result: InstanceCustomization | null) {
	customization.value = result
	revision.value++
	// карточки, полоски и страница инстанса обновятся сразу
	setInstanceCustomization(instance.value.id, result)
}

/** Обёртка над любым изменением: блокирует кнопки на время записи и показывает ошибку */
async function run(action: () => Promise<InstanceCustomization | null | void>) {
	if (busy.value) return
	busy.value = true
	try {
		const result = await action()
		if (result !== undefined) applyResult(result)
	} catch (error) {
		handleError(error as Error)
	} finally {
		busy.value = false
	}
}

/** Правка настроек не должна теряться, если предыдущая ещё пишется на диск: ждём и выполняем */
async function runQueued(action: () => Promise<InstanceCustomization | null | void>) {
	while (busy.value) await new Promise((resolve) => setTimeout(resolve, 40))
	await run(action)
}

function assetUrl(path: string | null | undefined): string | null {
	return path ? `${convertFileSrc(path)}?v=${revision.value}` : null
}

async function pick(slot: CustomizationSlot) {
	const selected = await open({ multiple: false, directory: false, filters: IMAGE_FILTER })
	if (typeof selected !== 'string') return
	await run(() => set_customization_asset(instance.value.id, slot, selected))
}

function clear(slot: CustomizationSlot) {
	return run(() => set_customization_asset(instance.value.id, slot, null))
}

/** Текущие настройки целиком: редактор шлёт состояние, а не «дельту» */
function currentOptions(): CustomizationOptions {
	const current = customization.value
	const face = (block: InstanceCustomization['header']) =>
		block
			? {
					animate: block.animate,
					focus: block.focus,
					zoom: block.zoom,
					accent: block.accent,
					overlayFocus: block.overlayFocus,
					overlayZoom: block.overlayZoom,
					overlayOpacity: block.overlayOpacity,
				}
			: {}
	return {
		author: current?.author ?? null,
		header: face(current?.header ?? null),
		card: face(current?.card ?? null),
		page: current?.page
			? {
					animate: current.page.animate,
					accent: current.page.accent,
					bannerFocus: current.page.bannerFocus,
					bannerZoom: current.page.bannerZoom,
					backgroundFocus: current.page.backgroundFocus,
					backgroundZoom: current.page.backgroundZoom,
					overlayFocus: current.page.overlayFocus,
					overlayZoom: current.page.overlayZoom,
					overlayOpacity: current.page.overlayOpacity,
				}
			: {},
	}
}

type Frame = { focus: [number, number]; zoom: number }

function setAnimate(block: 'header' | 'card' | 'page', mode: CustomizationAnimate) {
	const options = currentOptions()
	options[block] = { ...options[block], animate: mode }
	return runQueued(() => set_customization_options(instance.value.id, options))
}

function setAccent(block: 'header' | 'card' | 'page', accent: string | null) {
	const options = currentOptions()
	options[block] = { ...options[block], accent }
	return runQueued(() => set_customization_options(instance.value.id, options))
}

function setFrame(block: 'header' | 'card', frame: Frame) {
	const options = currentOptions()
	options[block] = { ...options[block], focus: frame.focus, zoom: frame.zoom }
	return runQueued(() => set_customization_options(instance.value.id, options))
}

function setPageFrame(part: 'banner' | 'background', frame: Frame) {
	const options = currentOptions()
	options.page =
		part === 'banner'
			? { ...options.page, bannerFocus: frame.focus, bannerZoom: frame.zoom }
			: { ...options.page, backgroundFocus: frame.focus, backgroundZoom: frame.zoom }
	return runQueued(() => set_customization_options(instance.value.id, options))
}

function setOverlayFrame(block: 'header' | 'card' | 'page', frame: Frame) {
	const options = currentOptions()
	options[block] = { ...options[block], overlayFocus: frame.focus, overlayZoom: frame.zoom }
	return runQueued(() => set_customization_options(instance.value.id, options))
}

// непрозрачность слоя: ползунок тянется быстро, на диск пишем после паузы
const overlayOpacityTimers: Partial<Record<string, ReturnType<typeof setTimeout>>> = {}
function setOverlayOpacity(block: 'header' | 'card' | 'page', percent: number) {
	const timer = overlayOpacityTimers[block]
	if (timer) clearTimeout(timer)
	overlayOpacityTimers[block] = setTimeout(() => {
		const options = currentOptions()
		options[block] = { ...options[block], overlayOpacity: percent / 100 }
		void runQueued(() => set_customization_options(instance.value.id, options))
	}, 300)
}

const animateModes: CustomizationAnimate[] = ['hover', 'always', 'never']
const animateLabel = (mode: CustomizationAnimate) =>
	({ hover: 'При наведении', always: 'Всегда', never: 'Никогда' })[mode]

const header = computed(() => customization.value?.header ?? null)
const card = computed(() => customization.value?.card ?? null)
const page = computed(() => customization.value?.page ?? null)

const hasAnything = computed(
	() =>
		!!customization.value &&
		!!(
			customization.value.header ||
			customization.value.card ||
			customization.value.page ||
			customization.value.logo
		),
)

async function exportAll() {
	const destination = await save({
		defaultPath: `${instance.value.name} — оформление.zip`,
		filters: [{ name: 'Архив оформления', extensions: ['zip'] }],
	})
	if (!destination) return
	await run(async () => {
		await export_customization(instance.value.id, destination)
	})
}

async function importAll() {
	const selected = await open({
		multiple: false,
		directory: false,
		filters: [{ name: 'Архив оформления', extensions: ['zip'] }],
	})
	if (typeof selected !== 'string') return
	if (
		hasAnything.value &&
		!(await confirm('Текущее оформление этого инстанса будет заменено. Продолжить?', {
			title: 'Импорт оформления',
			kind: 'warning',
		}))
	) {
		return
	}
	await run(() => import_customization(instance.value.id, selected))
}

async function removeAll() {
	if (
		!(await confirm('Удалить всё оформление этого инстанса? Файлы будут удалены.', {
			title: 'Удаление оформления',
			kind: 'warning',
		}))
	) {
		return
	}
	await run(async () => {
		await clear_customization(instance.value.id)
		return null
	})
}
</script>

<template>
	<div class="flex flex-col gap-6">
		<p class="m-0">
			Как выглядит этот инстанс. Оформление хранится в папке инстанса и уезжает вместе со сборкой
			при экспорте.
		</p>

		<CustomizationPreview />

		<div class="flex flex-col gap-4">
			<h2 class="m-0 text-lg font-semibold text-contrast">Хедер</h2>
			<CustomizationSlotRow
				label="Картинка"
				description="Полоска инстанса в списке."
				:path="header?.image ?? null"
				:revision="revision"
				:recommended-width="1920"
				:recommended-height="160"
				:busy="busy"
				@pick="pick('header.image')"
				@clear="clear('header.image')"
			/>
			<ImageFramer
				v-if="header?.image"
				:src="assetUrl(header.image)"
				:aspect="10"
				:focus="header.focus"
				:zoom="header.zoom"
				mock="strip"
				hint="Тяни картинку мышкой, чтобы выбрать, что останется в полоске. Серые блоки — значок, название и кнопка Play."
				@commit="(frame: Frame) => setFrame('header', frame)"
			/>
			<CustomizationSlotRow
				label="При наведении"
				description="Картинка или анимация (GIF, WebP), пока курсор на хедере."
				:path="header?.hover ?? null"
				:revision="revision"
				:recommended-width="1920"
				:recommended-height="160"
				:busy="busy"
				@pick="pick('header.hover')"
				@clear="clear('header.hover')"
			/>
			<div v-if="header?.hover || header?.overlay" class="flex items-center justify-between gap-4">
				<h3 class="m-0 text-base font-semibold text-contrast">Анимация</h3>
				<DropdownSelect
					:model-value="header.animate"
					name="header-animate"
					:options="animateModes"
					:display-name="animateLabel"
					@update:model-value="(mode: CustomizationAnimate) => setAnimate('header', mode)"
				/>
			</div>
			<CustomizationSlotRow
				label="Слой поверх"
				description="Полупрозрачная картинка выше значка и текста. Клики проходят сквозь неё."
				:path="header?.overlay ?? null"
				:revision="revision"
				:recommended-width="1920"
				:recommended-height="160"
				:busy="busy"
				@pick="pick('header.overlay')"
				@clear="clear('header.overlay')"
			/>
			<template v-if="header?.overlay">
				<ImageFramer
					:src="assetUrl(header.overlay)"
					:aspect="10"
					:focus="header.overlayFocus"
					:zoom="header.overlayZoom"
					mock="strip"
					overlay
					:opacity="header.overlayOpacity ?? 1"
					@commit="(frame: Frame) => setOverlayFrame('header', frame)"
				/>
				<div class="flex items-center gap-3">
					<span class="shrink-0 text-xs text-secondary">Непрозрачность слоя</span>
					<div class="w-56">
						<Slider
							:model-value="Math.round((header.overlayOpacity ?? 1) * 100)"
							:min="10"
							:max="100"
							:step="5"
							unit="%"
							@update:model-value="(value: number) => setOverlayOpacity('header', value)"
						/>
					</div>
				</div>
			</template>
		</div>

		<div class="flex flex-col gap-4">
			<h2 class="m-0 text-lg font-semibold text-contrast">Карточка</h2>
			<CustomizationSlotRow
				label="Картинка"
				description="Лицо карточки инстанса."
				:path="card?.image ?? null"
				:revision="revision"
				:recommended-width="600"
				:recommended-height="800"
				:busy="busy"
				@pick="pick('card.image')"
				@clear="clear('card.image')"
			/>
			<div v-if="card?.image" class="w-52">
				<ImageFramer
					:src="assetUrl(card.image)"
					:aspect="0.75"
					:focus="card.focus"
					:zoom="card.zoom"
					mock="card"
					@commit="(frame: Frame) => setFrame('card', frame)"
				/>
			</div>
			<CustomizationSlotRow
				label="При наведении"
				:path="card?.hover ?? null"
				:revision="revision"
				:recommended-width="600"
				:recommended-height="800"
				:busy="busy"
				@pick="pick('card.hover')"
				@clear="clear('card.hover')"
			/>
			<div v-if="card?.hover || card?.overlay" class="flex items-center justify-between gap-4">
				<h3 class="m-0 text-base font-semibold text-contrast">Анимация</h3>
				<DropdownSelect
					:model-value="card.animate"
					name="card-animate"
					:options="animateModes"
					:display-name="animateLabel"
					@update:model-value="(mode: CustomizationAnimate) => setAnimate('card', mode)"
				/>
			</div>
			<CustomizationSlotRow
				label="Слой поверх"
				description="Полупрозрачная картинка выше значка и названия. Клики проходят сквозь неё."
				:path="card?.overlay ?? null"
				:revision="revision"
				:recommended-width="600"
				:recommended-height="800"
				:busy="busy"
				@pick="pick('card.overlay')"
				@clear="clear('card.overlay')"
			/>
			<template v-if="card?.overlay">
				<div class="w-52">
					<ImageFramer
					:src="assetUrl(card.overlay)"
					:aspect="0.75"
					:focus="card.overlayFocus"
					:zoom="card.overlayZoom"
					mock="card"
					overlay
					:opacity="card.overlayOpacity ?? 1"
					@commit="(frame: Frame) => setOverlayFrame('card', frame)"
				/>
				</div>
				<div class="flex items-center gap-3">
					<span class="shrink-0 text-xs text-secondary">Непрозрачность слоя</span>
					<div class="w-56">
						<Slider
							:model-value="Math.round((card.overlayOpacity ?? 1) * 100)"
							:min="10"
							:max="100"
							:step="5"
							unit="%"
							@update:model-value="(value: number) => setOverlayOpacity('card', value)"
						/>
					</div>
				</div>
			</template>
		</div>

		<div class="flex flex-col gap-4">
			<h2 class="m-0 text-lg font-semibold text-contrast">Страница инстанса</h2>
			<CustomizationSlotRow
				label="Баннер"
				description="Шапка страницы: значок, название и кнопки лежат поверх."
				:path="page?.banner ?? null"
				:revision="revision"
				:recommended-width="1920"
				:recommended-height="200"
				:busy="busy"
				@pick="pick('page.banner')"
				@clear="clear('page.banner')"
			/>
			<ImageFramer
				v-if="page?.banner"
				:src="assetUrl(page.banner)"
				:aspect="10"
				:focus="page.bannerFocus"
				:zoom="page.bannerZoom"
				mock="banner"
				hint="Так шапка выглядит на широком экране; в узком окне картинка режется по бокам."
				@commit="(frame: Frame) => setPageFrame('banner', frame)"
			/>
			<CustomizationSlotRow
				label="Фон"
				description="Под всей страницей, приглушён, чтобы не мешал читать."
				:path="page?.background ?? null"
				:revision="revision"
				:recommended-width="1920"
				:recommended-height="1080"
				:busy="busy"
				@pick="pick('page.background')"
				@clear="clear('page.background')"
			/>
			<ImageFramer
				v-if="page?.background"
				:src="assetUrl(page.background)"
				:aspect="2"
				:focus="page.backgroundFocus"
				:zoom="page.backgroundZoom"
				mock="background"
				@commit="(frame: Frame) => setPageFrame('background', frame)"
			/>
			<div v-if="page?.banner || page?.background || page?.overlay" class="flex items-center justify-between gap-4">
				<h3 class="m-0 text-base font-semibold text-contrast">Анимация</h3>
				<DropdownSelect
					:model-value="page.animate"
					name="page-animate"
					:options="animateModes"
					:display-name="animateLabel"
					@update:model-value="(mode: CustomizationAnimate) => setAnimate('page', mode)"
				/>
			</div>
			<CustomizationSlotRow
				label="Слой поверх"
				description="Полупрозрачная картинка выше значка, названия и кнопок шапки. Клики проходят сквозь неё."
				:path="page?.overlay ?? null"
				:revision="revision"
				:recommended-width="1920"
				:recommended-height="200"
				:busy="busy"
				@pick="pick('page.overlay')"
				@clear="clear('page.overlay')"
			/>
			<template v-if="page?.overlay">
				<ImageFramer
					:src="assetUrl(page.overlay)"
					:aspect="10"
					:focus="page.overlayFocus"
					:zoom="page.overlayZoom"
					mock="banner"
					overlay
					:opacity="page.overlayOpacity ?? 1"
					@commit="(frame: Frame) => setOverlayFrame('page', frame)"
				/>
				<div class="flex items-center gap-3">
					<span class="shrink-0 text-xs text-secondary">Непрозрачность слоя</span>
					<div class="w-56">
						<Slider
							:model-value="Math.round((page.overlayOpacity ?? 1) * 100)"
							:min="10"
							:max="100"
							:step="5"
							unit="%"
							@update:model-value="(value: number) => setOverlayOpacity('page', value)"
						/>
					</div>
				</div>
			</template>
		</div>

		<div class="flex flex-col gap-4">
			<h2 class="m-0 text-lg font-semibold text-contrast">Логотип</h2>
			<CustomizationSlotRow
				label="Логотип"
				description="Вместо значка на странице инстанса. Может быть анимированным."
				:path="customization?.logo ?? null"
				:revision="revision"
				:recommended-width="512"
				:recommended-height="512"
				:busy="busy"
				@pick="pick('logo.file')"
				@clear="clear('logo.file')"
			/>
		</div>

		<div class="flex items-center justify-between gap-4">
			<div class="flex flex-col gap-1">
				<h3 class="m-0 text-base font-semibold text-contrast">Акцентный цвет</h3>
				<p class="m-0 text-sm">Цвет инстанса для хедера и карточки.</p>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="color"
					class="h-9 w-9 cursor-pointer rounded-lg border border-solid border-divider bg-transparent p-0.5"
					:value="header?.accent ?? card?.accent ?? '#7dd3fc'"
					:disabled="busy"
					@change="
						(event) => {
							const value = (event.target as HTMLInputElement).value
							void setAccent('header', value).then(() => setAccent('card', value))
						}
					"
				/>
				<Button
					v-if="header?.accent || card?.accent"
					type="outlined"
					size="sm"
					native-type="button"
					:disabled="busy"
					@click="setAccent('header', null).then(() => setAccent('card', null))"
				>
					Сбросить
				</Button>
			</div>
		</div>

		<div
			v-if="customization?.warnings.length"
			class="flex flex-col gap-1 rounded-lg border border-solid border-orange p-3 text-sm"
		>
			<span class="font-semibold text-contrast">Часть оформления не применена:</span>
			<span v-for="warning in customization.warnings" :key="warning">{{ warning }}</span>
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<Button
				type="outlined"
				size="sm"
				native-type="button"
				:disabled="busy || !hasAnything"
				@click="exportAll"
			>
				<UploadIcon /> Экспортировать оформление
			</Button>
			<Button type="outlined" size="sm" native-type="button" :disabled="busy" @click="importAll">
				<DownloadIcon /> Импортировать оформление
			</Button>
			<Button
				v-if="hasAnything"
				type="outlined"
				size="sm"
				native-type="button"
				:disabled="busy"
				@click="removeAll"
			>
				Удалить оформление
			</Button>
		</div>
	</div>
</template>
