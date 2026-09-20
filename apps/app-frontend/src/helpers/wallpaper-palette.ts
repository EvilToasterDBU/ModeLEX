// Доминантный «живой» цвет обоев — для тестового режима «акцент под обои».
// Картинка/GIF читаются напрямую, у видео берётся кадр из отдельного скрытого
// <video> (показанный на экране не трогаем). Файлы отдаёт asset-протокол Tauri с
// CORS-заголовком, поэтому crossOrigin='anonymous' не «пачкает» canvas.
// HTML-обои прочитать нельзя (песочница) — для них возвращается null.

const SAMPLE_SIZE = 40

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
	const rn = r / 255
	const gn = g / 255
	const bn = b / 255
	const max = Math.max(rn, gn, bn)
	const min = Math.min(rn, gn, bn)
	const l = (max + min) / 2
	const d = max - min
	if (d === 0) return { h: 0, s: 0, l }
	const s = d / (1 - Math.abs(2 * l - 1))
	let h: number
	if (max === rn) h = ((gn - bn) / d) % 6
	else if (max === gn) h = (bn - rn) / d + 2
	else h = (rn - gn) / d + 4
	return { h: (h * 60 + 360) % 360, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
	const c = (1 - Math.abs(2 * l - 1)) * s
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
	const m = l - c / 2
	const [r, g, b] =
		h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
	const toHex = (v: number) =>
		Math.round((v + m) * 255)
			.toString(16)
			.padStart(2, '0')
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function dominantFromPixels(data: Uint8ClampedArray): string | null {
	const buckets = new Map<number, { weight: number; r: number; g: number; b: number }>()
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] < 200) continue
		const r = data[i]
		const g = data[i + 1]
		const b = data[i + 2]
		const { s, l } = rgbToHsl(r, g, b)
		// почти чёрное/белое и серое акцентом быть не может
		if (l < 0.12 || l > 0.92 || s < 0.18) continue
		const weight = 1 + s * 3
		const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4)
		const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 }
		bucket.weight += weight
		bucket.r += r * weight
		bucket.g += g * weight
		bucket.b += b * weight
		buckets.set(key, bucket)
	}
	let best: { weight: number; r: number; g: number; b: number } | null = null
	for (const bucket of buckets.values()) if (!best || bucket.weight > best.weight) best = bucket
	if (!best) return null
	const { h, s, l } = rgbToHsl(best.r / best.weight, best.g / best.weight, best.b / best.weight)
	// приводим к читаемому на тёмном интерфейсе диапазону
	return hslToHex(h, Math.max(s, 0.5), Math.min(0.68, Math.max(0.5, l)))
}

function sampleCanvas(source: CanvasImageSource): string | null {
	const canvas = document.createElement('canvas')
	canvas.width = SAMPLE_SIZE
	canvas.height = SAMPLE_SIZE
	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx) return null
	ctx.drawImage(source, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
	return dominantFromPixels(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data)
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.crossOrigin = 'anonymous'
		image.onload = () => resolve(image)
		image.onerror = () => reject(new Error('image load failed'))
		image.src = url
	})
}

function loadVideoFrame(url: string): Promise<HTMLVideoElement> {
	return new Promise((resolve, reject) => {
		const video = document.createElement('video')
		video.crossOrigin = 'anonymous'
		video.muted = true
		video.preload = 'auto'
		const timeout = setTimeout(() => reject(new Error('video frame timeout')), 8000)
		video.onerror = () => {
			clearTimeout(timeout)
			reject(new Error('video load failed'))
		}
		video.onloadeddata = () => {
			video.onseeked = () => {
				clearTimeout(timeout)
				resolve(video)
			}
			video.currentTime = Math.min(1, (video.duration || 2) / 2)
		}
		video.src = url
	})
}

export interface WallpaperTheme {
	accent: string
	bg: string
	panel: string
	divider: string
}

/** Тёмная тонированная палитра лаунчера из акцента обоев: тот же оттенок, но низкая
 * насыщенность/яркость для фона, панелей и разделителей. */
export function deriveThemeFromAccent(accentHex: string): WallpaperTheme {
	const r = parseInt(accentHex.slice(1, 3), 16)
	const g = parseInt(accentHex.slice(3, 5), 16)
	const b = parseInt(accentHex.slice(5, 7), 16)
	const { h, s } = rgbToHsl(r, g, b)
	const tint = Math.min(s, 0.6)
	return {
		accent: accentHex,
		bg: hslToHex(h, tint * 0.45, 0.065),
		panel: hslToHex(h, tint * 0.4, 0.11),
		divider: hslToHex(h, tint * 0.35, 0.22),
	}
}

/** Доминантный цвет обоев (#rrggbb) или null, если прочитать нельзя / нет «цветных» пикселей. */
export async function extractWallpaperAccent(
	url: string,
	kind: 'image' | 'video' | 'html',
): Promise<string | null> {
	if (kind === 'html') return null
	try {
		if (kind === 'image') return sampleCanvas(await loadImage(url))
		const video = await loadVideoFrame(url)
		try {
			return sampleCanvas(video)
		} finally {
			video.removeAttribute('src')
			video.load()
		}
	} catch {
		return null
	}
}
