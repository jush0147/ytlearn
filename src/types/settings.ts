export interface UserSettings {
  geminiApiKey: string
  geminiModel: 'gemini-3.1-flash-lite-preview' | 'gemini-3-flash-preview'
  sourceLanguage: string
  targetLanguage: string
}

export const DEFAULT_SETTINGS: UserSettings = {
  geminiApiKey: '',
  geminiModel: 'gemini-3.1-flash-lite-preview',
  sourceLanguage: 'en',
  targetLanguage: 'zh-TW',
}
