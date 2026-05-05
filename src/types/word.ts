export type WordStatus = 'new' | 'learning' | 'known'

export interface WordRecord {
  text: string
  status: WordStatus
  updatedAt: number
}

export interface WordMeaningCache {
  word: string
  context: string
  meaning: string
  phonetic?: string
  updatedAt: number
}
