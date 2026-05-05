import type { CaptionSegment } from '../types/caption'
import { tokenize } from './tokenizer'

function parseXml(xml: string) {
  const doc = new DOMParser().parseFromString(xml, 'text/xml')
  const nodes = Array.from(doc.querySelectorAll('text'))
  return nodes.map((n, i) => {
    const start = Number(n.getAttribute('start') || '0')
    const dur = Number(n.getAttribute('dur') || '2')
    const original = (n.textContent || '').replace(/&#39;/g, "'")
    return { index: i, startTime: start, endTime: start + dur, original, translation: '', tokens: tokenize(original), source: 'yt-native-original' as const }
  })
}

export async function fetchTimedText(videoId: string, lang='en') : Promise<CaptionSegment[]> {
  const u = `/api/timedtext?lang=${lang}&v=${videoId}&fmt=srv3`
  const r = await fetch(u)
  if (!r.ok) throw new Error('subtitle fetch failed')
  const t = await r.text(); if (!t.includes('<text')) throw new Error('no subtitles')
  return parseXml(t)
}
