import { useState } from 'react'
import { parseYoutubeUrl } from '../utils/parseYoutubeUrl'

export function HomePage() {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')

  return (
    <div className="app container">
      <h1>YT Immersive Learning</h1>
      <p>貼上 YouTube 網址開始。</p>
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
      <div className="row" style={{ marginTop: 8 }}>
        <button
          className="primary"
          onClick={() => {
            const id = parseYoutubeUrl(url)
            if (!id) return setError('invalid YouTube URL')
            window.location.hash = `#/watch?v=${id}`
          }}
        >
          開始學習
        </button>
        <button onClick={() => (window.location.hash = '#/settings')}>設定</button>
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
