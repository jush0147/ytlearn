export type CaptionSource =
  | 'cache'
  | 'yt-native-bilingual'
  | 'yt-native-original'
  | 'gemini-translation'
  | 'gemini-transcribed'

export interface WordToken {
  raw: string
  normalized: string
  leading: string
  trailing: string
  isWord: boolean
}

export interface CaptionSegment {
  index: number
  startTime: number
  endTime: number
  original: string
  translation: string
  tokens: WordToken[]
  source: CaptionSource
}
