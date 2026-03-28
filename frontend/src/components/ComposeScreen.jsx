import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../utils/api'
import { updateStoryInList } from '../utils/storage'

export default function ComposeScreen({ personId, storyId, personName, onGoHome, onOpenReader }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saveText, setSaveText] = useState('saved \u2713')
  const [saveVisible, setSaveVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimerRef = useRef(null)
  const hideTimerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const story = await api('GET', `/api/stories/${storyId}`)
        if (cancelled) return
        let t = story.title || ''
        if (t === `${personName}'s Story`) t = ''
        setTitle(t)
        setContent(story.content || '')
      } catch {
        // new story
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [storyId, personName])

  const composeSave = useCallback((newTitle, newContent) => {
    clearTimeout(saveTimerRef.current)
    clearTimeout(hideTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaveText('saving\u2026')
      setSaveVisible(true)

      const finalTitle = newTitle.trim() || `${personName}'s Story`
      await api('PUT', `/api/stories/${storyId}`, { title: finalTitle, content: newContent })

      updateStoryInList(storyId, { storyTitle: newTitle.trim() || null })

      setSaveText('saved \u2713')
      hideTimerRef.current = setTimeout(() => setSaveVisible(false), 1500)
    }, 600)
  }, [storyId, personName])

  const handleTitleChange = (e) => {
    const v = e.target.value
    setTitle(v)
    composeSave(v, content)
  }

  const handleContentChange = (e) => {
    const v = e.target.value
    setContent(v)
    composeSave(title, v)
  }

  const handleReadFromCompose = async () => {
    if (!content.trim()) return
    const finalTitle = title.trim() || `${personName}'s Story`
    await api('PUT', `/api/stories/${storyId}`, { title: finalTitle, content })
    onOpenReader(personId, storyId, personName, true)
  }

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0

  if (loading) return null

  return (
    <div id="compose-screen" className="screen active">
      <header className="compose-header">
        <button className="compose-back" onClick={onGoHome} title="Back to library">{'\u2190'}</button>
        <span className="compose-header-title">{personName}{'\u2019'}s Story</span>
        <span className={`compose-save-indicator ${saveVisible ? 'visible' : ''}`}>{saveText}</span>
      </header>

      <div className="compose-body">
        <div className="compose-page">
          <div className="compose-ornament">{'\u2727 \u00B7 \u2727 \u00B7 \u2727'}</div>
          <input
            type="text"
            className="compose-title-input"
            placeholder="Title of your story\u2026"
            value={title}
            onChange={handleTitleChange}
            autoComplete="off"
          />
          <div className="compose-title-line" />
          <textarea
            className="compose-text-area"
            placeholder={'Once upon a time\u2026\n\nWrite freely. Your story will be saved automatically as you type.'}
            value={content}
            onChange={handleContentChange}
          />
          <div className="compose-footer">
            <span className="compose-word-count">{wordCount} word{wordCount !== 1 ? 's' : ''}</span>
            <div className="compose-actions">
              <button
                className="compose-read-btn"
                disabled={!content.trim()}
                onClick={handleReadFromCompose}
              >
                {'\u{1F4D6}'} Save & Read
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
