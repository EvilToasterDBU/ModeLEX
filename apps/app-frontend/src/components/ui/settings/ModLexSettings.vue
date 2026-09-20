<template>
	<div ref="rootEl" class="flex flex-col gap-6">
		<div class="settings-search sticky top-0 z-30 -mx-6 bg-bg-raised px-6 pb-2 pt-3">
			<div v-if="modlexSettingsSearchVisible" class="flex items-center gap-2">
				<input
					v-model="searchQuery"
					type="search"
					class="console-text-input min-w-0 flex-1"
					placeholder="Поиск: тема, обои, курсфордж, дискорд…"
					autocomplete="off"
					spellcheck="false"
				/>
				<Button
					v-tooltip="'Скрыть поиск'"
					type="outlined"
					size="sm"
					native-type="button"
					@click="hideSearch"
				>
					<XIcon aria-hidden="true" />
				</Button>
			</div>
			<div v-else class="flex justify-end">
				<Button
					type="outlined"
					size="sm"
					native-type="button"
					@click="modlexSettingsSearchVisible = true"
				>
					<SearchIcon aria-hidden="true" /> Поиск
				</Button>
			</div>
		</div>
		<p v-if="searchQuery.trim() && searchEmpty" class="settings-section__desc">
			Ничего не нашли по «{{ searchQuery.trim() }}». Попробуйте другое слово — например «тема», «обои» или «кнопки».
		</p>
		<Transition name="settings-notice-fade">
			<div v-if="inlineNotice" class="settings-notice sticky top-16 z-20 mx-auto">
				{{ inlineNotice }}
			</div>
		</Transition>

		<!-- Внешний вид -->
		<div class="settings-section" data-settings-anchor="appearance" data-settings-keywords="внешний вид интерфейс оформление панель панели стекло стеклянный прозрачность прозрачные размытие блюр скрыть убрать вкладка серверы сервера музыка агент ии друзья правая панель плашка аккаунт боковое меню сайдбар" data-settings-label="Внешний вид">
			<h2 class="settings-section__title">Внешний вид</h2>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Скрыть вкладку "Серверы"</h3>
					<p class="setting-row__desc">Убирает кнопку серверов из бокового меню.</p>
				</div>
				<Toggle v-model="modlexHideServers" />
			</div>
			<div v-if="musicFeatureEnabled" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Скрыть вкладку "Музыка"</h3>
					<p class="setting-row__desc">
						Убирает кнопку музыкального плеера мода ModLEX Core из бокового меню.
					</p>
				</div>
				<Toggle v-model="modlexHideMusicTab" />
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Скрыть ИИ-агента</h3>
					<p class="setting-row__desc">
						Убирает плавающую иконку ИИ-помощника в правом нижнем углу.
					</p>
				</div>
				<Toggle v-model="modlexHideAiAgent" />
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Скрыть блок "Друзья"</h3>
					<p class="setting-row__desc">Убирает список друзей из правой панели.</p>
				</div>
				<Toggle v-model="modlexHideFriends" />
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Скрыть правую панель</h3>
					<p class="setting-row__desc">
						Панель (аккаунт, друзья, новости) полностью прячется, вместо неё — компактная плашка
						текущего аккаунта в углу. На странице модов панель вместо этого превращается в узкую
						полоску сбоку и выезжает целиком при наведении — там фильтры категорий.
					</p>
				</div>
				<Toggle v-model="modlexHideRightSidebar" />
			</div>
			<div v-if="modlexHideRightSidebar" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Прятать плашку аккаунта за край экрана</h3>
					<p class="setting-row__desc">
						Плашка тоже уезжает за правый край и выезжает обратно при наведении на угол экрана.
					</p>
				</div>
				<Toggle v-model="modlexHideFloatingAccountWidget" />
			</div>
			<div v-if="modlexHideRightSidebar" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Эффект стекла</h3>
					<p class="setting-row__desc">
						Полупрозрачный фон с блюром вместо сплошного — для плашки аккаунта и
						полоски-подглядывания на различных вкладках.
					</p>
				</div>
				<Toggle v-model="modlexFloatingGlassEffect" />
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Стекло для левой панели и верхней полоски</h3>
					<p class="setting-row__desc">
						Эффект стекла для панели — эффект заметен, когда задан свой фон лаунчера.
					</p>
				</div>
				<Toggle v-model="modlexNavGlassEnabled" />
			</div>
			<div v-if="modlexNavGlassEnabled" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Непрозрачность панелей</h3>
				</div>
				<div class="modlex-slider">
					<Slider v-model="modlexNavGlassOpacityPct" :min="15" :max="100" :step="5" unit="%" />
				</div>
			</div>
			<div v-if="modlexNavGlassEnabled" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Размытие за панелями</h3>
				</div>
				<div class="modlex-slider">
					<Slider v-model="modlexNavGlassBlur" :min="0" :max="40" :step="1" unit="px" />
				</div>
			</div>
		</div>

		<!-- Акцентный цвет -->
		<div class="settings-section" data-settings-anchor="colors" data-settings-keywords="цвет цвета акцент акцентный вся тема автотема подстройка авто автоцвет под обои тема темы оформление тёмная светлая тёмный светлый кнопки текст иконки иконка фон обводка граница рамка код темы поделиться экспорт импорт скопировать" data-settings-label="Цвета">
			<h2 class="settings-section__title">Акцентный цвет</h2>
			<p class="settings-section__desc">
				Свой цвет вместо стандартного фиолетового — кнопки, ссылки, выделения.
			</p>
			<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper || modlexAutoAccentFromWallpaper }" :inert="modlexAutoThemeFromWallpaper || modlexAutoAccentFromWallpaper">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Цвет</h3>
					<p class="setting-row__desc">
						{{ modlexAccentColor ? modlexAccentColor : 'Стандартный цвет темы' }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="color"
						class="color-picker"
						:value="accentColorForPicker"
						@input="modlexAccentColor = ($event.target as HTMLInputElement).value"
					/>
					<Button
						v-if="modlexAccentColor"
						type="outlined"
						size="sm"
						native-type="button"
						@click="modlexAccentColor = ''"
						>Сбросить</Button
					>
				</div>
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Адаптивные цвета темы под обои (тест)</h3>
					<p class="setting-row__desc">
						Акцент, фон, панели, разделители, текст и иконки подстраиваются под цвета обоев.
					</p>
				</div>
				<Toggle v-model="modlexAutoThemeFromWallpaper" />
			</div>
			<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper }" :inert="modlexAutoThemeFromWallpaper">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Адаптивный цвет акцента (тест)</h3>
					<p class="setting-row__desc">
						Цвет акцента берётся из фона лаунчера. Работает с картинкой, GIF и видео
						<template v-if="modlexAutoAccentFromWallpaper">
							{{
								modlexWallpaperAccent
									? 'Сейчас: ' + modlexWallpaperAccent
									: 'Цвет из этих обоев вытащить не получилось.'
							}}
						</template>
					</p>
				</div>
				<Toggle v-model="modlexAutoAccentFromWallpaper" />
			</div>

			<Button
				type="outlined"
				size="sm"
				native-type="button"
				class="!mt-3"
				@click="showAdvancedTheme = !showAdvancedTheme"
			>
				{{ showAdvancedTheme ? 'Скрыть расширенные настройки' : 'Расширенные настройки' }}
			</Button>

			<div v-if="showAdvancedTheme" class="advanced-theme">
				<p class="settings-section__desc">
					Тонкая настройка цветов интерфейса. Пустой цвет = стандартный цвет темы.
				</p>

				<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper }" :inert="modlexAutoThemeFromWallpaper">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Фон</h3>
						<p class="setting-row__desc">
							Основной фон контента —
							{{ modlexBgColor ? modlexBgColor : 'стандартный цвет темы' }}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="color"
							class="color-picker"
							:value="modlexBgColor || DEFAULT_BG"
							@input="modlexBgColor = ($event.target as HTMLInputElement).value"
						/>
						<Button
							v-if="modlexBgColor"
							type="outlined"
							size="sm"
							native-type="button"
							@click="modlexBgColor = ''"
							>Сбросить</Button
						>
					</div>
				</div>

				<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper }" :inert="modlexAutoThemeFromWallpaper">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Панели и карточки</h3>
						<p class="setting-row__desc">
							Карточки инстансов, кнопки, боковые панели, настройки —
							{{ modlexPanelColor ? modlexPanelColor : 'стандартный цвет темы' }}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="color"
							class="color-picker"
							:value="modlexPanelColor || DEFAULT_PANEL"
							@input="modlexPanelColor = ($event.target as HTMLInputElement).value"
						/>
						<Button
							v-if="modlexPanelColor"
							type="outlined"
							size="sm"
							native-type="button"
							@click="modlexPanelColor = ''"
							>Сбросить</Button
						>
					</div>
				</div>

				<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper }" :inert="modlexAutoThemeFromWallpaper">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Текст</h3>
						<p class="setting-row__desc">
							{{ modlexTextColor ? modlexTextColor : 'Стандартный цвет темы' }}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="color"
							class="color-picker"
							:value="modlexTextColor || DEFAULT_TEXT"
							@input="modlexTextColor = ($event.target as HTMLInputElement).value"
						/>
						<Button
							v-if="modlexTextColor"
							type="outlined"
							size="sm"
							native-type="button"
							@click="modlexTextColor = ''"
							>Сбросить</Button
						>
					</div>
				</div>

				<div class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Обводка текста</h3>
						<p class="setting-row__desc">Контурная линия вокруг текста по всему приложению.</p>
					</div>
					<Toggle v-model="modlexTextOutlineEnabled" />
				</div>

				<div v-if="modlexTextOutlineEnabled" class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Цвет обводки текста</h3>
					</div>
					<input v-model="modlexTextOutlineColor" type="color" class="color-picker" />
				</div>

				<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper }" :inert="modlexAutoThemeFromWallpaper">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Иконки</h3>
						<p class="setting-row__desc">
							{{ modlexIconColor ? modlexIconColor : 'Стандартный цвет темы' }}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="color"
							class="color-picker"
							:value="modlexIconColor || DEFAULT_ICON"
							@input="modlexIconColor = ($event.target as HTMLInputElement).value"
						/>
						<Button
							v-if="modlexIconColor"
							type="outlined"
							size="sm"
							native-type="button"
							@click="modlexIconColor = ''"
							>Сбросить</Button
						>
					</div>
				</div>

				<div class="setting-row" :class="{ 'modlex-locked': modlexAutoThemeFromWallpaper }" :inert="modlexAutoThemeFromWallpaper">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Разделители и края</h3>
						<p class="setting-row__desc">
							{{ modlexDividerColor ? modlexDividerColor : 'Стандартный цвет темы' }}
						</p>
					</div>
					<div class="flex items-center gap-2">
						<input
							type="color"
							class="color-picker"
							:value="modlexDividerColor || DEFAULT_DIVIDER"
							@input="modlexDividerColor = ($event.target as HTMLInputElement).value"
						/>
						<Button
							v-if="modlexDividerColor"
							type="outlined"
							size="sm"
							native-type="button"
							@click="modlexDividerColor = ''"
							>Сбросить</Button
						>
					</div>
				</div>

				<div class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Двойная обводка</h3>
						<p class="setting-row__desc">
							Дополнительные обводки поверх краёв и разделителей — например, белая внутренняя и чёрная внешняя
							линия.
						</p>
					</div>
					<Toggle v-model="modlexDoubleBorderEnabled" />
				</div>

				<div v-if="modlexDoubleBorderEnabled" class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Цвета обводки</h3>
						<p class="setting-row__desc">Внутренняя и внешняя линия.</p>
					</div>
					<div class="flex items-center gap-2">
						<input
							v-model="modlexDoubleBorderInner"
							v-tooltip="'Внутренняя линия'"
							type="color"
							class="color-picker"
						/>
						<input
							v-model="modlexDoubleBorderOuter"
							v-tooltip="'Внешняя линия'"
							type="color"
							class="color-picker"
						/>
					</div>
				</div>

				<div class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Код темы</h3>
						<p class="setting-row__desc">Сохрани или импортируй всю раскраску одной строкой.</p>
					</div>
					<Button type="outlined" size="sm" native-type="button" @click="copyThemeCode"
						>Скопировать код</Button
					>
				</div>

				<div class="setting-row">
					<input
						v-model="importThemeCodeInput"
						type="text"
						class="console-text-input flex-1"
						placeholder="Вставь код темы сюда"
						autocomplete="off"
						spellcheck="false"
					/>
					<Button type="outlined" size="sm" native-type="button" @click="applyThemeCodeInput"
						>Применить</Button
					>
				</div>
			</div>
		</div>

		<!-- Главная страница -->
		<div class="settings-section" data-settings-anchor="home" data-settings-keywords="главная главный экран домашняя страница jump in недавние последние библиотека карточки размер маленькие крупные компактные поиск фильтры скрыть инстанс сборки сборка код раскладки" data-settings-label="Главная страница">
			<h2 class="settings-section__title">Главная страница</h2>
			<p class="settings-section__desc">
				Что показывать и какого размера. Отдельные инстансы
				можно скрыть с помощю ПКМ — «Скрыть с главной».
			</p>
			<div v-if="modlexWallpaperLayoutHint" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Раскладка из обоев</h3>
					<p class="setting-row__desc">
						Эти обои предлагают свою раскладку главной
					</p>
				</div>
				<Toggle v-model="modlexUseWallpaperLayout" />
			</div>
			<div class="setting-row" :class="{ 'modlex-locked': modlexWallpaperLayoutActive }" :inert="modlexWallpaperLayoutActive">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Блок «Jump in»</h3>
				</div>
				<Toggle v-model="modlexHomeShowJumpIn" />
			</div>
			<div v-if="modlexHomeShowJumpIn" class="setting-row" :class="{ 'modlex-locked': modlexWallpaperLayoutActive }" :inert="modlexWallpaperLayoutActive">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Размер строк «Jump in»</h3>
				</div>
				<select v-model="modlexHomeJumpInSize" class="console-text-input">
					<option value="normal">Обычные</option>
					<option value="compact">Компактные</option>
				</select>
			</div>
			<div class="setting-row" :class="{ 'modlex-locked': modlexWallpaperLayoutActive }" :inert="modlexWallpaperLayoutActive">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Блок «Библиотека»</h3>
				</div>
				<Toggle v-model="modlexHomeShowLibrary" />
			</div>
			<div v-if="modlexHomeShowLibrary" class="setting-row" :class="{ 'modlex-locked': modlexWallpaperLayoutActive }" :inert="modlexWallpaperLayoutActive">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Панель поиска и фильтров библиотеки</h3>
					<p class="setting-row__desc">
						Вместе с ней прячутся кнопки «Новая группа» и «Новый инстанс» — создать инстанс можно
						кнопкой «+» слева или правым кликом ПКМ по фону.
					</p>
				</div>
				<Toggle v-model="modlexHomeShowLibrarySearch" />
			</div>
			<div v-if="modlexHomeShowLibrary" class="setting-row" :class="{ 'modlex-locked': modlexWallpaperLayoutActive }" :inert="modlexWallpaperLayoutActive">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Размер карточек библиотеки</h3>
				</div>
				<select v-model="modlexHomeCardSize" class="console-text-input">
					<option value="small">Маленькие</option>
					<option value="medium">Средние</option>
					<option value="large">Крупные</option>
				</select>
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Код раскладки</h3>
					<p class="setting-row__desc">
						Размеры и видимость блоков одной строкой — можно экспортировать и переслать
					</p>
				</div>
				<Button type="outlined" size="sm" native-type="button" @click="copyLayoutCode"
					>Скопировать код</Button
				>
			</div>
			<div class="setting-row">
				<input
					v-model="importLayoutCodeInput"
					type="text"
					class="console-text-input flex-1"
					placeholder="Вставь код раскладки сюда"
					autocomplete="off"
					spellcheck="false"
				/>
				<Button type="outlined" size="sm" native-type="button" @click="applyLayoutCodeInput"
					>Применить</Button
				>
			</div>
		</div>

		<!-- Фон лаунчера -->
		<div class="settings-section" data-settings-anchor="background" data-settings-keywords="фон обои wallpaper видео гиф gif картинка изображение html анимация размытие блюр прозрачность живые обои заставка" data-settings-label="Фон">
			<h2 class="settings-section__title">Фон лаунчера</h2>
			<p class="settings-section__desc">
				Картинка, GIF, видео или HTML-страница (интерактивные обои) на заднем фоне лаунчера
			</p>

			<div v-if="globalBackgroundPreviewUrl" class="bg-preview">
				<div
					v-if="globalBackgroundIsHtml"
					class="bg-preview__media flex items-center justify-center text-sm text-secondary"
				>
					HTML-обои — результат виден на главной
				</div>
				<video
					v-else-if="globalBackgroundIsVideo"
					ref="bgPreviewVideo"
					:src="`${globalBackgroundPreviewUrl}#t=0.1`"
					preload="metadata"
					muted
					playsinline
					class="bg-preview__media"
					@loadedmetadata="onPreviewMeta"
				/>
				<GifCanvas
					v-else-if="globalBackgroundIsGif && gifTimelineSupported"
					:url="globalBackgroundPreviewUrl"
					:playing="false"
					:still-at="gifPreviewAt"
					:max-size="640"
					class="bg-preview__media"
					@failed="gifPreviewFailed = true"
				/>
				<img v-else :src="globalBackgroundPreviewUrl" alt="" class="bg-preview__media" />
			</div>

			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Файл фона</h3>
					<p class="setting-row__desc">Изображение, GIF, видео (mp4/webm) или один самодостаточный .html.</p>
				</div>
				<div class="flex items-center gap-2">
					<Button
						type="outlined"
						size="sm"
						native-type="button"
						:disabled="pickingBackground"
						@click="pickGlobalBackground"
					>
						{{ globalBackgroundPreviewUrl ? 'Заменить' : 'Выбрать файл' }}
					</Button>
					<Button
						v-if="globalBackgroundPreviewUrl"
						type="outlined"
						size="sm"
						native-type="button"
						@click="removeGlobalBackground"
					>
						Убрать
					</Button>
				</div>
			</div>
			<p v-if="backgroundSizeWarning" class="platform-warning">⚠ {{ backgroundSizeWarning }}</p>

			<template v-if="globalBackgroundPreviewUrl">
				<div class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Непрозрачность</h3>
					</div>
					<div class="modlex-slider">
						<Slider
							:model-value="Math.round(modlexGlobalBackgroundOpacity * 100)"
							:min="0"
							:max="100"
							:step="5"
							unit="%"
							@update:model-value="onOpacityChange"
						/>
					</div>
				</div>
				<div class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Блюр</h3>
					</div>
					<div class="modlex-slider">
						<Slider
							:model-value="modlexGlobalBackgroundBlurPx"
							:min="0"
							:max="30"
							:step="1"
							unit="px"
							@update:model-value="onBlurChange"
						/>
					</div>
				</div>
				<div v-if="globalBackgroundIsAnimated" class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Анимация</h3>
						<p class="setting-row__desc">
							Анимацию можно выключить если фон грузит на слабом устройстве.
						</p>
					</div>
					<Toggle
						:model-value="modlexGlobalBackgroundAnimated"
						@update:model-value="onAnimatedToggle"
					/>
				</div>
				<div v-if="globalBackgroundIsVideo || globalBackgroundIsHtml" class="setting-row">
					<div class="setting-row__info">
						<h3 class="setting-row__label">Звук обоев</h3>
						<p class="setting-row__desc">
							При не активно окне лаунчера останавливает воспроизведение
						</p>
					</div>
					<div class="modlex-slider">
						<Slider
							:model-value="Math.round(modlexGlobalBackgroundVolume * 100)"
							:min="0"
							:max="100"
							:step="1"
							unit="%"
							@update:model-value="onBackgroundVolume"
						/>
					</div>
				</div>
				<template
					v-if="(globalBackgroundIsVideo || (globalBackgroundIsGif && gifTimelineSupported)) && bgDurationSec > 0"
				>
					<div class="setting-row" :class="{ 'modlex-locked': !modlexGlobalBackgroundAnimated }" :inert="!modlexGlobalBackgroundAnimated">
						<div class="setting-row__info">
							<h3 class="setting-row__label">Начало видео</h3>
							<p class="setting-row__desc">Обои зацикливают только выбранный отрезок </p>
						</div>
						<div class="modlex-slider">
							<Slider
								:model-value="trimStartSec"
								:disabled="!modlexGlobalBackgroundAnimated"
								:min="0"
								:max="bgDurationSec"
								:step="0.1"
								unit="с"
								@update:model-value="onTrimStart"
							/>
						</div>
					</div>
					<div class="setting-row" :class="{ 'modlex-locked': !modlexGlobalBackgroundAnimated }" :inert="!modlexGlobalBackgroundAnimated">
						<div class="setting-row__info">
							<h3 class="setting-row__label">Конец видео</h3>
						</div>
						<div class="modlex-slider">
							<Slider
								:model-value="trimEndSec"
								:disabled="!modlexGlobalBackgroundAnimated"
								:min="0"
								:max="bgDurationSec"
								:step="0.1"
								unit="с"
								@update:model-value="onTrimEnd"
							/>
						</div>
					</div>
					<div class="setting-row" :class="{ 'modlex-locked': modlexGlobalBackgroundAnimated }" :inert="modlexGlobalBackgroundAnimated">
						<div class="setting-row__info">
							<h3 class="setting-row__label">Кадр для паузы</h3>
							<p class="setting-row__desc">Этот кадр показывается, когда анимация выключена.</p>
						</div>
						<div class="modlex-slider">
							<Slider
								:model-value="freezeSec"
								:disabled="modlexGlobalBackgroundAnimated"
								:min="0"
								:max="bgDurationSec"
								:step="0.1"
								unit="с"
								@update:model-value="onFreeze"
							/>
						</div>
					</div>
				</template>
			</template>
		</div>

		<!-- Консоль запуска -->
		<div class="settings-section" data-settings-anchor="console" data-settings-keywords="консоль запуска лог логи журнал матрица дождь надпись текст цвет символы" data-settings-label="Консоль">
			<h2 class="settings-section__title">Консоль запуска</h2>
			<p class="settings-section__desc">
				Надпись на пустом экране консоли (пока нет запущенного процесса) и её размер.
			</p>
			<!-- ===== MODLEX: превью и ползунки размера/зазора временно отключены,
			<div class="console-preview">
				<BaseTerminal
					ref="previewTerminal"
					empty-state-type="instance"
					:empty-state-text="modlexConsoleText || undefined"
					:empty-state-scale="modlexConsoleScale || undefined"
					:empty-state-letter-gap="modlexConsoleLetterGap"
					:empty-state-fill-char="modlexConsoleFillChar || undefined"
					:empty-state-rain-chars="modlexConsoleRainChars || undefined"
					@ready="previewTerminal?.writeEmptyState()"
				/>
			</div>
			-->
			<div class="console-settings-controls">
				<label class="console-field">
					<span class="console-field__label">Надпись</span>
					<input
						v-model="modlexConsoleText"
						type="text"
						maxlength="20"
						placeholder="NO SIGNAL"
						class="console-text-input"
						autocomplete="off"
						autocorrect="off"
						spellcheck="false"
						data-1p-ignore
						data-lpignore="true"
					/>
				</label>
				<!--
				<label class="console-field">
					<span class="console-field__label">
						Размер {{ modlexConsoleScale > 0 ? `(${modlexConsoleScale})` : '(авто)' }}
					</span>
					<input v-model.number="modlexConsoleScale" type="range" min="0" max="6" step="1" />
				</label>
				<label class="console-field">
					<span class="console-field__label"
						>Зазор между буквами ({{ modlexConsoleLetterGap }})</span
					>
					<input v-model.number="modlexConsoleLetterGap" type="range" min="0" max="6" step="1" />
				</label>
				-->
				<label class="console-field">
					<span class="console-field__label">Символ, которым закрашены буквы</span>
					<input
						v-model="modlexConsoleFillChar"
						type="text"
						maxlength="1"
						placeholder="#"
						class="console-text-input console-text-input--narrow"
						autocomplete="off"
						spellcheck="false"
					/>
				</label>
				<label class="console-field">
					<span class="console-field__label">Алфавит символов дождя</span>
					<input
						v-model="modlexConsoleRainChars"
						type="text"
						placeholder="ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789"
						class="console-text-input"
						autocomplete="off"
						spellcheck="false"
					/>
				</label>
			</div>

			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Анимация матричного дождя</h3>
					<p class="setting-row__desc">
						Прикольная анимация в пустой консоле при не запущенной игре
						Интересный факт: если выключено на пустом экране консоли будет волк
					</p>
				</div>
				<Toggle v-model="modlexConsoleRainEnabled" />
			</div>

			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Цвет заполняющих символов</h3>
					<p class="setting-row__desc">
						Только для букв в матричном дожде —
						{{ modlexConsoleFillColor ? modlexConsoleFillColor : 'стандартный (серый)' }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="color"
						class="color-picker"
						:value="modlexConsoleFillColor || DEFAULT_CONSOLE_FILL"
						@input="modlexConsoleFillColor = ($event.target as HTMLInputElement).value"
					/>
					<Button
						v-if="modlexConsoleFillColor"
						type="outlined"
						size="sm"
						native-type="button"
						@click="modlexConsoleFillColor = ''"
						>Сбросить</Button
					>
				</div>
			</div>

			<div v-if="modlexConsoleRainEnabled" class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Цвет символов дождя</h3>
					<p class="setting-row__desc">
						{{ modlexConsoleRainColor ? modlexConsoleRainColor : 'стандартный (зелёный)' }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="color"
						class="color-picker"
						:value="modlexConsoleRainColor || DEFAULT_CONSOLE_RAIN"
						@input="modlexConsoleRainColor = ($event.target as HTMLInputElement).value"
					/>
					<Button
						v-if="modlexConsoleRainColor"
						type="outlined"
						size="sm"
						native-type="button"
						@click="modlexConsoleRainColor = ''"
						>Сбросить</Button
					>
				</div>
			</div>

			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Фон консоли</h3>
					<p class="setting-row__desc">
						Отдельный цвет от общего фона лаунчера —
						{{ modlexConsoleBgColor ? modlexConsoleBgColor : 'стандартный цвет темы' }}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<input
						type="color"
						class="color-picker"
						:value="modlexConsoleBgColor || DEFAULT_CONSOLE_BG"
						@input="modlexConsoleBgColor = ($event.target as HTMLInputElement).value"
					/>
					<Button
						v-if="modlexConsoleBgColor"
						type="outlined"
						size="sm"
						native-type="button"
						@click="modlexConsoleBgColor = ''"
						>Сбросить</Button
					>
				</div>
			</div>

			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Сбросить настройки консоли</h3>
					<p class="setting-row__desc">Вернуть надпись, символы и цвета консоли к стандартным</p>
				</div>
				<Button type="outlined" size="sm" native-type="button" @click="resetConsoleSettings">
					Сбросить всё
				</Button>
			</div>
		</div>

		<!-- Discord -->
		<div class="settings-section" data-settings-anchor="discord" data-settings-keywords="дискорд discord rpc присутствие статус активность игра" data-settings-label="Discord">
			<h2 class="settings-section__title">Discord Rich Presence</h2>
			<p class="settings-section__desc">
				Свой текст статуса вместо "Играет {{ '{instance}' }}" — работает, если Discord Rich Presence
				включён в Настройки → Аккаунт → Приватность.
			</p>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Текст статуса</h3>
					<p class="setting-row__desc">{{ '{instance}' }} — подставляет имя запущенного инстанса</p>
				</div>
				<input
					:value="discordMessage"
					type="text"
					maxlength="128"
					placeholder="Играет {instance}"
					class="console-text-input"
					autocomplete="off"
					spellcheck="false"
					@input="onDiscordMessageInput(($event.target as HTMLInputElement).value)"
				/>
			</div>

			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Текст бездействия</h3>
					<p class="setting-row__desc">Показывается, когда нет запущенного инстанса</p>
				</div>
				<input
					:value="discordIdleMessage"
					type="text"
					maxlength="128"
					placeholder="Бездействует..."
					class="console-text-input"
					autocomplete="off"
					spellcheck="false"
					@input="onDiscordIdleMessageInput(($event.target as HTMLInputElement).value)"
				/>
			</div>
		</div>

		<!-- Запуск -->
		<div v-if="multiLaunchFeatureEnabled" class="settings-section" data-settings-anchor="launch" data-settings-keywords="запуск мультизапуск несколько аккаунтов одновременно мульти" data-settings-label="Запуск">
			<h2 class="settings-section__title">Запуск</h2>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Отключить запуск нескольких аккаунтов</h3>
					<p class="setting-row__desc">
						Убирает кнопку "Запуск как несколько аккаунтов" со страницы инстанса.
					</p>
				</div>
				<Toggle v-model="modlexHideMultiLaunch" />
			</div>
		</div>

		<!-- Уведомления -->
		<div class="settings-section" data-settings-anchor="notifications" data-settings-keywords="уведомления предупреждения подсказки mojang моджанг серверы недоступны авторизация майнкрафт закрыть скрыть чек-лист начало работы мультиплеер" data-settings-label="Уведомления">
			<h2 class="settings-section__title">Уведомления</h2>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Предупреждать о недоступности серверов Mojang</h3>
					<p class="setting-row__desc">
						Жёлтая плашка сверху, когда серверы авторизации Mojang не отвечают.
					</p>
				</div>
				<Toggle v-model="modlexNotifyAuthUnreachable" />
			</div>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Скрытые подсказки</h3>
					<p class="setting-row__desc">
						Подсказки, закрытые крестиком (список «Начало работы», предупреждение про мультиплеер на
						1.16.5), можно вернуть.
					</p>
				</div>
				<Button type="outlined" size="sm" native-type="button" @click="resetDismissedHints">
					Показать снова
				</Button>
			</div>
		</div>

		<!-- Обновления -->
		<div class="settings-section" data-settings-anchor="updates" data-settings-keywords="обновления обновить версия бета канал релиз апдейт update" data-settings-label="Обновления">
			<h2 class="settings-section__title">Обновления</h2>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Канал обновлений</h3>
					<p class="setting-row__desc">
						{{
							updateChannel === 'beta'
								? 'Сейчас вы на бета-канале — получаете тестовые версии раньше остальных.'
								: 'Публичный канал — стабильные версии.'
						}}
					</p>
				</div>
				<div
					v-if="updateChannel === 'stable'"
					class="toggle-lock-wrapper"
					:class="{ 'toggle-lock-wrapper--locked': switchToBetaLocked }"
				>
					<Button type="colored" color="brand" native-type="button" @click="onSwitchToBetaClick"
						>Включить бета-канал</Button
					>
				</div>
				<div
					v-else
					class="toggle-lock-wrapper"
					:class="{ 'toggle-lock-wrapper--locked': switchToStableLocked }"
				>
					<Button
						type="outlined"
						native-type="button"
						:disabled="switchingChannel"
						@click="onSwitchToStableClick"
					>
						Вернуться на публичный канал
					</Button>
				</div>
			</div>
		</div>

		<BetaChannelModal ref="betaModal" @approved="onBetaApproved" />

		<!-- Контент -->
		<div class="settings-section" data-settings-anchor="content" data-settings-keywords="контент моды ресурспаки шейдеры установка пакеты" data-settings-label="Контент">
			<h2 class="settings-section__title">Контент</h2>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Источник новостей</h3>
					<p class="setting-row__desc">Откуда загружать новости в правой панели.</p>
				</div>
				<DropdownSelect
					v-model="modlexNewsSource"
					name="news-source"
					:options="newsSourceOptions"
					:display-name="getNewsLabel"
					class="settings-dropdown"
				/>
			</div>
		</div>

		<!-- Оформление инстансов -->
		<div class="settings-section" data-settings-anchor="instance-look" data-settings-keywords="оформление инстанс инстансов сборки сборка автор авторов хедер карточка баннер логотип анимации анимация картинка статика" data-settings-label="Оформление инстансов">
			<h2 class="settings-section__title">Оформление инстансов</h2>
			<p class="settings-section__desc">
				Авторы сборок могут задать свой хедер, карточку, баннер и логотип.
			</p>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Оформление от авторов сборок</h3>
				</div>
				<DropdownSelect
					v-model="modlexInstanceCustomizationMode"
					name="instance-customization-mode"
					:options="instanceCustomizationModes"
					:display-name="getCustomizationModeLabel"
					class="settings-dropdown"
				/>
			</div>
			<div
				class="setting-row"
				:class="{ 'modlex-locked': modlexInstanceCustomizationMode !== 'all' }"
				:inert="modlexInstanceCustomizationMode !== 'all'"
			>
				<div class="setting-row__info">
					<h3 class="setting-row__label">Анимации оформления</h3>
					<p class="setting-row__desc">Можно выключить, если карточки и страницы тормозят.</p>
				</div>
				<Toggle v-model="modlexInstanceAnimations" />
			</div>
		</div>

		<!-- Платформы поиска -->
		<div class="settings-section" data-settings-anchor="platforms" data-settings-keywords="платформы поиск модов curseforge курсфордж modrinth модринт источники каталог" data-settings-label="Платформы">
			<h2 class="settings-section__title">Платформы</h2>
			<p class="settings-section__desc">
				Управляйте источниками при поиске и установке модов. Хотя бы одна платформа должна
				оставаться включённой
			</p>

			<!-- Modrinth -->
			<div class="setting-row platform-row">
				<div class="platform-logo modrinth-logo">
					<img src="https://cdn.modrinth.com/modrinth-new.png" alt="Modrinth" />
				</div>
				<div class="setting-row__info">
					<h3 class="setting-row__label">Modrinth</h3>
					<p class="setting-row__desc">Официальный магазин модов Modrinth.</p>
				</div>
				<Toggle :model-value="modlexEnableModrinth" @update:model-value="onToggleModrinth" />
			</div>

			<!-- CurseForge -->
			<div class="setting-row platform-row">
				<div class="platform-logo cf-logo">
					<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M8 6h10l-3 7h5L9 28l3-11H7L8 6z" fill="#F16436" />
					</svg>
				</div>
				<div class="setting-row__info">
					<h3 class="setting-row__label">CurseForge</h3>
					<p class="setting-row__desc">Крупнейший архив модов для Minecraft.</p>
				</div>
				<div class="toggle-lock-wrapper" :class="{ 'toggle-lock-wrapper--locked': cfLocked }">
					<Toggle :model-value="cfDisplayValue" @update:model-value="onToggleCurseForge" />
				</div>
			</div>

			<p v-if="!modlexEnableModrinth && !cfDisplayValue" class="platform-warning">
				⚠ Включите хотя бы одну платформу.
			</p>
		</div>

		<!-- Для опытных — всегда в самом конце -->
		<div class="settings-section" data-settings-anchor="experienced" data-settings-keywords="для опытных опытные экспертные эксперимент риск хостс hosts мультиплеер офлайн" data-settings-label="Для опытных">
			<h2 class="settings-section__title">Для опытных пользователей</h2>
			<div class="setting-row">
				<div class="setting-row__info">
					<h3 class="setting-row__label">Показать вкладку "Для опытных"</h3>
					<p class="setting-row__desc">
						Открывает отдельную вкладку с настройками, которые либо рискованны для обычного
						пользователя, либо требуют понимания последствий (например, автофикс мультиплеера через
						hosts). Требует осознанного подтверждения.
					</p>
				</div>
				<Toggle :model-value="modlexExperiencedModeUnlocked" @update:model-value="onExperiencedToggle" />
			</div>
		</div>

		<ExperiencedModeUnlockModal ref="unlockModal" />
	</div>
</template>

<script setup lang="ts">
import { SearchIcon, XIcon } from '@modrinth/assets'
import { Button, DropdownSelect, Slider, Toggle } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, onUpdated, ref, watch } from 'vue'

import GifCanvas from '@/components/ui/GifCanvas.vue'
import { gifDecodingSupported, readGifInfo } from '@/helpers/gif-frames'
import { resetDismissedHints } from '@/helpers/modlex-dismissed'
import { createSearchMatcher } from '@/helpers/modlex-search'

import ExperiencedModeUnlockModal from '@/components/ui/settings/ExperiencedModeUnlockModal.vue'
import BetaChannelModal from '@/components/ui/modal/BetaChannelModal.vue'
import { useFeatureFlag } from '@/helpers/feature-flags'
import {
	exportLayoutCode,
	modlexAutoAccentFromWallpaper,
	modlexAutoThemeFromWallpaper,
	modlexSettingsSearchVisible,
	modlexWallpaperAccent,
	exportThemeCode,
	importLayoutCode,
	importThemeCode,
	modlexAccentColor,
	modlexBgColor,
	modlexConsoleBgColor,
	modlexConsoleFillChar,
	modlexConsoleFillColor,
	modlexConsoleRainChars,
	modlexConsoleRainColor,
	modlexConsoleRainEnabled,
	modlexConsoleText,
	modlexDividerColor,
	modlexDoubleBorderEnabled,
	modlexDoubleBorderInner,
	modlexDoubleBorderOuter,
	modlexEnableCurseForge,
	modlexEnableModrinth,
	modlexExperiencedModeUnlocked,
	modlexFloatingGlassEffect,
	type InstanceCustomizationMode,
	modlexHomeCardSize,
	modlexHomeJumpInSize,
	modlexInstanceAnimations,
	modlexInstanceCustomizationMode,
	modlexNotifyAuthUnreachable,
	modlexUseWallpaperLayout,
	modlexWallpaperLayoutActive,
	modlexWallpaperLayoutHint,
	modlexHomeShowJumpIn,
	modlexHomeShowLibrary,
	modlexHomeShowLibrarySearch,
	modlexNavGlassBlur,
	modlexNavGlassEnabled,
	modlexNavGlassOpacity,
	modlexHideAiAgent,
	modlexHideFloatingAccountWidget,
	modlexHideFriends,
	modlexHideMultiLaunch,
	modlexHideMusicTab,
	modlexHideRightSidebar,
	modlexHideServers,
	modlexIconColor,
	modlexNewsSource,
	modlexPanelColor,
	modlexTextColor,
	modlexTextOutlineColor,
	modlexTextOutlineEnabled,
	type NewsSource,
	resetConsoleSettings,
} from '@/helpers/modlex-settings'
import { convertFileSrc } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { stat } from '@tauri-apps/plugin-fs'

import {
	globalBackgroundAnimated as modlexGlobalBackgroundAnimated,
	globalBackgroundBlurPx as modlexGlobalBackgroundBlurPx,
	globalBackgroundIsAnimated,
	globalBackgroundIsGif,
	globalBackgroundIsHtml,
	globalBackgroundIsVideo,
	globalBackgroundOpacity as modlexGlobalBackgroundOpacity,
	globalBackgroundFreezeAt,
	globalBackgroundVolume as modlexGlobalBackgroundVolume,
	globalBackgroundPath,
	globalBackgroundTrimEnd,
	globalBackgroundTrimStart,
	persistBackgroundRange,
	persistBackgroundVolume,
	persistGlobalBackground,
	refreshGlobalBackground,
} from '@/helpers/global-background'
import {
	get as getSettings,
	modlexCacheGlobalBackground,
	modlexRemoveCachedGlobalBackground,
	set as setSettings,
} from '@/helpers/settings'
import { requestImmediateUpdateCheck } from '@/providers/app-update'

// ===== MODLEX: поиск по вкладке ModLEX =====
// Фильтрует только эту страницу (строки настроек и секции целиком), левый
// список вкладок не трогает. Работает по DOM: разметка секций остаётся как есть.
const rootEl = ref<HTMLElement | null>(null)
const searchQuery = ref('')
const searchEmpty = ref(false)

function hideSearch() {
	searchQuery.value = ''
	modlexSettingsSearchVisible.value = false
}

function applySearch() {
	const root = rootEl.value
	if (!root) return
	const query = modlexSettingsSearchVisible.value ? searchQuery.value.trim() : ''
	const matches = createSearchMatcher(query)
	let visibleSections = 0
	root.querySelectorAll<HTMLElement>('.settings-section').forEach((section) => {
		const title = section.querySelector('.settings-section__title')?.textContent ?? ''
		const keywords = section.dataset.settingsKeywords ?? ''
		// попали в название/ключевые слова секции — показываем её целиком
		const sectionHit = !!query && matches(title + ' ' + keywords)
		let anyRow = false
		section.querySelectorAll<HTMLElement>('.setting-row').forEach((row) => {
			const match = !query || sectionHit || matches(row.textContent ?? '')
			row.style.display = match ? '' : 'none'
			if (match) anyRow = true
		})
		const showSection = !query || sectionHit || anyRow
		section.style.display = showSection ? '' : 'none'
		if (showSection) visibleSections++
	})
	searchEmpty.value = !!query && visibleSections === 0
}

watch([searchQuery, modlexSettingsSearchVisible], applySearch)
onUpdated(applySearch)
// ===== END MODLEX =====

// ===== MODLEX: разлок вкладки "Для опытных" =====
const unlockModal = ref<InstanceType<typeof ExperiencedModeUnlockModal>>()

function onExperiencedToggle(value: boolean) {
	if (value) {
		unlockModal.value?.show()
		return
	}
	modlexExperiencedModeUnlocked.value = false
}
// ===== END MODLEX =====

// ===== MODLEX: фон лаунчера =====
const pickingBackground = ref(false)
const backgroundSizeWarning = ref('')
const BACKGROUND_SIZE_WARNING_THRESHOLD_MB = 100

onMounted(refreshGlobalBackground)

const globalBackgroundPreviewUrl = computed(() =>
	globalBackgroundPath.value ? convertFileSrc(globalBackgroundPath.value) : null,
)

async function pickGlobalBackground() {
	const selected = await open({
		multiple: false,
		filters: [
			{
				name: 'Изображение / GIF / видео',
				extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'mp4', 'webm', 'mov', 'mkv', 'html', 'htm'],
			},
		],
	})
	if (!selected) return

	pickingBackground.value = true
	backgroundSizeWarning.value = ''
	try {
		const fileInfo = await stat(selected)
		if (fileInfo.size / (1024 * 1024) > BACKGROUND_SIZE_WARNING_THRESHOLD_MB) {
			backgroundSizeWarning.value = `Файл ${(fileInfo.size / (1024 * 1024)).toFixed(0)} МБ — на слабых устройствах может тормозить.`
		}

		const previousPath = globalBackgroundPath.value
		const cachedPath = await modlexCacheGlobalBackground(selected)
		await persistGlobalBackground({ path: cachedPath })
		if (previousPath && previousPath !== cachedPath) {
			await modlexRemoveCachedGlobalBackground(previousPath).catch(() => {})
		}
	} catch (error) {
		showInlineNotice(error instanceof Error ? error.message : 'Не удалось установить фон')
	} finally {
		pickingBackground.value = false
	}
}

