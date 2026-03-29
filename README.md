# 📱 Personal Shadowing PWA

這是一個專為個人打造的跨平台 PWA 語言學習工具，核心聚焦於「可理解性輸入 (Comprehensible Input)」與「跟讀 (Shadowing)」。

## 🚀 核心功能 (Features)
- 🎥 **無廣告沉浸播放**：無隱式控制條，專注在影片內容。
- 💬 **智能字幕同步**：精確的時間軸高亮，點擊自動跳轉，並擁有 Vercel Proxy 自動抓取字幕 (目前支援 YouTube Innertube API 代理策略)。
- 🧠 **BYOK 絕對隱私機制**：自攜金鑰 (Bring Your Own Key)，不再依賴第三方後端。
- 📚 **雲端單字庫同步**：結合 Supabase 做靜默雲端同步，防抖與樂觀更新達到絲滑體驗。
- 📖 **Gemini 語境解析**：利用 AI 快速對語境內做解析，提供連音提醒與句型參考，並標記單字熟練度。
- 🎙️ **Azure 發音評估**：可以直接針對影片句子錄音，分析每一單字的準確度與流暢度。

## 🛠️ 技術棧 (Tech Stack)
* **Frontend**: Vite 5 + React 19 + TypeScript
* **UI**: Tailwind CSS (含深淺色無縫切換), Lucide React
* **PWA**: `vite-plugin-pwa` 完整支援
* **State**: Zustand (with Persist Middleware)
* **API Providers**: Supabase, Gemini Flash Lite, Azure Speech Services

## 🏃‍♀️ 如何執行 (How to Run)
1. **安裝依賴**: 
   ```bash
   npm pnpm install
   ```
2. **啟動開發伺服器**:
   ```bash
   npm run dev
   ```
   > 開發環境中 `vite.config.ts` 已內建字幕抓取的 API Proxy (`/api/getSubtitles`)
3. **準備環境**: 在 `Settings (設定)` 中輸入對應的 Supabase/Gemini/Azure Key 即可完整體驗。

## 📦 發布 (Deploy)
* 可直接發布於 Vercel 以使用 `api/getSubtitles.js` 中的 Serverless Proxy:
  ```bash
  npm run build
  ```
