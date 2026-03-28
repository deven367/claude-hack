import { useState, useRef, useEffect } from 'react'
import { BOOK_COLORS } from '../data/chapters'
import {
  getAllLocalStories, ensureShelves, getShelves, saveShelves,
  addShelf, renameShelf, deleteShelf as deleteShelfStorage,
} from '../utils/storage'

function BookItem({ story, colorIndex, onRead, onWrite }) {
  const c = BOOK_COLORS[colorIndex % BOOK_COLORS.length]
  const isFreeform = story.type === 'freeform'
  const bookTitle = story.storyTitle
    ? story.storyTitle
    : `${story.personName}\u2019s Story`

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
          {'\u{1F4D6}'} Read
        </button>
        <button className="library-action-btn library-action-write" onClick={() => onWrite(story)}>
          {'\u270F\uFE0F'} Write
        </button>
      </div>
    </div>
  )
}

function ShelfSection({ shelf, stories, allStories, shelves, onRead, onWrite, onRename, onDelete }) {
  const shelfBooks = stories.filter(s => s.shelfId === shelf.id)
  const canDelete = shelves.length > 1
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState(shelf.name)
  const renameRef = useRef(null)

  useEffect(() => {
    if (renaming && renameRef.current) {
      renameRef.current.focus()
      renameRef.current.select()
    }
  }, [renaming])

  const commitRename = () => {
    const name = renameValue.trim() || shelf.name
    onRename(shelf.id, name)
    setRenaming(false)
  }

  return (
    <div className="shelf-section">
      <div className="shelf-header">
        <div className="shelf-nameplate">
          {renaming ? (
            <input
              ref={renameRef}
              type="text"
              className="shelf-nameplate-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitRename() }
                if (e.key === 'Escape') setRenaming(false)
              }}
            />
          ) : (
            <span className="shelf-nameplate-text">{shelf.name}</span>
          )}
        </div>
        {!renaming && (
          <button className="shelf-rename-btn" onClick={() => { setRenameValue(shelf.name); setRenaming(true) }} title="Rename shelf">
            {'\u270E'}
          </button>
        )}
        {canDelete && (
          <button className="shelf-delete-btn" onClick={() => onDelete(shelf.id)} title="Remove shelf">
            {'\u2715'}
          </button>
        )}
      </div>
      <div className="library-shelf">
        {shelfBooks.length > 0
          ? shelfBooks.map((s) => (
            <BookItem
              key={s.storyId}
              story={s}
              colorIndex={allStories.indexOf(s)}
              onRead={onRead}
              onWrite={onWrite}
            />
          ))
          : <p className="shelf-empty-msg">No books on this shelf yet</p>
        }
      </div>
      <div className="library-shelf-wood" />
    </div>
  )
}

export default function WelcomeScreen({ onStartGuided, onStartFreeform, onContinue, onOpenCompose, onOpenReader }) {
  const [name, setName] = useState('')
  const [selectedShelfId, setSelectedShelfId] = useState(null)
  const [, forceUpdate] = useState(0)
  const [addingShelf, setAddingShelf] = useState(false)
  const [newShelfName, setNewShelfName] = useState('')
  const addShelfRef = useRef(null)

  const stories = getAllLocalStories()
  const shelves = ensureShelves()
  const activeShelfId = selectedShelfId || shelves[0]?.id

  useEffect(() => {
    if (addingShelf && addShelfRef.current) addShelfRef.current.focus()
  }, [addingShelf])

  const hasName = name.trim().length > 0

  const handleBeginGuided = () => {
    if (hasName) onStartGuided(name.trim(), activeShelfId)
  }

  const handleBeginFreeform = () => {
    if (hasName) onStartFreeform(name.trim(), activeShelfId)
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

  const handleRenameShelf = (shelfId, newName) => {
    renameShelf(shelfId, newName)
    forceUpdate(n => n + 1)
  }

  const handleDeleteShelf = (shelfId) => {
    const fallbackId = deleteShelfStorage(shelfId)
    if (fallbackId && selectedShelfId === shelfId) setSelectedShelfId(fallbackId)
    forceUpdate(n => n + 1)
  }

  const handleAddShelf = () => {
    const trimmed = newShelfName.trim()
    if (!trimmed) return
    const newId = addShelf(trimmed)
    setSelectedShelfId(newId)
    setAddingShelf(false)
    setNewShelfName('')
    forceUpdate(n => n + 1)
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
        <label className="welcome-name-label">What{'\u2019'}s your name?</label>
        <input
          type="text"
          className="welcome-name-input"
          placeholder="Your first name..."
          autoComplete="given-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && hasName) handleBeginGuided() }}
        />

        {shelves.length > 1 && (
          <div className="shelf-selector">
            <span className="shelf-selector-label">Add to:</span>
            {shelves.map(sh => (
              <button
                key={sh.id}
                className={`shelf-pill ${sh.id === activeShelfId ? 'active' : ''}`}
                onClick={() => setSelectedShelfId(sh.id)}
              >
                {sh.name}
              </button>
            ))}
          </div>
        )}

        <button className="welcome-begin" disabled={!hasName} onClick={handleBeginGuided}>
          Begin Guided Story
        </button>
        <button
          className="welcome-begin"
          disabled={!hasName}
          onClick={handleBeginFreeform}
          style={{ background: 'var(--brown-light)', fontSize: '1rem', padding: '0.7rem 2rem' }}
        >
          {'\u270D\uFE0F'} Write a Blank Story
        </button>
      </div>

      {(stories.length > 0 || shelves.length > 0) && (
        <div className="library-section">
          <h2 className="library-heading">Family Library</h2>
          <p className="library-subheading">Your stories, organized by shelf</p>
          {shelves.map(sh => (
            <ShelfSection
              key={sh.id}
              shelf={sh}
              stories={stories}
              allStories={stories}
              shelves={shelves}
              onRead={handleRead}
              onWrite={handleWrite}
              onRename={handleRenameShelf}
              onDelete={handleDeleteShelf}
            />
          ))}
          <div>
            {addingShelf ? (
              <div className="add-shelf-inline">
                <input
                  ref={addShelfRef}
                  type="text"
                  className="add-shelf-input"
                  placeholder="Shelf name\u2026"
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddShelf()
                    if (e.key === 'Escape') setAddingShelf(false)
                  }}
                />
                <button className="add-shelf-confirm" onClick={handleAddShelf}>Add</button>
              </div>
            ) : (
              <button className="add-shelf-btn" onClick={() => setAddingShelf(true)}>
                + Add a New Shelf
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