async function removeGlobalBackground() {
	const previousPath = globalBackgroundPath.value
	await persistGlobalBackground({ path: null })
	backgroundSizeWarning.value = ''
	if (previousPath) {
		await modlexRemoveCachedGlobalBackground(previousPath).catch(() => {})
	}
}

function onOpacityChange(percent: number) {
	persistGlobalBackground({ opacity: percent / 100 })
}

function onBackgroundVolume(percent: number) {
	persistBackgroundVolume(percent / 100)
}

function onBlurChange(value: number) {
	persistGlobalBackground({ blurPx: value })
}

const modlexNavGlassOpacityPct = computed({
	get: () => Math.round(modlexNavGlassOpacity.value * 100),
	set: (percent: number) => {
		modlexNavGlassOpacity.value = percent / 100
	},
})

// Отрезок видео и кадр паузы. Длительность берём из метаданных превью.
const bgPreviewVideo = ref<HTMLVideoElement | null>(null)
const bgDurationSec = ref(0)
// GIF: длительность считаем по кадрам (WebCodecs); если декодера нет — отрезок для GIF недоступен
const gifPreviewFailed = ref(false)
const gifPreviewAt = ref(-1)
const gifTimelineSupported = computed(() => gifDecodingSupported && !gifPreviewFailed.value)
watch(
	globalBackgroundPath,
	() => {
		bgDurationSec.value = 0
		gifPreviewFailed.value = false
		gifPreviewAt.value = -1
		if (globalBackgroundIsGif.value && gifDecodingSupported && globalBackgroundPreviewUrl.value) {
			readGifInfo(globalBackgroundPreviewUrl.value)
				.then((info) => {
					bgDurationSec.value = Math.floor(info.totalMs / 100) / 10
				})
				.catch(() => {
					gifPreviewFailed.value = true
				})
		}
	},
	{ immediate: true },
)
function onPreviewMeta(event: Event) {
	const duration = (event.target as HTMLVideoElement).duration
	bgDurationSec.value = Number.isFinite(duration) ? Math.floor(duration * 10) / 10 : 0
}
const trimStartSec = computed(() => globalBackgroundTrimStart.value)
const trimEndSec = computed(() =>
	globalBackgroundTrimEnd.value > 0 ? globalBackgroundTrimEnd.value : bgDurationSec.value,
)
const freezeSec = computed(() =>
	globalBackgroundFreezeAt.value >= 0 ? globalBackgroundFreezeAt.value : globalBackgroundTrimStart.value,
)
function scrubPreview(seconds: number) {
	if (globalBackgroundIsGif.value) {
		gifPreviewAt.value = seconds
		return
	}
	const video = bgPreviewVideo.value
	if (!video) return
	try {
		video.currentTime = seconds
	} catch {
		// метаданные ещё не готовы
	}
}
function onTrimStart(value: number) {
	const start = Math.min(value, Math.max(0, trimEndSec.value - 0.1))
	persistBackgroundRange({ start })
	scrubPreview(start)
}
function onTrimEnd(value: number) {
	const end = Math.max(value, trimStartSec.value + 0.1)
	// «до конца файла» храним как 0
	persistBackgroundRange({ end: end >= bgDurationSec.value - 0.05 ? 0 : end })
	scrubPreview(end)
}
function onFreeze(value: number) {
	persistBackgroundRange({ freeze: value })
	scrubPreview(value)
}

