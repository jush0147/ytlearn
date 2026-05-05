import { useEffect, useMemo, useRef, useState } from 'react'
import type { CaptionSegment } from '../types/caption'
import type { WordStatus } from '../types/word'

export function CaptionList({
  captions,
  currentTime,
  getWordStatus,
  onWordClick,
}: {
  captions: CaptionSegment[]
  currentTime: number
  getWordStatus: (word: string) => WordStatus
  onWordClick: (word: string, context: string) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [manualPauseUntil, setManualPauseUntil] = useState(0)

  const currentIndex = useMemo(
    () => captions.findIndex((c) => currentTime >= c.startTime && currentTime < c.endTime),
    [captions, currentTime],
  )

  useEffect(() => {
    if (Date.now() < manualPauseUntil || currentIndex < 0) return
    rootRef.current?.querySelector<HTMLElement>(`[data-idx='${currentIndex}']`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex, manualPauseUntil])

  return (
    <div className="caption-list" ref={rootRef} onScroll={() => setManualPauseUntil(Date.now() + 3000)}>
      {captions.map((c, idx) => (
        <div
          key={`${c.startTime}-${idx}`}
          data-idx={idx}
          className={`caption-item ${idx === currentIndex ? 'active' : ''}`}
          onClick={() => {
            ;(window as any).__ytPlayer?.seekTo(c.startTime, true)
            ;(window as any).__ytPlayer?.playVideo()
          }}
        >
          <div>{c.original}</div>
          <div className="translation">{c.translation}</div>
          <div>
            {c.tokens.map((t, i) => {
              const status = getWordStatus(t.normalized)
              const cls = status === 'learning' ? 'word-learning' : status === 'known' ? 'word-known' : ''
              return (
                <span
                  key={`${idx}-${i}`}
                  className={cls}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (t.isWord) onWordClick(t.normalized, c.original)
                  }}
                >
                  {t.raw}
                </span>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
