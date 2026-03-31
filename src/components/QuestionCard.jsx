import { useRef, useEffect, useCallback } from 'react'

export default function QuestionCard({ question, chapterId, savedAnswer, onAnswer }) {
  const qKey = `${chapterId}_${question.id}`
  const answered = savedAnswer?.trim().length > 0
  const textareaRef = useRef(null)

  const autoResize = useCallback(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    }
  }, [])

  useEffect(() => {
    if (question.type === 'long') autoResize()
  }, [question.type, autoResize])

  const handleChange = (e) => {
    onAnswer(qKey, e.target.value)
    if (question.type === 'long') autoResize()
  }

  return (
    <div className={`question-card ${question.size === 'full' ? 'full' : ''} ${answered ? 'answered' : ''}`}>
      <span className="question-bloom">{'\u2728'}</span>
      <label className="question-prompt">{question.text}</label>
      {question.type === 'long' ? (
        <textarea
          ref={textareaRef}
          className="question-input question-input-long"
          data-autoresize=""
          placeholder={question.placeholder || ''}
          defaultValue={savedAnswer || ''}
          onChange={handleChange}
        />
      ) : (
        <input
          type="text"
          className="question-input question-input-short"
          placeholder={question.placeholder || ''}
          defaultValue={savedAnswer || ''}
          onChange={handleChange}
        />
      )}
    </div>
  )
}