function onAnimatedToggle(value: boolean | undefined) {
	persistGlobalBackground({ animated: !!value })
}

// ModLEX: превью фона в настройках — статичный кадр (без autoplay): живое видео рядом с
// таким же на главной удваивало декодирование и заметно лагало при открытых настройках.
// ===== END MODLEX =====

const newsSourceOptions: NewsSource[] = ['github', 'modrinth', 'off']

const instanceCustomizationModes: InstanceCustomizationMode[] = ['all', 'static', 'off']
function getCustomizationModeLabel(value: InstanceCustomizationMode): string {
	return { all: 'Всё', static: 'Только статика', off: 'Выключено' }[value] ?? value
}

function getNewsLabel(value: NewsSource): string {
	return { github: 'GitHub', modrinth: 'Modrinth', off: 'Выключено' }[value] ?? value
}

const { locked: cfLocked, message: cfLockedMessage } = useFeatureFlag('curseforge_platform_v2')
const { locked: switchToStableLocked, message: switchToStableLockedMessage } = useFeatureFlag(
	'switch_to_stable_channel',
)
const { locked: switchToBetaLocked, message: switchToBetaLockedMessage } =
	useFeatureFlag('switch_to_beta_channel')
const { enabled: musicFeatureEnabled } = useFeatureFlag('modlex_music')
const { enabled: multiLaunchFeatureEnabled } = useFeatureFlag('multi_account_launch')

