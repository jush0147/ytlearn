import type { CaptionSegment } from '../types/caption'
import type { UserSettings } from '../types/settings'
import { DEFAULT_SETTINGS } from '../types/settings'
import type { WordMeaningCache, WordRecord, WordStatus } from '../types/word'

const K = { words: 'wordRecords', meaning: 'wordMeaningCache', settings: 'userSettings' }
const parse = <T,>(v: string | null, fallback: T): T => { try { return v ? JSON.parse(v) : fallback } catch { return fallback } }

export const storage = {
  getSettings: (): UserSettings => ({ ...DEFAULT_SETTINGS, ...parse(localStorage.getItem(K.settings), {}) }),
  saveSettings: (s: UserSettings) => localStorage.setItem(K.settings, JSON.stringify(s)),
  getWordRecords: (): Record<string, WordRecord> => parse(localStorage.getItem(K.words), {}),
  setWordStatus: (word: string, status: WordStatus) => {
    const all = storage.getWordRecords(); all[word] = { text: word, status, updatedAt: Date.now() }
    localStorage.setItem(K.words, JSON.stringify(all))
  },
  getMeaningCache: (): Record<string, WordMeaningCache> => parse(localStorage.getItem(K.meaning), {}),
  setMeaningCache: (entry: WordMeaningCache) => {
    const all = storage.getMeaningCache(); all[`${entry.word}::${entry.context}`] = entry
    localStorage.setItem(K.meaning, JSON.stringify(all))
  },
  captionsKey: (videoId: string, s: UserSettings) => `captions:v2:${videoId}:${s.sourceLanguage}:${s.targetLanguage}:${s.geminiModel}`,
  getCaptions: (videoId: string, s: UserSettings): CaptionSegment[] | null => parse(localStorage.getItem(storage.captionsKey(videoId, s)), null),
  setCaptions: (videoId: string, s: UserSettings, c: CaptionSegment[]) => localStorage.setItem(storage.captionsKey(videoId, s), JSON.stringify(c)),
}
