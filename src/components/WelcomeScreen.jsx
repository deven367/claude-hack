import { useState, useRef, useEffect } from 'react'
import { BOOK_COLORS } from '../data/chapters'
import { getLanguageInfo } from '../data/translations'
import { getAllLocalStories, ensureShelves, removeFromStoryList } from '../utils/storage'
import { api } from '../utils/api'
import { useLanguage } from '../contexts/LanguageContext'
import SharePanel from './SharePanel'

function BookItem({ story, colorIndex, onRead, onWrite, onDelete, onShare, t }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const c = BOOK_COLORS[colorIndex % BOOK_COLORS.length]
  const isFreeform = story.type === 'freeform'
  const langInfo = story.language ? getLanguageInfo(story.language) : null

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
              ? <>{story.personName}{t('welcome.story')}</>
              : <>{story.personName}{t('welcome.lifeStorybook')}</>}
        </span>
        <div className="library-book-divider" style={{ background: c.text }} />
        <span className="library-book-ornament" style={{ color: c.text }}>{'\u00B7 \u00B7 \u00B7'}</span>
        {langInfo && langInfo.code !== 'en' && (
          <span className="library-book-lang" style={{ color: c.text }}>{langInfo.flag}</span>
        )}
      </div>
      <div className="library-book-actions">
        {confirmDelete ? (
          <div className="library-confirm-delete">
            <span>{t('common.delete')}</span>
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
              {deleting ? '\u23F3' : t('common.yes')}
            </button>
            <button
              className="library-confirm-no"
              disabled={deleting}
              onClick={() => {
                if (deleting) return
                setConfirmDelete(false)
              }}
            >
              {t('common.no')}
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
        <button
          className="library-action-btn library-action-share"
          onClick={() => onShare(story)}
          title="Share story"
        >
          {'\u2197'}
        </button>
      </div>
    </div>
  )
}

function PersonShelf({ personName, books, allStories, onRead, onWrite, onDelete, onShare, t }) {
  if (books.length === 0) return null

  return (
    <div className="shelf-section">
      <div className="shelf-header">
        <div className="shelf-nameplate">
          <span className="shelf-nameplate-text">{personName}{t('welcome.shelf')}</span>
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
            onShare={onShare}
            t={t}
          />
        ))}
      </div>
      <div className="library-shelf-wood" />
    </div>
  )
}

function NewBookCard({ color, title, subtitle, onStart, active, onActivate, onDeactivate, placeholder }) {
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
            placeholder={placeholder}
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

export default function WelcomeScreen({ onStartGuided, onStartFreeform, onContinue, onOpenReader }) {
  const [activeBook, setActiveBook] = useState(null)
  const [, forceUpdate] = useState(0)
  const [shareStory, setShareStory] = useState(null)
  const { t } = useLanguage()
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
    onContinue(story.personId, story.storyId)
  }

  const handleShare = (story) => {
    setShareStory(story)
  }

  // Split the welcome subtitle on \n for line breaks
  const subtitleParts = t('welcome.subtitle').split('\n')

  return (
    <div id="welcome-screen" className="screen active">
      <div className="welcome-ornament">{'\u2727 \u00B7 \u2727 \u00B7 \u2727'}</div>
      <h1 className="welcome-title">{t('welcome.title')}</h1>
      <p className="welcome-subtitle">
        {subtitleParts.map((part, i) => (
          <span key={i}>{part}{i < subtitleParts.length - 1 && <br />}</span>
        ))}
      </p>

      <div className="welcome-books">
        <NewBookCard
          color={BOOK_COLORS[0]}
          title={t('welcome.newLifeStorybook').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
          subtitle={t('welcome.guidedChapters')}
          active={activeBook === 'guided'}
          onActivate={() => setActiveBook('guided')}
          onDeactivate={() => setActiveBook(null)}
          onStart={(name) => onStartGuided(name)}
          placeholder={t('welcome.firstName')}
        />
        <NewBookCard
          color={BOOK_COLORS[1]}
          title={t('welcome.newStory').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
          subtitle={t('welcome.tellItYourWay')}
          active={activeBook === 'freeform'}
          onActivate={() => setActiveBook('freeform')}
          onDeactivate={() => setActiveBook(null)}
          onStart={(name) => onStartFreeform(name)}
          placeholder={t('welcome.firstName')}
        />
      </div>

      {stories.length > 0 && (
        <div className="library-section">
          <h2 className="library-heading">{t('welcome.familyLibrary')}</h2>
          {Object.entries(personGroups).map(([personName, books]) => (
            <PersonShelf
              key={personName}
              personName={personName}
              books={books}
              allStories={stories}
              onRead={handleRead}
              onWrite={handleWrite}
              onDelete={handleDelete}
              onShare={handleShare}
              t={t}
            />
          ))}
        </div>
      )}

      {shareStory && (
        <SharePanel story={shareStory} onClose={() => setShareStory(null)} />
      )}
    </div>
  )
}