const cfDisplayValue = computed(() => (cfLocked.value ? false : modlexEnableCurseForge.value))

// ===== MODLEX: акцентный цвет =====
const DEFAULT_ACCENT = '#8e32f3'
const accentColorForPicker = computed(() => modlexAccentColor.value || DEFAULT_ACCENT)
// ===== END MODLEX =====

// ===== MODLEX: расширенная кастомизация цвета =====
const showAdvancedTheme = ref(false)
const DEFAULT_BG = '#16181c'
const DEFAULT_PANEL = '#27292e'
const DEFAULT_TEXT = '#ffffff'
const DEFAULT_ICON = '#b0bac5'
const DEFAULT_CONSOLE_FILL = '#808080'
const DEFAULT_CONSOLE_RAIN = '#33ff33'
const DEFAULT_CONSOLE_BG = '#16181c'
const DEFAULT_DIVIDER = '#34363c'
// ===== END MODLEX =====

// ===== MODLEX: превью консоли запуска — временно отключено, см. шаблон выше =====
// const previewTerminal = ref<InstanceType<typeof BaseTerminal>>()
// ===== END MODLEX =====

const inlineNotice = ref<string | null>(null)
let inlineNoticeTimeout: ReturnType<typeof setTimeout> | null = null

function showInlineNotice(text: string) {
	if (inlineNoticeTimeout) clearTimeout(inlineNoticeTimeout)
	inlineNotice.value = text
	inlineNoticeTimeout = setTimeout(() => {
		inlineNotice.value = null
	}, 6000)
}

