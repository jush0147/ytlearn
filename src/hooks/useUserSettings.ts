import { useState } from 'react'
import { storage } from '../services/storage'
import type { UserSettings } from '../types/settings'

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings>(storage.getSettings())
  const save = (next: UserSettings) => {
    storage.saveSettings(next)
    setSettings(next)
  }
  return { settings, save }
}
