import { useState, useRef, useEffect } from 'react'
import { BOOK_COLORS } from '../data/chapters'
import { getAllLocalStories, ensureShelves, removeFromStoryList } from '../utils/storage'
import { api } from '../utils/api'

function BookItem({ story, colorIndex, onRead, onWrite, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const c = BOOK_COLORS[colorIndex % BOOK_COLORS.length]
  const isFreeform = story.type === 'freeform'

  return (
    <div className="library-book-item">
      <div
        className="library-book"
        style={{ background: `linear-gradient(145deg, ${c.bg}, ${c.bgDark})` }}
        onClick={() => onRead(story)}
        title={`Read ${story.personName}\u2019s Story`}
      >
        <span className="library-book-ornament" style={{ color: c.text }}>
          {isFreeform ? '\u{1F4DC}' : '\u2726'}
        </span>
        <span className="library-book-title" style={{ color: c.text }}>
          {story.storyTitle
            ? story.storyTitle
            : isFreeform
              ? <>{story.personName}{'\u2019'}s<br />Story</>
              : <>{story.personName}{'\u2019'}s<br />Life Storybook</>}
        </span>
        <div className="library-book-divider" style={{ background: c.text }} />
        <span className="library-book-ornament" style={{ color: c.text }}>{'\u00B7 \u00B7 \u00B7'}</span>
      </div>
      <div className="library-book-actions">
        {confirmDelete ? (
          <div className="library-confirm-delete">
            <span>Delete?</span>
            <button
              className="library-confirm-yes"
              disabled={deleting}
              onClick={async () => {
                if (deleting) return
                setDeleting(true)
                try {
                  await onDelete(story)
                } finally {
                  setDeleting(false)
                  setConfirmDelete(false)
                }
              }}
            >
              {deleting ? '\u23F3' : 'Yes'}
            </button>
            <button
              className="library-confirm-no"
              disabled={deleting}
              onClick={() => {
                if (deleting) return
                setConfirmDelete(false)
              }}
            >
              No
            </button>
          </div>
        ) : (
          <button className="library-action-btn library-action-delete" onClick={() => setConfirmDelete(true)} title="Delete">
            {'\u2715'}
          </button>
        )}
        <button className="library-action-btn library-action-write" onClick={() => onWrite(story)} title="Continue writing">
          {'\u270E'}
        </button>
      </div>
    </div>
  )
}

function PersonShelf({ personName, books, allStories, onRead, onWrite, onDelete }) {
  if (books.length === 0) return null

  return (
    <div className="shelf-section">
      <div className="shelf-header">
        <div className="shelf-nameplate">
          <span className="shelf-nameplate-text">{personName}{'\u2019'}s Shelf</span>
        </div>
      </div>
      <div className="library-shelf">
        {books.map((s) => (
          <BookItem
            key={s.storyId}
            story={s}
            colorIndex={allStories.indexOf(s)}
            onRead={onRead}
            onWrite={onWrite}
            onDelete={onDelete}
          />
        ))}
      </div>
      <div className="library-shelf-wood" />
    </div>
  )
}

function NewBookCard({ color, title, subtitle, onStart, active, onActivate, onDeactivate }) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    if (active && inputRef.current) inputRef.current.focus()
  }, [active])

  useEffect(() => {
    if (!active) setName('')
  }, [active])

  useEffect(() => {
    if (!active) return
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        onDeactivate()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [active, onDeactivate])

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (trimmed) onStart(trimmed)
  }

  return (
    <div className="new-book-card" ref={cardRef}>
      <div
        className={`new-book ${active ? 'flipped' : ''}`}
        style={{ background: `linear-gradient(145deg, ${color.bg}, ${color.bgDark})` }}
        onClick={() => onActivate()}
      >
        {/* Front face */}
        <div className="new-book-front">
          <span className="new-book-ornament" style={{ color: color.text }}>{'\u2726'}</span>
          <span className="new-book-title" style={{ color: color.text }}>{title}</span>
          <div className="new-book-divider" style={{ background: color.text }} />
          <span className="new-book-subtitle" style={{ color: color.text }}>{subtitle}</span>
        </div>
      </div>

      {/* Name input — slides out below the book */}
      {active && (
        <div className="new-book-input-bubble">
          <input
            ref={inputRef}
            type="text"
            className="new-book-name-input"
            placeholder="Your first name..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit()
              if (e.key === 'Escape') { onDeactivate(); setName('') }
            }}
          />
          <button
            className="new-book-go-btn"
            disabled={!name.trim()}
            onClick={handleSubmit}
          >
            {'\u2192'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function WelcomeScreen({ onStartGuided, onStartFreeform, onContinue, onOpenCompose, onOpenReader }) {
  const [activeBook, setActiveBook] = useState(null)
  const [, forceUpdate] = useState(0)
  const stories = getAllLocalStories()
  ensureShelves()

  // Group stories by personName
  const personGroups = {}
  stories.forEach(s => {
    const key = s.personName || 'Unknown'
    if (!personGroups[key]) personGroups[key] = []
    personGroups[key].push(s)
  })

  const handleDelete = async (story) => {
    try {
      await api('DELETE', `/api/stories/${story.storyId}`)
    } catch (err) {
      // backend might fail if already deleted, still clean up local
    }
    removeFromStoryList(story.storyId)
    forceUpdate(n => n + 1)
  }

  const handleRead = (story) => {
    onOpenReader(story.personId, story.storyId, story.personName, story.type === 'freeform')
  }

  const handleWrite = (story) => {
    if (story.type === 'freeform') {
      onOpenCompose(story.personId, story.storyId, story.personName)
    } else {
      onContinue(story.personId, story.storyId)
    }
  }

  return (
    <div id="welcome-screen" className="screen active">
      <div className="welcome-ornament">{'\u2727 \u00B7 \u2727 \u00B7 \u2727'}</div>
      <h1 className="welcome-title">Share Your Story</h1>
      <p className="welcome-subtitle">
        Everyone has a story worth preserving.<br />
        Let{'\u2019'}s capture yours, one memory at a time.
      </p>

      <div className="welcome-books">
        <NewBookCard
          color={BOOK_COLORS[0]}
          title={<>New Life<br />Storybook</>}
          subtitle="Guided chapters"
          active={activeBook === 'guided'}
          onActivate={() => setActiveBook('guided')}
          onDeactivate={() => setActiveBook(null)}
          onStart={(name) => onStartGuided(name)}
        />
        <NewBookCard
          color={BOOK_COLORS[1]}
          title={<>New<br />Story</>}
          subtitle="Tell it your way"
          active={activeBook === 'freeform'}
          onActivate={() => setActiveBook('freeform')}
          onDeactivate={() => setActiveBook(null)}
          onStart={(name) => onStartFreeform(name)}
        />
      </div>

      {stories.length > 0 && (
        <div className="library-section">
          <h2 className="library-heading">Your Family{'\u2019'}s Library</h2>
          {Object.entries(personGroups).map(([personName, books]) => (
            <PersonShelf
              key={personName}
              personName={personName}
              books={books}
              allStories={stories}
              onRead={handleRead}
              onWrite={handleWrite}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
