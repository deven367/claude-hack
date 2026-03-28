import { useState, useRef, useEffect, useCallback } from 'react'
import { CHAPTERS } from '../data/chapters'
import { api } from '../utils/api'
import QuestionCard from './QuestionCard'

export default function JourneyScreen({ personName, storyId, initialAnswers, onGoHome }) {
  const [currentChapter, setCurrentChapter] = useState(0)
  const [answers, setAnswers] = useState(initialAnswers || {})
  const [saveText, setSaveText] = useState('saved \u2713')
  const [saveVisible, setSaveVisible] = useState(false)
  const saveTimerRef = useRef(null)
  const hideTimerRef = useRef(null)
  const activeDotRef = useRef(null)

  const chapter = CHAPTERS[currentChapter]

  useEffect(() => {
    document.documentElement.style.setProperty('--chapter-color', chapter.color)
  }, [chapter.color])

  useEffect(() => {
    if (activeDotRef.current) {
      activeDotRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [currentChapter])

  const handleAnswer = useCallback((questionId, answer) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))

    clearTimeout(saveTimerRef.current)
    clearTimeout(hideTimerRef.current)

    saveTimerRef.current = setTimeout(async () => {
      setSaveText('saving...')
      setSaveVisible(true)

      await api('POST', '/api/responses', {
        story_id: storyId,
        question: questionId,
        answer: answer,
      })

      setSaveText('saved \u2713')
      hideTimerRef.current = setTimeout(() => setSaveVisible(false), 1500)
    }, 800)
  }, [storyId])

  const hasChapterAnswers = (i) => {
    const ch = CHAPTERS[i]
    return ch.questions.some(q => {
      const key = `${ch.id}_${q.id}`
      return answers[key]?.trim().length > 0
    })
  }

  const goChapter = (index) => {
    if (index < 0 || index >= CHAPTERS.length) return
    setCurrentChapter(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isFirst = currentChapter === 0
  const isLast = currentChapter === CHAPTERS.length - 1
  const next = !isLast ? CHAPTERS[currentChapter + 1] : null
  const prev = !isFirst ? CHAPTERS[currentChapter - 1] : null

  return (
    <div id="journey-screen" className="screen active">
      <header className="journey-header">
        <button className="journey-back" onClick={onGoHome} title="Back to home">{'\u2190'}</button>
        <span className="journey-person-name">{personName}{'\u2019'}s Story</span>
        <span className={`save-indicator ${saveVisible ? 'visible' : ''}`}>{saveText}</span>
      </header>

      <nav className="chapter-nav">
        {CHAPTERS.map((ch, i) => (
          <div
            key={ch.id}
            ref={i === currentChapter ? activeDotRef : null}
            className={`chapter-dot ${i === currentChapter ? 'active' : ''} ${hasChapterAnswers(i) ? 'has-answers' : ''}`}
            title={ch.title}
            style={i === currentChapter ? { borderColor: ch.color, background: ch.color } : undefined}
            onClick={() => { if (i !== currentChapter) goChapter(i) }}
          >
            <span className="chapter-dot-icon">{ch.icon}</span>
          </div>
        ))}
      </nav>

      <main className="chapter-content" key={currentChapter}>
        <div className="chapter-header">
          <span className="chapter-icon">{chapter.icon}</span>
          <h2 className="chapter-title">{chapter.title}</h2>
          <p className="chapter-subtitle">{chapter.subtitle}</p>
        </div>

        <div className="question-grid">
          {chapter.questions.map(q => (
            <QuestionCard
              key={`${chapter.id}_${q.id}`}
              question={q}
              chapterId={chapter.id}
              savedAnswer={answers[`${chapter.id}_${q.id}`] || ''}
              onAnswer={handleAnswer}
            />
          ))}
        </div>

        <div className="chapter-nav-buttons">
          <button
            className={`chapter-btn chapter-btn-prev ${isFirst ? 'invisible' : ''}`}
            onClick={() => goChapter(currentChapter - 1)}
          >
            {'\u2190'} {prev ? prev.title : ''}
          </button>
          <span className="chapter-progress">{currentChapter + 1} of {CHAPTERS.length}</span>
          {isLast ? (
            <button className="chapter-btn chapter-btn-next" onClick={onGoHome} style={{ background: 'var(--sage)' }}>
              Finish {'\u2713'}
            </button>
          ) : (
            <button
              className="chapter-btn chapter-btn-next"
              onClick={() => goChapter(currentChapter + 1)}
              style={{ background: next.color }}
            >
              {next.title} {'\u2192'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
