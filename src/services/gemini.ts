import type { CaptionSegment } from '../types/caption'

async function callGemini(apiKey: string, model: string, prompt: string) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({contents:[{parts:[{text:prompt}]}]}) })
  if (!r.ok) throw new Error('Gemini request failed')
  const j = await r.json()
  return j.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

export async function translateSegments(apiKey: string, model: string, segments: CaptionSegment[]) {
  const prompt = `Translate each line to zh-TW and return JSON array of strings only: ${JSON.stringify(segments.map(s=>s.original))}`
  const text = await callGemini(apiKey, model, prompt)
  return JSON.parse(text) as string[]
}

export async function fallbackTranscript(apiKey: string, model: string, url: string) {
  const prompt = `Generate JSON array with fields startTime,endTime,original,translation for ${url} in English + zh-TW.`
  const text = await callGemini(apiKey, model, prompt)
  return JSON.parse(text)
}

export async function lookupMeaning(apiKey: string, model: string, word: string, context: string) {
  const text = await callGemini(apiKey, model, `Give short zh-TW meaning and optional phonetic as JSON {meaning,phonetic} for word ${word} in sentence: ${context}`)
  return JSON.parse(text) as { meaning: string; phonetic?: string }
}
