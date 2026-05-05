import type { WordStatus } from '../types/word'

export function WordBottomSheet(props: {
  open: boolean
  word: string
  meaning: string
  phonetic?: string
  onClose: () => void
  onStatus: (s: WordStatus) => void
}) {
  const { open, word, meaning, phonetic, onClose, onStatus } = props
  if (!open) return null

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet-card" onClick={(e) => e.stopPropagation()}>
        <h3>{word}</h3>
        {phonetic && <p>/{phonetic}/</p>}
        <p>{meaning}</p>
        <div className="row">
          <button onClick={() => window.speechSynthesis?.speak(new SpeechSynthesisUtterance(word))}>🔊 發音</button>
          <button onClick={() => onStatus('new')}>new</button>
          <button onClick={() => onStatus('learning')}>learning</button>
          <button onClick={() => onStatus('known')}>known</button>
        </div>
      </div>
    </div>
  )
}