// ===== MODLEX: экспорт/импорт кода темы =====
const importThemeCodeInput = ref('')

async function copyThemeCode() {
	const code = exportThemeCode()
	try {
		await navigator.clipboard.writeText(code)
		showInlineNotice('Код темы скопирован в буфер обмена')
	} catch {
		console.log('[ModLEX] код темы:', code)
		showInlineNotice('Не удалось скопировать — код выведен в консоль')
	}
}

function applyThemeCodeInput() {
	if (!importThemeCodeInput.value.trim()) return
	const ok = importThemeCode(importThemeCodeInput.value)
	showInlineNotice(ok ? 'Тема применена' : 'Не удалось прочитать код темы')
	if (ok) importThemeCodeInput.value = ''
}
const importLayoutCodeInput = ref('')

async function copyLayoutCode() {
	const code = exportLayoutCode()
	try {
		await navigator.clipboard.writeText(code)
		showInlineNotice('Код раскладки скопирован в буфер обмена')
	} catch {
		console.log('[ModLEX] код раскладки:', code)
		showInlineNotice('Не удалось скопировать — код выведен в консоль')
	}
}

function applyLayoutCodeInput() {
	if (!importLayoutCodeInput.value.trim()) return
	const ok = importLayoutCode(importLayoutCodeInput.value)
	showInlineNotice(ok ? 'Раскладка применена' : 'Не удалось прочитать код раскладки')
	if (ok) importLayoutCodeInput.value = ''
}
// ===== END MODLEX =====

