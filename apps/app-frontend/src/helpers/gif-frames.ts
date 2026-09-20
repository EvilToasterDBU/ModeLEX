// Покадровый доступ к GIF (и APNG/анимированному WebP) через WebCodecs ImageDecoder: браузер не
// умеет ни перематывать <img>, ни ограничивать его отрезком. Всё оборачивается в try/catch на
// стороне вызывающего — если декодера нет или файл не разбирается, показываем обычную картинку.

/* eslint-disable @typescript-eslint/no-explicit-any */
export const gifDecodingSupported = typeof (globalThis as any).ImageDecoder === 'function'

const MAX_FRAMES = 1500

export interface GifInfo {
	frameCount: number
	/** Начало каждого кадра от старта анимации, мс */
	starts: number[]
	totalMs: number
	width: number
	height: number
}

const infoCache = new Map<string, Promise<GifInfo>>()

export async function openGifDecoder(url: string): Promise<any> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`GIF: HTTP ${response.status}`)
	const blob = await response.blob()
	const decoder = new (globalThis as any).ImageDecoder({
		data: await blob.arrayBuffer(),
		type: blob.type && blob.type.startsWith('image/') ? blob.type : 'image/gif',
	})
	await decoder.tracks.ready
	return decoder
}

/** Длительность и размеры анимации: один раз проходит по кадрам, результат кешируется по URL */
export function readGifInfo(url: string, decoder?: any): Promise<GifInfo> {
	const key = url.split('?')[0]
	let cached = infoCache.get(key)
	if (!cached) {
		cached = (async () => {
			const ownDecoder = decoder ?? (await openGifDecoder(url))
			const frameCount: number = ownDecoder.tracks.selectedTrack.frameCount
			if (!frameCount || frameCount > MAX_FRAMES) throw new Error('GIF: неподходящее число кадров')
			const starts: number[] = []
			let total = 0
			let width = 0
			let height = 0
			for (let index = 0; index < frameCount; index++) {
				const { image } = await ownDecoder.decode({ frameIndex: index, completeFramesOnly: true })
				starts.push(total)
				// duration у VideoFrame — микросекунды; у GIF без задержки берём 100 мс, как браузеры
				total += Math.max(20, (image.duration ?? 100_000) / 1000)
				if (index === 0) {
					width = image.displayWidth
					height = image.displayHeight
				}
				image.close()
			}
			if (!decoder) ownDecoder.close?.()
			return { frameCount, starts, totalMs: total, width, height }
		})()
		cached.catch(() => infoCache.delete(key))
		infoCache.set(key, cached)
	}
	return cached
}

/** Номер кадра, который показывается в момент `seconds` от начала */
export function frameAt(info: GifInfo, seconds: number): number {
	const ms = Math.min(Math.max(0, seconds * 1000), Math.max(0, info.totalMs - 1))
	let low = 0
	let high = info.frameCount - 1
	while (low < high) {
		const middle = (low + high + 1) >> 1
		if (info.starts[middle] <= ms) low = middle
		else high = middle - 1
	}
	return low
}
