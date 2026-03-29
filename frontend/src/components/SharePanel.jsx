import { useState } from 'react'

const INSTAGRAM_COLOR = 'url(#ig-grad)'
const YOUTUBE_COLOR = '#FF0000'

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="25%" stopColor="#e6683c"/>
          <stop offset="50%" stopColor="#dc2743"/>
          <stop offset="75%" stopColor="#cc2366"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none"/>
      <circle cx="12" cy="12" r="5" stroke="url(#ig-grad)" strokeWidth="2" fill="none"/>
      <circle cx="17.5" cy="6.5" r="1.2" fill="url(#ig-grad)"/>
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000"/>
      <polygon points="10,8.5 10,15.5 16,12" fill="white"/>
    </svg>
  )
}

export default function SharePanel({ story, onClose }) {
  const [step, setStep] = useState('options') // options | loading | done | error
  const [loadingType, setLoadingType] = useState(null)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  const fetchSummary = async () => {
    if (summary) return summary
    const res = await fetch(`/api/stories/${story.storyId}/share/summary`)
    const data = await res.json()
    if (data.error) throw new Error(data.error)
    setSummary(data.summary)
    return data.summary
  }

  const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReel = async () => {
    setLoadingType('reel')
    setStep('loading')
    setError('')
    try {
      const s = await fetchSummary()
      const res = await fetch(`/api/stories/${story.storyId}/share/reel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: s }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate reel')
      }
      const blob = await res.blob()
      const name = (story.personName || 'Story').replace(/\s+/g, '_')
      triggerDownload(blob, `${name}_Reel.mp4`)
      setStep('done')
    } catch (e) {
      setError(e.message)
      setStep('error')
    }
  }

  const handleAudiobook = async () => {
    setLoadingType('audiobook')
    setStep('loading')
    setError('')
    try {
      const res = await fetch(`/api/stories/${story.storyId}/share/audiobook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to generate audiobook')
      }
      const blob = await res.blob()
      const name = (story.personName || 'Story').replace(/\s+/g, '_')
      triggerDownload(blob, `${name}_Story.mp3`)
      setStep('done')
    } catch (e) {
      setError(e.message)
      setStep('error')
    }
  }

  return (
    <div className="share-overlay" onClick={onClose}>
      <div className="share-panel" onClick={e => e.stopPropagation()}>
        <button className="share-panel-close" onClick={onClose}>{'\u2715'}</button>

        <div className="share-panel-title">Share {story.personName}{'\u2019'}s Story</div>
        <div className="share-panel-subtitle">Share as a reel or listen as an audiobook</div>

        {step === 'options' && (
          <div className="share-options">
            <div className="share-option-group">
              <div className="share-option-label">
                <InstagramIcon /> <YouTubeIcon />
                <span>Reel / Short</span>
              </div>
              <p className="share-option-desc">
                A 9:16 video with narrated summary — ready for Instagram Reels or YouTube Shorts.
              </p>
              <button className="share-btn share-btn-primary" onClick={handleReel}>
                Download Reel (.mp4)
              </button>
            </div>

            <div className="share-divider" />

            <div className="share-option-group">
              <div className="share-option-label">
                <span className="share-audio-icon">🎧</span>
                <span>Audiobook</span>
              </div>
              <p className="share-option-desc">
                The full story narrated as an MP3 — all chapters in one file.
              </p>
              <button className="share-btn share-btn-secondary" onClick={handleAudiobook}>
                Download Audiobook (.mp3)
              </button>
            </div>
          </div>
        )}

        {step === 'loading' && (
          <div className="share-loading">
            <div className="share-spinner" />
            <p>{loadingType === 'reel' ? 'Generating your reel\u2026' : 'Narrating your story\u2026'}</p>
            <p className="share-loading-sub">This may take a minute.</p>
          </div>
        )}

        {step === 'done' && (
          <div className="share-done">
            <div className="share-done-icon">{'\u2713'}</div>
            <p>Your {loadingType === 'reel' ? 'reel' : 'audiobook'} is ready!</p>
            <button className="share-btn share-btn-secondary" onClick={() => setStep('options')}>
              Export another
            </button>
          </div>
        )}

        {step === 'error' && (
          <div className="share-error-state">
            <p className="share-error-msg">{error}</p>
            <button className="share-btn share-btn-secondary" onClick={() => setStep('options')}>
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