// ===== MODLEX: канал обновлений =====
const updateChannel = ref<'stable' | 'beta'>('stable')
const switchingChannel = ref(false)
const betaModal = ref<InstanceType<typeof BetaChannelModal>>()

onMounted(async () => {
	updateChannel.value = (await getSettings()).modlex_update_channel ?? 'stable'
})

async function onBetaApproved() {
	switchingChannel.value = true
	try {
		const settings = await getSettings()
		settings.modlex_update_channel = 'beta'
		settings.modlex_beta_verified = true
		await setSettings(settings)
		updateChannel.value = 'beta'
		// Небольшая задержка — чтобы пользователь успел увидеть подтверждение
		// в модалке перед тем, как она закроется.
		setTimeout(() => betaModal.value?.hide(), 1200)
		// Немедленно перепроверяет обновления на новом канале и, если что-то
		// найдётся, сама скачивает и ставит — без ручного подтверждения
		// "Перезапустить и обновить", в отличие от обычного публичного канала.
		await requestImmediateUpdateCheck()
	} finally {
		switchingChannel.value = false
	}
}

async function returnToStableChannel() {
	switchingChannel.value = true
	try {
		const settings = await getSettings()
		settings.modlex_update_channel = 'stable'
		await setSettings(settings)
		updateChannel.value = 'stable'
	} finally {
		switchingChannel.value = false
	}
}

