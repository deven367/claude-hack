import { useState, useRef, useEffect } from 'react'
import { BOOK_COLORS } from '../data/chapters'
import { getAllLocalStories, ensureShelves } from '../utils/storage'

function BookItem({ story, colorIndex, onRead, onWrite }) {
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
        <span
          className="library-book-title"
          style={{ color: c.text }}
          dangerouslySetInnerHTML={{ __html: story.storyTitle ? story.storyTitle : `${story.personName}\u2019s<br>Story` }}
        />
        <div className="library-book-divider" style={{ background: c.text }} />
        <span className="library-book-ornament" style={{ color: c.text }}>{'\u00B7 \u00B7 \u00B7'}</span>
      </div>
      <div className="library-book-actions">
        <button className="library-action-btn library-action-read" onClick={() => onRead(story)}>
          Read
        </button>
        <button className="library-action-btn library-action-write" onClick={() => onWrite(story)}>
          Continue
        </button>
      </div>
    </div>
  )
}

function PersonShelf({ personName, books, allStories, onRead, onWrite }) {
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
          />
        ))}
      </div>
      <div className="library-shelf-wood" />
    </div>
  )
}

export default function WelcomeScreen({ onStartGuided, onStartFreeform, onContinue, onOpenCompose, onOpenReader }) {
  const [name, setName] = useState('')

  const stories = getAllLocalStories()
  ensureShelves()

  const hasName = name.trim().length > 0

  // Group stories by personName
  const personGroups = {}
  stories.forEach(s => {
    const key = s.personName || 'Unknown'
    if (!personGroups[key]) personGroups[key] = []
    personGroups[key].push(s)
  })

  const handleBeginGuided = () => {
    if (hasName) onStartGuided(name.trim())
  }

  const handleBeginFreeform = () => {
    if (hasName) onStartFreeform(name.trim())
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

      <div className="welcome-form">
        <label className="welcome-name-label">Who{'\u2019'}s story is this?</label>
        <input
          type="text"
          className="welcome-name-input"
          placeholder="Your first name..."
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && hasName) handleBeginGuided() }}
        />

        <button className="welcome-begin welcome-begin-primary" disabled={!hasName} onClick={handleBeginGuided}>
          Begin Your Life Storybook
        </button>

        <div className="welcome-or-divider">
          <span className="welcome-or-line" />
          <span className="welcome-or-text">or</span>
          <span className="welcome-or-line" />
        </div>

        <button className="welcome-begin welcome-begin-secondary" disabled={!hasName} onClick={handleBeginFreeform}>
          Tell a Story of Your Own
        </button>
      </div>

      {stories.length > 0 && (
        <div className="library-section">
          <h2 className="library-heading">Your Family's Library</h2>
          <p className="library-subheading">Stories organized by person</p>
          {Object.entries(personGroups).map(([personName, books]) => (
            <PersonShelf
              key={personName}
              personName={personName}
              books={books}
              allStories={stories}
              onRead={handleRead}
              onWrite={handleWrite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
