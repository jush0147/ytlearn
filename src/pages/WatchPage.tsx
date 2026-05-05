import { useState } from 'react'
import { CaptionList } from '../components/CaptionList'
import { WordBottomSheet } from '../components/WordBottomSheet'
import { YouTubePlayer } from '../components/YouTubePlayer'
import { useCaptions } from '../hooks/useCaptions'
import { useUserSettings } from '../hooks/useUserSettings'
import { useWordMeaning } from '../hooks/useWordMeaning'
import { useWordRecords } from '../hooks/useWordRecords'

export function WatchPage({ videoId }: { videoId: string }) {
  const { settings } = useUserSettings()
  const { captions, status, error } = useCaptions(videoId, settings)
  const { records, setStatus } = useWordRecords()
  const { getMeaning } = useWordMeaning()
  const [time, setTime] = useState(0)
  const [sheet, setSheet] = useState<{ word: string; meaning: string; phonetic?: string } | null>(null)

  return (
    <div className="app">
      <div className="container">
        <div className="row"><button onClick={() => (window.location.hash = '#/')}>返回</button><button onClick={() => (window.location.hash = '#/settings')}>設定</button></div>
        {!videoId && <p className="error">missing videoId</p>}
        {!!videoId && <YouTubePlayer videoId={videoId} onTime={setTime} />}
        <p>{status}</p>
        {error && <p className="error">{error}</p>}
      </div>
      <CaptionList
        captions={captions}
        currentTime={time}
        getWordStatus={(w) => records[w]?.status ?? 'new'}
        onWordClick={async (word, context) => {
          if (!settings.geminiApiKey) return setSheet({ word, meaning: 'missing Gemini API key' })
          try {
            const found = await getMeaning(settings.geminiApiKey, settings.geminiModel, word, context)
            setSheet({ word, meaning: found.meaning, phonetic: found.phonetic })
          } catch {
            setSheet({ word, meaning: 'word meaning lookup failure' })
          }
        }}
      />
      <WordBottomSheet
        open={!!sheet}
        word={sheet?.word ?? ''}
        meaning={sheet?.meaning ?? ''}
        phonetic={sheet?.phonetic}
        onClose={() => setSheet(null)}
        onStatus={(s) => sheet && setStatus(sheet.word, s)}
      />
    </div>
  )
}