function onSwitchToBetaClick() {
	if (switchToBetaLocked.value) {
		showInlineNotice(switchToBetaLockedMessage.value)
		return
	}
	betaModal?.value?.show()
}

function onSwitchToStableClick() {
	if (switchToStableLocked.value) {
		showInlineNotice(switchToStableLockedMessage.value)
		return
	}
	returnToStableChannel()
}
// ===== END MODLEX =====

// ===== MODLEX: текст Discord Rich Presence =====
const discordMessage = ref('')
const discordIdleMessage = ref('')
let discordMessageSaveTimeout: ReturnType<typeof setTimeout> | null = null
let discordIdleMessageSaveTimeout: ReturnType<typeof setTimeout> | null = null

onMounted(async () => {
	const settings = await getSettings()
	discordMessage.value = settings.modlex_discord_message ?? ''
	discordIdleMessage.value = settings.modlex_discord_idle_message ?? ''
})

function onDiscordMessageInput(value: string) {
	discordMessage.value = value
	if (discordMessageSaveTimeout) clearTimeout(discordMessageSaveTimeout)
	discordMessageSaveTimeout = setTimeout(async () => {
		const settings = await getSettings()
		settings.modlex_discord_message = value.trim() || null
		await setSettings(settings)
	}, 500)
}

