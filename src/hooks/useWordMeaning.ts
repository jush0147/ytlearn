import { useState } from 'react'
import { lookupMeaning } from '../services/gemini'
import { storage } from '../services/storage'

export function useWordMeaning() {
  const [error, setError] = useState('')

  const getMeaning = async (apiKey: string, model: string, word: string, context: string) => {
    const key = `${word}::${context}`
    const cached = storage.getMeaningCache()[key]
    if (cached) return cached
    try {
      const result = await lookupMeaning(apiKey, model, word, context)
      const entry = { word, context, meaning: result.meaning, phonetic: result.phonetic, updatedAt: Date.now() }
      storage.setMeaningCache(entry)
      return entry
    } catch {
      setError('word meaning lookup failure')
      throw new Error('word meaning lookup failure')
    }
  }

  return { getMeaning, error }
}
