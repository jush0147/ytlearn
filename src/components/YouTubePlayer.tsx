import { useEffect, useRef } from 'react'
import YouTube from 'react-youtube'
import type { YouTubePlayer as YTPlayer } from 'react-youtube'

export function YouTubePlayer({ videoId, onTime }: { videoId: string; onTime: (time: number) => void }) {
  const player = useRef<YTPlayer | null>(null)

  useEffect(() => {
    const id = window.setInterval(() => {
      if (player.current) onTime(player.current.getCurrentTime())
    }, 250)
    return () => window.clearInterval(id)
  }, [onTime])

  return (
    <div className="player-wrap">
      <YouTube
        videoId={videoId}
        opts={{ width: '100%', height: '100%', playerVars: { playsinline: 1 } }}
        onReady={(e) => {
          player.current = e.target
          ;(window as any).__ytPlayer = e.target
        }}
      />
    </div>
  )
}
