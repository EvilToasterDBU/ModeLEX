import { arrayBufferToBase64 } from '@modrinth/utils'

import { getPlayerHeadUrl } from './rendering/batch-skin-renderer'
import steveSkinAsset from '@/assets/skins/steve.png'
import type { Skin } from './skins'

// ModLEX: steveSkinAsset is a Vite dev-server/bundle path (e.g. "/src/assets/skins/steve.png"),
// not real PNG bytes or a fetchable absolute URL — passed straight through as `Skin.texture`,
// the Rust side's `UrlOrBlob` (serde untagged) fails to parse it as a URL and falls back to
// treating the literal path STRING's bytes as the PNG blob, so `normalize_skin_texture` rejects
// it as an invalid PNG signature and the head render always fails, leaving the full 64x64 skin
// sheet showing instead of a cropped head. Fix: fetch the asset ourselves (the webview can load
// its own bundled asset fine) and pass it as a real `data:image/png;base64,...` URL, which the
// Rust side already special-cases (see `url_to_data_stream` in png_util.rs) without any network
// fetch on its end.
let steveHeadUrlPromise: Promise<string> | null = null

export function getSteveHeadUrl(): Promise<string> {
	if (!steveHeadUrlPromise) {
		steveHeadUrlPromise = (async () => {
			const buffer = await fetch(steveSkinAsset).then((res) => res.arrayBuffer())
			const steveSkinDataUrl = `data:image/png;base64,${arrayBufferToBase64(buffer)}`

			return getPlayerHeadUrl({
				texture_key: 'steve-fallback',
				name: null,
				section: null,
				variant: 'CLASSIC',
				cape_id: null,
				texture: steveSkinDataUrl,
				source: 'default',
				is_equipped: false,
			} as unknown as Skin)
		})().catch((error) => {
			console.warn('Failed to render local Steve head fallback', error)
			steveHeadUrlPromise = null
			return steveSkinAsset
		})
	}

	return steveHeadUrlPromise
}
