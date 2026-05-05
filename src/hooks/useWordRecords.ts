import { useState } from 'react'
import { storage } from '../services/storage'
import type { WordStatus } from '../types/word'

export function useWordRecords() {
  const [records, setRecords] = useState(storage.getWordRecords())
  const setStatus = (word: string, status: WordStatus) => {
    storage.setWordStatus(word, status)
    setRecords(storage.getWordRecords())
  }
  return { records, setStatus }
}
