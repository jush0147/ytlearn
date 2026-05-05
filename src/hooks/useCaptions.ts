import { useEffect, useState } from 'react'
import { fallbackTranscript, translateSegments } from '../services/gemini'
import { storage } from '../services/storage'
import { tokenize } from '../services/tokenizer'
import { fetchTimedText } from '../services/youtube'
import type { CaptionSegment } from '../types/caption'
import type { UserSettings } from '../types/settings'

export function useCaptions(videoId: string, settings: UserSettings) {
  const [captions, setCaptions] = useState<CaptionSegment[]>([])
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      if (!videoId) return
      setError('')
      const cached = storage.getCaptions(videoId, settings)
      if (cached) {
        setStatus('Loaded from cache')
        setCaptions(cached)
        return
      }

      try {
        setStatus('Loading YouTube subtitles...')
        const original = await fetchTimedText(videoId, settings.sourceLanguage)
        const translatedNative = await fetchTimedText(videoId, settings.targetLanguage).catch(() => null)

        let final = original
        if (translatedNative) {
          final = original.map((s, i) => ({ ...s, translation: translatedNative[i]?.original ?? '', source: 'yt-native-bilingual' }))
        } else if (settings.geminiApiKey) {
          try {
            const result = await translateSegments(settings.geminiApiKey, settings.geminiModel, original)
            final = original.map((s, i) => ({ ...s, translation: result[i] ?? '', source: 'gemini-translation' }))
          } catch {
            final = original
          }
        }

        if (!active) return
        storage.setCaptions(videoId, settings, final)
        setCaptions(final)
        setStatus('Loaded')
      } catch {
        if (!settings.geminiApiKey) {
          setError('YouTube subtitle fetch failure. Add Gemini API key for fallback transcript.')
          return
        }
        try {
          setStatus('Generating fallback transcript...')
          const rows = await fallbackTranscript(settings.geminiApiKey, settings.geminiModel, `https://www.youtube.com/watch?v=${videoId}`)
          const segs: CaptionSegment[] = rows.map((r: any, i: number) => ({
            index: i,
            startTime: Number(r.startTime ?? i * 3),
            endTime: Number(r.endTime ?? i * 3 + 2.5),
            original: String(r.original ?? ''),
            translation: String(r.translation ?? ''),
            tokens: tokenize(String(r.original ?? '')),
            source: 'gemini-transcribed',
          }))
          if (!active) return
          storage.setCaptions(videoId, settings, segs)
          setCaptions(segs)
        } catch {
          setError('Gemini fallback failure. Try a public video with subtitles.')
        }
      }
    }

    load()
    return () => {
      active = false
    }
  }, [videoId, settings])

  return { captions, status, error }
}
