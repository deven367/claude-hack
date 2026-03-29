import { useState, useRef, useEffect, useCallback } from 'react'
import { CHAPTERS } from '../data/chapters'
import { api } from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'

export default function ChatScreen({ personName, storyId, initialChapter = 0, freeform = false, muted = false, onSetMuted, onGoHome, onOpenReader }) {
  const { language, t } = useLanguage()
  const [currentChapter, setCurrentChapter] = useState(freeform ? null : initialChapter)
  const [messages, setMessages] = useState([])
  const [extractedAnswers, setExtractedAnswers] = useState({})
  const [conversationId, setConversationId] = useState(null)
  const [sessionCount, setSessionCount] = useState(0)
  const [chapterSessions, setChapterSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [chapterProgress, setChapterProgress] = useState({})
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Custom chapters for freeform mode
  const [customChapters, setCustomChapters] = useState([])
  const [renamingChapter, setRenamingChapter] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  // Voice & animation states
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)
  const [textInputValue, setTextInputValue] = useState('')
  const [confirmDeleteSession, setConfirmDeleteSession] = useState(null)
  const [renamingSession, setRenamingSession] = useState(null)
  const [sessionRenameValue, setSessionRenameValue] = useState('')
  const [phase, setPhase] = useState('idle') // idle | recording | transcribing | writing | revealing
  const [displayedQuestion, setDisplayedQuestion] = useState('')
  const [questionKey, setQuestionKey] = useState(0) // forces re-animation

  const audioRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const textInputRef = useRef(null)

  const chapter = freeform ? null : CHAPTERS[currentChapter]
  const currentCustomChapter = freeform ? customChapters.find(c => c.id === currentChapter) : null

  // Get the latest assistant message
  const latestAssistantMsg = messages.filter(m => m.role === 'assistant').slice(-1)[0]

  // Update displayed question when latest assistant message changes
  useEffect(() => {
    if (latestAssistantMsg && latestAssistantMsg.content !== displayedQuestion) {
      setDisplayedQuestion(latestAssistantMsg.content)
      setQuestionKey(k => k + 1)
      setPhase('revealing')
      const timer = setTimeout(() => setPhase('idle'), 800)
      return () => clearTimeout(timer)
    }
  }, [latestAssistantMsg?.content])

  // Load custom chapters for freeform mode
  useEffect(() => {
    if (!freeform) return
    async function loadCustomChapters() {
      const chapters = await api('GET', `/api/stories/${storyId}/custom-chapters`)
      if (chapters.length === 0) {
        // Auto-create first chapter
        const ch = await api('POST', `/api/stories/${storyId}/custom-chapters`, { title: `${t('chat.chapterN')} 1` })
        setCustomChapters([ch])
        setCurrentChapter(ch.id)
      } else {
        setCustomChapters(chapters)
        if (currentChapter === null) setCurrentChapter(chapters[0].id)
      }
    }
    loadCustomChapters()
  }, [freeform, storyId])

  // Load chapter conversation
  useEffect(() => {
    if (currentChapter === null) return
    let cancelled = false
    setLoading(true)

    async function loadChapter() {
      const data = await api('GET', `/api/conversations/${storyId}/${currentChapter}`)
      if (cancelled) return

      if (data.sessions && data.sessions.length > 0) {
        setMessages(data.latest.messages || [])
        setExtractedAnswers(data.latest.extracted_answers || {})
        setConversationId(data.latest.conversation_id)
        setSessionCount(data.sessions.length)
        setChapterSessions(data.sessions)
        setLoading(false)
      } else {
        const result = await api('POST', '/api/chat', {
          story_id: storyId,
          chapter_index: currentChapter,
          message: '',
          person_name: personName,
          custom_chapter_title: freeform ? (currentCustomChapter?.title || null) : undefined,
          language,
        })
        if (cancelled) return
        setMessages(result.messages || [])
        setExtractedAnswers(result.extracted_answers || {})
        setConversationId(result.conversation_id || null)
        setSessionCount(1)
        setChapterSessions(result.conversation_id ? [{ conversation_id: result.conversation_id }] : [])
        setLoading(false)
      }
    }

    loadChapter()
    return () => { cancelled = true }
  }, [storyId, currentChapter, personName, freeform, currentCustomChapter?.title])

  // Auto-play first AI message on load
  useEffect(() => {
    if (!loading && !muted && latestAssistantMsg && messages.length <= 1) {
      playTTS(latestAssistantMsg.content)
    }
  }, [loading])

  // Load progress overview
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

  const playTTS = useCallback(async (text) => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (resp.ok) {
        const blob = await resp.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          audioRef.current = null
          URL.revokeObjectURL(url)
        }
        audio.play()
      }
    } catch (err) {
      // TTS failed silently
    }
  }, [])

  const sendMessage = useCallback(async (text) => {
    if (!text) return

    setPhase('writing')

    const userMsg = { role: 'user', content: text, timestamp: '' }
    setMessages(prev => [...prev, userMsg])

    try {
      const result = await api('POST', '/api/chat', {
        story_id: storyId,
        chapter_index: currentChapter,
        conversation_id: conversationId,
        message: text,
        person_name: personName,
        custom_chapter_title: freeform ? (currentCustomChapter?.title || null) : undefined,
        language,
      })

      setMessages(result.messages || [])
      setExtractedAnswers(result.extracted_answers || {})
      if (result.conversation_id) setConversationId(result.conversation_id)

      // Phase transitions: writing → revealing → idle (with TTS)
      setPhase('revealing')
      setTimeout(() => setPhase('idle'), 800)

      if (result.ai_message && !muted) {
        playTTS(result.ai_message)
      }
    } catch (err) {
      setMessages(prev => [
        ...prev.slice(0, -1),
        { role: 'system', content: t('chat.somethingWentWrong'), timestamp: '' }
      ])
      setPhase('idle')
    }
  }, [storyId, currentChapter, conversationId, personName, freeform, currentCustomChapter?.title, muted, playTTS, language, t])

  const toggleRecording = useCallback(async () => {
    if (recording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setRecording(false)

        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        if (blob.size === 0) { setPhase('idle'); return }

        setTranscribing(true)
        setPhase('transcribing')
        try {
          const form = new FormData()
          form.append('audio', blob, 'recording.webm')
          const resp = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await resp.json()
          if (data.text) {
            setTranscribing(false)
            sendMessage(data.text)
            return
          }
        } catch (err) {
          console.error('Transcription failed:', err)
        }
        setTranscribing(false)
        setPhase('idle')
      }

      mediaRecorder.start()
      setRecording(true)
      setPhase('recording')
    } catch (err) {
      console.error('Mic access denied:', err)
    }
  }, [recording, sendMessage])

  const switchChapter = (index) => {
    if (index === currentChapter) return
    setCurrentChapter(index)
    setMessages([])
    setExtractedAnswers({})
    setConversationId(null)
    setSessionCount(0)
    setChapterSessions([])
    setDisplayedQuestion('')
    setSidebarOpen(false)
    setPhase('idle')
  }

  const switchSession = useCallback(async (sessionConvId) => {
    if (sessionConvId === conversationId) return
    setLoading(true)
    try {
      const data = await api('GET', `/api/conversations/${storyId}/${currentChapter}`)
      const session = data.sessions?.find(s => s.conversation_id === sessionConvId)
      if (session) {
        setMessages(session.messages || [])
        setExtractedAnswers(session.extracted_answers || {})
        setConversationId(session.conversation_id)
      }
    } catch (err) {
      // stay on current
    }
    setLoading(false)
  }, [storyId, currentChapter, conversationId])

  // Custom chapter management (freeform)
  const addCustomChapter = useCallback(async () => {
    const title = `${t('chat.chapterN')} ${customChapters.length + 1}`
    const ch = await api('POST', `/api/stories/${storyId}/custom-chapters`, { title })
    setCustomChapters(prev => [...prev, ch])
    setCurrentChapter(ch.id)
    setMessages([])
    setExtractedAnswers({})
    setConversationId(null)
    setChapterSessions([])
  }, [storyId, customChapters.length, t])

  const renameCustomChapter = useCallback(async (chapterId, title) => {
    await api('PUT', `/api/custom-chapters/${chapterId}`, { title })
    setCustomChapters(prev => prev.map(c => c.id === chapterId ? { ...c, title } : c))
    setRenamingChapter(null)
  }, [])

  const deleteCustomChapter = useCallback(async (chapterId) => {
    await api('DELETE', `/api/custom-chapters/${chapterId}`)
    const remaining = customChapters.filter(c => c.id !== chapterId)
    setCustomChapters(remaining)
    if (chapterId === currentChapter && remaining.length > 0) {
      setCurrentChapter(remaining[0].id)
      setMessages([])
      setExtractedAnswers({})
      setConversationId(null)
      setChapterSessions([])
    }
  }, [customChapters, currentChapter])

  const renameSession = useCallback(async (convId, title) => {
    await api('PUT', `/api/conversations/${convId}`, { title })
    setChapterSessions(prev => prev.map(s => s.conversation_id === convId ? { ...s, title } : s))
    setRenamingSession(null)
  }, [])

  const deleteSession = useCallback(async (convId) => {
    try {
      await api('DELETE', `/api/conversations/${convId}`)
    } catch (err) { /* ignore */ }
    const remaining = chapterSessions.filter(s => s.conversation_id !== convId)
    setChapterSessions(remaining)
    setSessionCount(remaining.length)
    // If we deleted the active session, switch to the last remaining
    if (convId === conversationId && remaining.length > 0) {
      switchSession(remaining[remaining.length - 1].conversation_id)
    }
  }, [chapterSessions, conversationId, switchSession])

  const startNewStory = useCallback(async () => {
    if (phase !== 'idle') return
    setLoading(true)

    try {
      const result = await api('POST', `/api/conversations/${storyId}/${currentChapter}/new`, {
        person_name: personName,
        custom_chapter_title: freeform ? (currentCustomChapter?.title || null) : undefined,
        language,
      })
      setMessages(result.messages || [])
      setExtractedAnswers(result.extracted_answers || {})
      setConversationId(result.conversation_id || null)
      const newCount = (result.session_number || sessionCount + 1)
      setSessionCount(newCount)
      setChapterSessions(prev => [...prev, { conversation_id: result.conversation_id }])
    } catch (err) {
      // stay on current
    }
    setLoading(false)
  }, [phase, storyId, currentChapter, personName, sessionCount, language])

  const getChapterStatus = (index) => {
    const p = chapterProgress[index]
    if (!p) return 'not_started'
    if (p.messageCount > 0) return 'in_progress'
    return 'not_started'
  }

  const isBusy = phase === 'writing' || phase === 'transcribing' || loading

  return (
    <div id="chat-screen" className="screen active">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Chapter sidebar — works for both guided and freeform */}
      <aside className={`chat-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="chat-sidebar-header">
          <h3 className="chat-sidebar-title">{freeform ? t('chat.yourChapters') : t('chat.chapters')}</h3>
          <button className="chat-sidebar-close" onClick={() => setSidebarOpen(false)}>{'\u2715'}</button>
        </div>
        <nav className="chat-chapter-list">
          {/* Guided chapters */}
          {!freeform && CHAPTERS.map((ch, i) => {
            const status = getChapterStatus(i)
            const progress = chapterProgress[i]
            const isActive = i === currentChapter
            return (
              <div key={ch.id}>
                <button
                  className={`chat-chapter-item ${isActive ? 'active' : ''} ${status}`}
                  onClick={() => switchChapter(i)}
                >
                  <span className="chat-chapter-icon">{ch.icon}</span>
                  <div className="chat-chapter-meta">
                    <span className="chat-chapter-name">{ch.title}</span>
                    <span className="chat-chapter-status">
                      {status === 'in_progress'
                        ? `${progress?.sessionCount || 1} ${(progress?.sessionCount || 1) === 1 ? t('common.story') : t('common.stories')}`
                        : t('chat.notStarted')}
                    </span>
                  </div>
                </button>
                {isActive && chapterSessions.length > 0 && (
                  <div className="chat-session-list">
                    {chapterSessions.map((sess, si) => (
                      <div key={sess.conversation_id}>
                        {confirmDeleteSession === sess.conversation_id ? (
                          <div className="chat-session-confirm">
                            <span>{t('common.delete')}</span>
                            <button onClick={() => { deleteSession(sess.conversation_id); setConfirmDeleteSession(null) }}>{t('common.yes')}</button>
                            <button onClick={() => setConfirmDeleteSession(null)}>{t('common.no')}</button>
                          </div>
                        ) : renamingSession === sess.conversation_id ? (
                          <div className="chat-session-item active">
                            <input
                              className="chat-chapter-rename-input"
                              value={sessionRenameValue}
                              onChange={(e) => setSessionRenameValue(e.target.value)}
                              onBlur={() => { if (sessionRenameValue.trim()) renameSession(sess.conversation_id, sessionRenameValue.trim()); else setRenamingSession(null) }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && sessionRenameValue.trim()) renameSession(sess.conversation_id, sessionRenameValue.trim())
                                if (e.key === 'Escape') setRenamingSession(null)
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            className={`chat-session-item ${sess.conversation_id === conversationId ? 'active' : ''}`}
                            onClick={() => switchSession(sess.conversation_id)}
                            onDoubleClick={(e) => { e.stopPropagation(); setRenamingSession(sess.conversation_id); setSessionRenameValue(sess.title || `${t('chat.storyN')} ${si + 1}`) }}
                          >
                            {sess.title || `${t('chat.storyN')} ${si + 1}`}
                            {chapterSessions.length > 1 && (
                              <span
                                className="chat-session-delete"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteSession(sess.conversation_id) }}
                              >{'\u2715'}</span>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                    <button className="chat-session-new" onClick={startNewStory} disabled={isBusy}>
                      {t('chat.startNewStory')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Freeform custom chapters */}
          {freeform && customChapters.map((ch) => {
            const isActive = ch.id === currentChapter
            return (
              <div key={ch.id}>
                <button
                  className={`chat-chapter-item ${isActive ? 'active' : ''} in_progress`}
                  onClick={() => {
                    if (ch.id === currentChapter) return
                    setCurrentChapter(ch.id)
                    setMessages([])
                    setExtractedAnswers({})
                    setConversationId(null)
                    setChapterSessions([])
                    setDisplayedQuestion('')
                    setPhase('idle')
                  }}
                >
                  <div className="chat-chapter-meta">
                    {renamingChapter === ch.id ? (
                      <input
                        className="chat-chapter-rename-input"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => { if (renameValue.trim()) renameCustomChapter(ch.id, renameValue.trim()); else setRenamingChapter(null) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && renameValue.trim()) renameCustomChapter(ch.id, renameValue.trim())
                          if (e.key === 'Escape') setRenamingChapter(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="chat-chapter-name"
                        onDoubleClick={(e) => { e.stopPropagation(); setRenamingChapter(ch.id); setRenameValue(ch.title) }}
                      >
                        {ch.title}
                      </span>
                    )}
                  </div>
                  {customChapters.length > 1 && (
                    <span
                      className="chat-session-delete"
                      onClick={(e) => { e.stopPropagation(); deleteCustomChapter(ch.id) }}
                    >{'\u2715'}</span>
                  )}
                </button>
                {isActive && chapterSessions.length > 0 && (
                  <div className="chat-session-list">
                    {chapterSessions.map((sess, si) => (
                      <div key={sess.conversation_id}>
                        {confirmDeleteSession === sess.conversation_id ? (
                          <div className="chat-session-confirm">
                            <span>{t('common.delete')}</span>
                            <button onClick={() => { deleteSession(sess.conversation_id); setConfirmDeleteSession(null) }}>{t('common.yes')}</button>
                            <button onClick={() => setConfirmDeleteSession(null)}>{t('common.no')}</button>
                          </div>
                        ) : renamingSession === sess.conversation_id ? (
                          <div className="chat-session-item active">
                            <input
                              className="chat-chapter-rename-input"
                              value={sessionRenameValue}
                              onChange={(e) => setSessionRenameValue(e.target.value)}
                              onBlur={() => { if (sessionRenameValue.trim()) renameSession(sess.conversation_id, sessionRenameValue.trim()); else setRenamingSession(null) }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && sessionRenameValue.trim()) renameSession(sess.conversation_id, sessionRenameValue.trim())
                                if (e.key === 'Escape') setRenamingSession(null)
                              }}
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            className={`chat-session-item ${sess.conversation_id === conversationId ? 'active' : ''}`}
                            onClick={() => switchSession(sess.conversation_id)}
                            onDoubleClick={(e) => { e.stopPropagation(); setRenamingSession(sess.conversation_id); setSessionRenameValue(sess.title || `${t('chat.storyN')} ${si + 1}`) }}
                          >
                            {sess.title || `${t('chat.storyN')} ${si + 1}`}
                            {chapterSessions.length > 1 && (
                              <span
                                className="chat-session-delete"
                                onClick={(e) => { e.stopPropagation(); setConfirmDeleteSession(sess.conversation_id) }}
                              >{'\u2715'}</span>
                            )}
                          </button>
                        )}
                      </div>
                    ))}
                    <button className="chat-session-new" onClick={startNewStory} disabled={isBusy}>
                      {t('chat.startNewStory')}
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add chapter button (freeform only) */}
          {freeform && (
            <button className="chat-session-new" style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }} onClick={addCustomChapter}>
              {t('chat.addChapter')}
            </button>
          )}
        </nav>
      </aside>

      {/* Main area */}
      <div className="chat-main">
        {/* Header */}
        <header className="chat-header">
          <div className="chat-header-left">
            <button className="chat-menu-btn" onClick={() => setSidebarOpen(true)} title={t('chat.chapters')}>
              {'\u2630'}
            </button>
            <button className="chat-back-btn" onClick={onGoHome} title={t('chat.backToHome')}>{'\u2190'}</button>
          </div>
          <div className="chat-header-center">
            {freeform ? (
              <div>
                <h2 className="chat-header-title">{currentCustomChapter?.title || t('chat.yourStory')}</h2>
                <span className="chat-header-progress">{personName}{t('chat.personStory')}</span>
              </div>
            ) : (
              <>
                <span className="chat-header-icon">{chapter.icon}</span>
                <div>
                  <h2 className="chat-header-title">{chapter.title}</h2>
                  <span className="chat-header-progress">
                    {sessionCount > 1 ? `${t('chat.storyN')} ${sessionCount}` : chapter.subtitle}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="chat-header-right">
            <button
              className="chat-read-btn"
              onClick={() => onOpenReader(null, storyId, personName, freeform)}
              title={t('chat.readYourBook')}
            >
              {'\uD83D\uDCD6'}
            </button>
          </div>
        </header>

        {/* Parchment — single question view */}
        <div className="story-parchment">

          {/* The question */}
          <div className="story-question-area">
            {loading || phase === 'writing' ? (
              <div className="story-loading">
                <div className="story-quill-loader">
                  <span className="story-quill-pen">{'\u270E'}</span>
                  <span className="story-quill-trail" />
                </div>
              </div>
            ) : (
              <p
                key={questionKey}
                className={`story-question ${phase === 'revealing' ? 'revealing' : ''}`}
                onClick={() => displayedQuestion && playTTS(displayedQuestion)}
              >
                {displayedQuestion}
              </p>
            )}
          </div>

          {/* Input area */}
          <div className="story-mic-area">
            <div className="story-input-row">
              <button
                className={`story-rec-btn ${recording ? 'recording' : ''} ${transcribing ? 'transcribing' : ''}`}
                onClick={toggleRecording}
                disabled={isBusy || showTextInput}
              >
                <svg className="story-rec-mic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 10a7 7 0 0 0 14 0" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                </svg>
                {!recording && !transcribing && !showTextInput && <span className="story-rec-pulse" />}
              </button>

              <button
                className={`story-quill-toggle ${showTextInput ? 'active' : ''}`}
                onClick={() => {
                  setShowTextInput(prev => !prev)
                  if (!showTextInput) setTimeout(() => textInputRef.current?.focus(), 50)
                }}
                disabled={isBusy}
                title={showTextInput ? t('chat.closeTextInput') : t('chat.typeInstead')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                  <path d="m15 5 4 4" />
                </svg>
              </button>
            </div>

            <button
              className={`story-mute-btn ${muted ? 'muted' : ''}`}
              onClick={() => {
                const next = !muted
                onSetMuted(next)
                if (next && audioRef.current) { audioRef.current.pause(); audioRef.current = null }
              }}
              title={muted ? t('chat.unmuteVoice') : t('chat.muteVoice')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                {muted ? (
                  <>
                    <line x1="23" y1="9" x2="17" y2="15" />
                    <line x1="17" y1="9" x2="23" y2="15" />
                  </>
                ) : (
                  <>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  </>
                )}
              </svg>
            </button>

            {showTextInput && (
              <div className="story-text-input-area">
                <textarea
                  ref={textInputRef}
                  className="story-text-input"
                  placeholder={t('chat.typeYourStory')}
                  value={textInputValue}
                  onChange={(e) => setTextInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      const text = textInputValue.trim()
                      if (text) {
                        sendMessage(text)
                        setTextInputValue('')
                      }
                    }
                  }}
                  rows={2}
                  disabled={isBusy}
                />
                <button
                  className="story-text-send"
                  onClick={() => {
                    const text = textInputValue.trim()
                    if (text) {
                      sendMessage(text)
                      setTextInputValue('')
                    }
                  }}
                  disabled={!textInputValue.trim() || isBusy}
                >
                  {'\u2192'}
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
