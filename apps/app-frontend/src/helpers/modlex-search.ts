// Нечёткий поиск по настройкам. Принцип: пользователь не знает точного названия,
// пишет как слышит и не пойдёт читать FAQ — значит поиск должен прощать:
//   • кириллицу вместо латиницы и обратно («курсфордж», «курсеворд» → CurseForge);
//   • не ту раскладку («сгкыугщкпу» → CurseForge, «шзщрштп» → Iphone…);
//   • опечатки и обрезанные слова (расстояние Левенштейна на «скелете» слова);
//   • частичный ввод («курсф» находит CurseForge).
// Основа — «фонетический скелет»: слово транслитерируется в латиницу, схлопываются
// парные/похожие согласные (б/п, д/т, г/к, в/ф, з/с, ж/ш/ч/дж → одна группа),
// гласные выбрасываются. «CurseForge», «курсфордж», «курсефордже» → одно и то же.

const RU_TO_LAT: Record<string, string> = {
	а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
	й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
	у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sh', ъ: '', ы: 'i', ь: '',
	э: 'e', ю: 'u', я: 'a',
}

const EN_TO_RU_LAYOUT: Record<string, string> = {
	q: 'й', w: 'ц', e: 'у', r: 'к', t: 'е', y: 'н', u: 'г', i: 'ш', o: 'щ', p: 'з',
	'[': 'х', ']': 'ъ', a: 'ф', s: 'ы', d: 'в', f: 'а', g: 'п', h: 'р', j: 'о', k: 'л',
	l: 'д', ';': 'ж', "'": 'э', z: 'я', x: 'ч', c: 'с', v: 'м', b: 'и', n: 'т', m: 'ь',
	',': 'б', '.': 'ю',
}
const RU_TO_EN_LAYOUT: Record<string, string> = Object.fromEntries(
	Object.entries(EN_TO_RU_LAYOUT).map(([en, ru]) => [ru, en]),
)

const CONSONANT_CLASS: Record<string, string> = {
	b: 'P', p: 'P', d: 'T', t: 'T', g: 'K', k: 'K', q: 'K', c: 'K', v: 'F', w: 'F', f: 'F',
	z: 'S', s: 'S', j: 'J', h: 'H', l: 'L', m: 'M', n: 'N', r: 'R',
	J: 'J', F: 'F', K: 'K',
}

function normalize(text: string): string {
	return text.toLowerCase().replace(/ё/g, 'е')
}

function tokenize(text: string): string[] {
	return normalize(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

function swapLayout(text: string): string {
	const lower = text.toLowerCase()
	const hasCyrillic = /[а-яё]/.test(lower)
	const map = hasCyrillic ? RU_TO_EN_LAYOUT : EN_TO_RU_LAYOUT
	return [...lower].map((ch) => map[ch] ?? ch).join('')
}

const skeletonCache = new Map<string, string>()

/** Фонетический скелет слова (см. описание вверху файла). */
export function phoneticSkeleton(word: string): string {
	const cached = skeletonCache.get(word)
	if (cached !== undefined) return cached
	let s = [...normalize(word)].map((ch) => RU_TO_LAT[ch] ?? ch).join('')
	s = s.replace(/[^a-z0-9]/g, '')
	s = s.replace(/x/g, 'ks')
	s = s.replace(/tch|dzh|dge|zh|ch|sh|ph|ck|kh/g, (m) => {
		if (m === 'ph') return 'F'
		if (m === 'ck' || m === 'kh') return 'K'
		return 'J'
	})
	s = s.replace(/g(?=[eiy])/g, 'J').replace(/c(?=[eiy])/g, 's')
	let out = ''
	for (const ch of s) {
		const cls = CONSONANT_CLASS[ch]
		if (!cls) continue // гласные и цифры-мусор выбрасываем
		if (out[out.length - 1] !== cls) out += cls
	}
	skeletonCache.set(word, out)
	return out
}

function distance(a: string, b: string, limit: number): number {
	if (Math.abs(a.length - b.length) > limit) return limit + 1
	const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
	for (let i = 1; i <= a.length; i++) {
		let diagonal = prev[0]
		prev[0] = i
		for (let j = 1; j <= b.length; j++) {
			const temp = prev[j]
			prev[j] = Math.min(
				prev[j] + 1,
				prev[j - 1] + 1,
				diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
			)
			diagonal = temp
		}
	}
	return prev[b.length]
}

interface QueryToken {
	raw: string
	skeleton: string
}

function tokenMatches(query: QueryToken, haystackNorm: string, haystackWords: string[]): boolean {
	if (haystackNorm.includes(query.raw)) return true
	const sk = query.skeleton
	if (sk.length < 2) return false
	// Короткий скелет (видео/видио, гиф/GIF): только точное совпадение скелета целого слова
	if (sk.length < 3) return query.raw.length >= 3 && haystackWords.some((word) => phoneticSkeleton(word) === sk)
	const tolerance = sk.length >= 6 ? 2 : sk.length >= 4 ? 1 : 0
	for (const word of haystackWords) {
		const hs = phoneticSkeleton(word)
		if (hs.includes(sk)) return true
		if (tolerance === 0) continue
		// опечатка в набранном слове или недописанное слово: сравниваем с началом слова
		for (let len = sk.length - 1; len <= sk.length + 1; len++) {
			if (len >= 2 && distance(sk, hs.slice(0, len), tolerance) <= tolerance) return true
		}
	}
	return false
}

/** Возвращает функцию «подходит ли этот текст запросу». Пустой запрос — всё подходит. */
export function createSearchMatcher(query: string): (haystack: string) => boolean {
	const trimmed = query.trim()
	if (!trimmed) return () => true
	const variants = Array.from(new Set([trimmed, swapLayout(trimmed)]))
	const variantTokens = variants
		.map((variant) =>
			tokenize(variant).map((raw) => ({ raw, skeleton: phoneticSkeleton(raw) }) as QueryToken),
		)
		.filter((tokens) => tokens.length > 0)
	return (haystack: string) => {
		const norm = normalize(haystack)
		const words = tokenize(haystack)
		return variantTokens.some((tokens) => tokens.every((t) => tokenMatches(t, norm, words)))
	}
}