function onDiscordIdleMessageInput(value: string) {
	discordIdleMessage.value = value
	if (discordIdleMessageSaveTimeout) clearTimeout(discordIdleMessageSaveTimeout)
	discordIdleMessageSaveTimeout = setTimeout(async () => {
		const settings = await getSettings()
		settings.modlex_discord_idle_message = value.trim() || null
		await setSettings(settings)
	}, 500)
}

// ===== END MODLEX =====

onBeforeUnmount(() => {
	if (inlineNoticeTimeout) clearTimeout(inlineNoticeTimeout)
	if (discordMessageSaveTimeout) clearTimeout(discordMessageSaveTimeout)
	if (discordIdleMessageSaveTimeout) clearTimeout(discordIdleMessageSaveTimeout)
})

function onToggleModrinth(value: boolean) {
	if (!value && modlexEnableModrinth.value && !cfDisplayValue.value) {
		showInlineNotice(
			'Нельзя отключить: должна остаться включённой хотя бы одна платформа, а CurseForge сейчас недоступен.',
		)
		return
	}
	modlexEnableModrinth.value = value
}

function onToggleCurseForge(value: boolean) {
	if (cfLocked.value) {
		showInlineNotice(cfLockedMessage.value)
		return
	}
	if (!value && modlexEnableCurseForge.value && !modlexEnableModrinth.value) {
		showInlineNotice('Нельзя отключить: должна остаться включённой хотя бы одна платформа.')
		return
	}
	modlexEnableCurseForge.value = value
}
</script>

<style scoped>
.settings-section {
	padding-bottom: 1.25rem;
	margin-bottom: 1.25rem;
	border-bottom: 1px solid var(--color-divider);
}

.settings-section:last-child {
	border-bottom: none;
	margin-bottom: 0;
	padding-bottom: 0;
}

.modlex-locked {
	opacity: 0.4;
	pointer-events: none;
}

[data-settings-anchor] {
	scroll-margin-top: 4.5rem;
}

.settings-section__title {
	font-size: 1.1rem;
	font-weight: 600;
	margin-bottom: 0.75rem;
	color: var(--color-contrast);
}

.settings-section__desc {
	margin: 0 0 1rem;
	font-size: 0.875rem;
	color: var(--color-secondary);
}

.setting-row {
	display: flex;
	align-items: center;
	gap: 1rem;
	padding: 0.5rem 0;
}

.setting-row__info {
	flex: 1;
	min-width: 0;
}

.setting-row__label {
	margin: 0 0 0.2rem;
	font-size: 1rem;
	font-weight: 700;
	color: var(--color-contrast);
}

.setting-row__desc {
	margin: 0;
	font-size: 0.875rem;
	color: var(--color-secondary);
}

.platform-row {
	gap: 0.75rem;
}

.platform-logo {
	width: 2rem;
	height: 2rem;
	flex-shrink: 0;
	border-radius: 0.375rem;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.platform-logo img,
.platform-logo svg {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

.modrinth-logo {
	background: #1bd96a1a;
}

.cf-logo {
	background: #f164361a;
}

.settings-dropdown {
	flex-shrink: 0;
	min-width: 140px;
}

.platform-warning {
	margin: 0.5rem 0 0;
	font-size: 0.8rem;
	color: var(--color-orange);
}

.bg-preview {
	width: 100%;
	max-width: 24rem;
	aspect-ratio: 16 / 9;
	border-radius: 0.75rem;
	overflow: hidden;
	border: 1px solid var(--color-button-bg);
	margin-bottom: 0.75rem;
}

.bg-preview__media {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.modlex-slider {
	width: 20rem;
	max-width: 100%;
}

.toggle-lock-wrapper--locked {
	opacity: 0.5;
	filter: grayscale(1);
}

.toggle-lock-wrapper--locked :deep(button) {
	cursor: not-allowed;
}

.settings-notice {
	width: fit-content;
	max-width: 26rem;
	margin-bottom: 0.5rem;
	padding: 0.6rem 1.1rem;
	border-radius: 999px;
	border: 1px solid rgba(255, 255, 255, 0.25);
	background: rgba(59, 130, 246, 0.28);
	/* ModLEX: сборка минифицирует соседние backdrop-filter/-webkit-backdrop-filter
	   с одинаковым значением так, что стандартное свойство пропадает — не пишем
	   -webkit-, WebView2 в нём не нуждается. */
	backdrop-filter: blur(16px);
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
	color: #fff;
	font-size: 0.875rem;
	font-weight: 600;
	text-align: center;
}

.settings-notice-fade-enter-active,
.settings-notice-fade-leave-active {
	transition:
		opacity 0.2s ease,
		transform 0.2s ease;
}

.settings-notice-fade-enter-from,
.settings-notice-fade-leave-to {
	opacity: 0;
	transform: translateY(-0.5rem);
}

.advanced-theme {
	margin-top: 0.75rem;
	padding-top: 0.75rem;
	border-top: 1px solid var(--color-divider);
}

.color-picker {
	width: 2.25rem;
	height: 2.25rem;
	padding: 0;
	border: 1px solid var(--color-divider);
	border-radius: 0.5rem;
	background: none;
	cursor: pointer;
}

.color-picker::-webkit-color-swatch-wrapper {
	padding: 2px;
}

.color-picker::-webkit-color-swatch {
	border: none;
	border-radius: 0.375rem;
}

.console-settings-controls {
	display: flex;
	flex-direction: column;
	gap: 1rem;
	margin-top: 1rem;
}

.console-field {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
}

.console-field__label {
	font-size: 0.875rem;
	font-weight: 600;
	color: var(--color-contrast);
}

.console-text-input {
	padding: 0.5rem 0.75rem;
	border: 1px solid var(--color-divider);
	border-radius: 0.5rem;
	background: var(--color-button-bg);
	color: var(--color-contrast);
	font-size: 0.875rem;
}

.console-text-input--narrow {
	width: 3rem;
	text-align: center;
}

.console-preview {
	width: 100%;
	height: 260px;
	border-radius: 0.75rem;
	overflow: hidden;
}
</style>
