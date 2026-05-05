import { useState } from 'react'
import { useUserSettings } from '../hooks/useUserSettings'

export function SettingsPage() {
  const { settings, save } = useUserSettings()
  const [local, setLocal] = useState(settings)

  return (
    <div className="app container">
      <h2>設定</h2>
      <label>Gemini API Key</label>
      <input value={local.geminiApiKey} onChange={(e) => setLocal({ ...local, geminiApiKey: e.target.value })} />
      <label>Gemini 模型</label>
      <select value={local.geminiModel} onChange={(e) => setLocal({ ...local, geminiModel: e.target.value as any })}>
        <option value="gemini-3.1-flash-lite-preview">gemini-3.1-flash-lite-preview</option>
        <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
      </select>
      <label>來源語言</label>
      <input value={local.sourceLanguage} onChange={(e) => setLocal({ ...local, sourceLanguage: e.target.value })} />
      <label>目標語言</label>
      <input value={local.targetLanguage} onChange={(e) => setLocal({ ...local, targetLanguage: e.target.value })} />
      <div className="row" style={{ marginTop: 8 }}>
        <button className="primary" onClick={() => save(local)}>儲存</button>
        <button onClick={() => (window.location.hash = '#/')}>返回</button>
      </div>
    </div>
  )
}
