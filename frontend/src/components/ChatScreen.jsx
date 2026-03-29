import { useState, useRef, useEffect, useCallback } from 'react'
import { CHAPTERS } from '../data/chapters'
import { api } from '../utils/api'

export default function ChatScreen({ personName, storyId, initialChapter = 0, freeform = false, onGoHome, onOpenReader }) {
  const [currentChapter, setCurrentChapter] = useState(freeform ? -1 : initialChapter)
  const [messages, setMessages] = useState([])
  const [extractedAnswers, setExtractedAnswers] = useState({})
  const [conversationId, setConversationId] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [chapterProgress, setChapterProgress] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const chatBodyRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  const chapter = freeform ? null : CHAPTERS[currentChapter]

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, sending])

  // Load chapter conversation
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function loadChapter() {
      const data = await api('GET', `/api/conversations/${storyId}/${currentChapter}`)
      if (cancelled) return

      if (data.sessions && data.sessions.length > 0) {
        // Load the latest session
        setMessages(data.latest.messages || [])
        setExtractedAnswers(data.latest.extracted_answers || {})
        setConversationId(data.latest.conversation_id)
        setSessionCount(data.sessions.length)
        setLoading(false)
      } else {
        // Start new conversation — get opening message
        const result = await api('POST', '/api/chat', {
          story_id: storyId,
          chapter_index: currentChapter,
          message: '',
          person_name: personName,
        })
        if (cancelled) return
        setMessages(result.messages || [])
        setExtractedAnswers(result.extracted_answers || {})
        setConversationId(result.conversation_id || null)
        setSessionCount(1)
        setLoading(false)
      }
    }

    loadChapter()
    return () => { cancelled = true }
  }, [storyId, currentChapter, personName])

  // Load progress overview for all chapters (guided mode only)
  useEffect(() => {
    if (freeform) return
    async function loadProgress() {
      const convs = await api('GET', `/api/conversations/${storyId}`)
      const progress = {}
      convs.forEach(c => {
        progress[c.chapter_index] = {
          messageCount: c.message_count,
          answersCount: c.answers_count,
          sessionCount: c.session_count || 1,
          status: c.status,
        }
      })
      setChapterProgress(progress)
    }
    loadProgress()
  }, [storyId, messages, freeform])

  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || sending) return

    setInputValue('')
    setSending(true)

    // Optimistically add user message
    const userMsg = { role: 'user', content: text, timestamp: '' }
    setMessages(prev => [...prev, userMsg])

    try {
      const result = await api('POST', '/api/chat', {
        story_id: storyId,
        chapter_index: currentChapter,
        conversation_id: conversationId,
        message: text,
        person_name: personName,
      })

      setMessages(result.messages || [])
      setExtractedAnswers(result.extracted_answers || {})
      if (result.conversation_id) setConversationId(result.conversation_id)
    } catch (err) {
      // Remove optimistic message on error, add error
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'system', content: 'Something went wrong. Please try again.', timestamp: '' }
      ])
    }

    setSending(false)
    inputRef.current?.focus()
  }, [inputValue, sending, storyId, currentChapter, conversationId, personName])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleRecording = useCallback(async () => {
    if (recording) {
      // Stop recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      return
    }

    // Start recording
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size === 0) return

        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', blob, 'recording.webm')
          const resp = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await resp.json()
          if (data.text) {
            setInputValue(prev => prev ? prev + ' ' + data.text : data.text)
            inputRef.current?.focus()
          }
        } catch (err) {
          console.error('Transcription failed:', err)
        }
        setTranscribing(false)
      }

      mediaRecorder.start()
      setRecording(true)
    } catch (err) {
      console.error('Mic access denied:', err)
    }
  }, [recording])

  const switchChapter = (index) => {
    if (index === currentChapter) return
    setCurrentChapter(index)
    setMessages([])
    setExtractedAnswers({})
    setConversationId(null)
    setSessionCount(0)
    setSidebarOpen(false)
  }

  const startNewStory = useCallback(async () => {
    if (sending || loading) return
    setLoading(true)

    try {
      const result = await api('POST', `/api/conversations/${storyId}/${currentChapter}/new`, {
        person_name: personName,
      })
      setMessages(result.messages || [])
      setExtractedAnswers(result.extracted_answers || {})
      setConversationId(result.conversation_id || null)
      setSessionCount(result.session_number || sessionCount + 1)
    } catch (err) {
      // stay on current conversation
    }
    setLoading(false)
    inputRef.current?.focus()
  }, [sending, loading, storyId, currentChapter, personName, sessionCount])

  const getChapterStatus = (index) => {
    const p = chapterProgress[index]
    if (!p) return 'not_started'
    if (p.messageCount > 0) return 'in_progress'
    return 'not_started'
  }

  const accentColor = freeform ? '#7D8F69' : chapter.color

  return (
    <div id="chat-screen" className="screen active">
      {/* Mobile sidebar overlay */}
      {!freeform && sidebarOpen && (
        <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Chapter sidebar (guided mode only) */}
      {!freeform && (
        <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="chat-sidebar-header">
            <h3 className="chat-sidebar-title">Chapters</h3>
            <button className="chat-sidebar-close" onClick={() => setSidebarOpen(false)}>{'\u2715'}</button>
          </div>
          <nav className="chat-chapter-list">
            {CHAPTERS.map((ch, i) => {
              const status = getChapterStatus(i)
              const progress = chapterProgress[i]
              return (
                <button
                  key={ch.id}
                  className={`chat-chapter-item ${i === currentChapter ? 'active' : ''} ${status}`}
                  onClick={() => switchChapter(i)}
                >
                  <span className="chat-chapter-icon">{ch.icon}</span>
                  <div className="chat-chapter-meta">
                    <span className="chat-chapter-name">{ch.title}</span>
                    <span className="chat-chapter-status">
                      {status === 'in_progress'
                        ? `${progress?.sessionCount || 1} ${(progress?.sessionCount || 1) === 1 ? 'story' : 'stories'}`
                        : 'Not started'}
                    </span>
                  </div>
                </button>
              )
            })}
          </nav>
        </aside>
      )}

      {/* Main chat area */}
      <div className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            {!freeform && (
              <button className="chat-menu-btn" onClick={() => setSidebarOpen(true)} title="Chapters">
                {'\u2630'}
              </button>
            )}
            <button className="chat-back-btn" onClick={onGoHome} title="Back to home">{'\u2190'}</button>
          </div>
          <div className="chat-header-center">
            {freeform ? (
              <div>
                <h2 className="chat-header-title">{personName}{'\u2019'}s Story</h2>
                <span className="chat-header-progress">Tell it your way</span>
              </div>
            ) : (
              <>
                <span className="chat-header-icon">{chapter.icon}</span>
                <div>
                  <h2 className="chat-header-title">{chapter.title}</h2>
                  <span className="chat-header-progress">
                    {sessionCount > 1 ? `Story ${sessionCount}` : chapter.subtitle}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="chat-header-right">
            {!freeform && (
              <button
                className="chat-new-story-btn"
                onClick={startNewStory}
                disabled={sending || loading}
                title="Start a new story in this chapter"
              >
                + New Story
              </button>
            )}
            <button
              className="chat-read-btn"
              onClick={() => onOpenReader(null, storyId, personName, freeform)}
              title="Read your book"
            >
              {'\uD83D\uDCD6'}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="chat-messages" ref={chatBodyRef}>
          {/* Chapter intro card */}
          <div className="chat-chapter-intro">
            {freeform ? (
              <>
                <h3 className="chat-intro-title">{personName}{'\u2019'}s Story</h3>
                <p className="chat-intro-subtitle">Tell whatever comes to mind</p>
              </>
            ) : (
              <>
                <span className="chat-intro-icon">{chapter.icon}</span>
                <h3 className="chat-intro-title">{chapter.title}</h3>
                <p className="chat-intro-subtitle">{chapter.subtitle}</p>
              </>
            )}
          </div>

          {loading ? (
            <div className="chat-loading">
              <div className="chat-typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-bubble-wrapper ${msg.role === 'user' ? 'user' : 'assistant'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="chat-avatar">
                    <span>{'\u270D\uFE0F'}</span>
                  </div>
                )}
                <div className={`chat-bubble ${msg.role}`}>
                  {msg.content}
                </div>
              </div>
            ))
          )}

          {sending && (
            <div className="chat-bubble-wrapper assistant">
              <div className="chat-avatar">
                <span>{'\u270D\uFE0F'}</span>
              </div>
              <div className="chat-bubble assistant">
                <div className="chat-typing-indicator">
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <button
              className={`chat-mic-btn ${recording ? 'recording' : ''} ${transcribing ? 'transcribing' : ''}`}
              onClick={toggleRecording}
              disabled={sending || loading || transcribing}
              title={recording ? 'Stop recording' : 'Record voice'}
            >
              {transcribing ? '\u23F3' : recording ? '\u23F9' : '\uD83C\uDF99'}
            </button>
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder={recording ? 'Listening...' : transcribing ? 'Transcribing...' : 'Tell your story...'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={sending || loading || recording}
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim() || sending || loading || recording}
              style={{ background: accentColor }}
            >
              {'\u2191'}
            </button>
          </div>
          <div className="chat-input-hint">
            {recording ? 'Recording\u2026 click mic to stop' : 'Press Enter to send, Shift+Enter for new line'}
          </div>
        </div>
      </div>
    </div>
  )
}
