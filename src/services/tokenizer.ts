import type { WordToken } from '../types/caption'

const WORD_RE = /^[A-Za-z]+(?:['’][A-Za-z]+)*$/

export function tokenize(text: string): WordToken[] {
  return text.split(/(\s+)/).flatMap((part) => {
    if (!part.trim()) return [{ raw: part, normalized: '', leading: '', trailing: '', isWord: false }]
    const m = part.match(/^([^A-Za-z0-9']*)(.*?)([^A-Za-z0-9']*)$/)
    const leading = m?.[1] ?? ''
    const core = m?.[2] ?? part
    const trailing = m?.[3] ?? ''
    const normalized = core.toLowerCase()
    const isUrl = /^https?:\/\//i.test(core)
    const isNumeric = /^\d+(?:[.,]\d+)?$/.test(core)
    const isWord = WORD_RE.test(core) && !isUrl && !isNumeric
    return [{ raw: part, normalized, leading, trailing, isWord }]
  })
}
