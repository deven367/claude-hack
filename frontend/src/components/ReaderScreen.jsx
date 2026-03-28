import { useState, useEffect, useRef, useCallback } from 'react'
import { CHAPTERS } from '../data/chapters'
import { api } from '../utils/api'

function esc(s) {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function guidedToBlocks(answers) {
  const blocks = []
  CHAPTERS.forEach(chapter => {
    const items = chapter.questions
      .map(q => ({ question: q.text, answer: answers[`${chapter.id}_${q.id}`] || '' }))
      .filter(qa => qa.answer.trim().length > 0)
    if (items.length === 0) return

    blocks.push(`
      <div class="reader-chapter-header" style="--ch-color: ${chapter.color}">
        <span class="reader-chapter-icon">${chapter.icon}</span>
        <h2 class="reader-chapter-title">${chapter.title}</h2>
        <p class="reader-chapter-subtitle">${chapter.subtitle}</p>
      </div>
    `)

    items.forEach(qa => {
      blocks.push(`
        <div class="reader-qa">
          <p class="reader-qa-question">${qa.question}</p>
          <p class="reader-qa-answer">${esc(qa.answer).replace(/\n/g, '<br>')}</p>
        </div>
      `)
    })
  })
  return blocks
}

function freeformToBlocks(content) {
  if (!content.trim()) return []
  const blocks = []
  const lines = content.split(/\n/).filter(l => l.trim())
  lines.forEach(line => {
    const words = line.trim().split(/\s+/)
    if (words.length > 100) {
      const sentences = line.match(/[^.!?]+[.!?]+[\s]*/g) || [line]
      let chunk = ''
      sentences.forEach(s => {
        if ((chunk + s).split(/\s+/).length > 60 && chunk.trim()) {
          blocks.push(`<p class="reader-freeform-para">${esc(chunk.trim())}</p>`)
          chunk = s
        } else {
          chunk += s
        }
      })
      if (chunk.trim()) blocks.push(`<p class="reader-freeform-para">${esc(chunk.trim())}</p>`)
    } else {
      blocks.push(`<p class="reader-freeform-para">${esc(line.trim())}</p>`)
    }
  })
  return blocks
}

function measureAndPaginate(blocks, measureEl) {
  const maxHeight = measureEl.clientHeight - 16
  const pages = []
  let currentHtml = []

  blocks.forEach(blockHtml => {
    const testHtml = currentHtml.concat([blockHtml]).join('')
    measureEl.innerHTML = `<div class="reader-page-gutter"></div><div>${testHtml}</div>`

    if (measureEl.children[1].scrollHeight > maxHeight && currentHtml.length > 0) {
      pages.push(currentHtml.join(''))
      currentHtml = [blockHtml]
    } else {
      currentHtml.push(blockHtml)
    }
  })

  if (currentHtml.length > 0) {
    pages.push(currentHtml.join(''))
  }

  measureEl.innerHTML = ''
  return pages
}

function buildPageContent(page) {
  if (page.type === 'cover') {
    const displayTitle = page.customTitle && page.customTitle !== `${page.personName}'s Story`
      ? page.customTitle
      : `${page.personName}\u2019s<br>Story`
    const subtitle = page.customTitle && page.customTitle !== `${page.personName}'s Story`
      ? `by ${page.personName}`
      : 'A collection of memories,<br>moments, and the little things<br>that make a life.'
    return `
      <div class="reader-page-gutter"></div>
      <div class="reader-cover-content">
        <div class="reader-cover-frame">
          <div class="reader-cover-ornament">\u2727 \u00B7 \u2727 \u00B7 \u2727</div>
          <h1 class="reader-cover-title">${displayTitle}</h1>
          <div class="reader-cover-line"></div>
          <p class="reader-cover-subtitle">${subtitle}</p>
          <p class="reader-cover-foot">\u2727</p>
        </div>
      </div>
    `
  }

  if (page.type === 'measured') {
    return `<div class="reader-page-gutter"></div>${page.html}`
  }

  if (page.type === 'end') {
    return `
      <div class="reader-page-gutter"></div>
      <div class="reader-end-content">
        <div class="reader-end-ornament">\u2727 \u00B7 \u2727 \u00B7 \u2727</div>
        <h2 class="reader-end-title">The End</h2>
        <div class="reader-end-line"></div>
        <p class="reader-end-subtitle">Every story matters.<br>Thank you for sharing yours.</p>
      </div>
    `
  }

  return ''
}

export default function ReaderScreen({ personId, storyId, personName, isFreeform, onGoHome }) {
  const [pages, setPages] = useState([])
  const [currentPage, setCurrentPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const flippingRef = useRef(false)
  const bookRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false

    async function load() {
      let coverPage
      let contentBlocks = []

      if (isFreeform) {
        const story = await api('GET', `/api/stories/${storyId}`)
        const title = story.title || `${personName}'s Story`
        coverPage = { type: 'cover', personName, customTitle: title }
        contentBlocks = freeformToBlocks(story.content || '')
      } else {
        const responses = await api('GET', `/api/responses/${storyId}`)
        const answers = {}
        responses.forEach(r => { answers[r.question] = r.answer })
        coverPage = { type: 'cover', personName }
        contentBlocks = guidedToBlocks(answers)
      }

      if (cancelled) return

      // We need a DOM element to measure — use a temporary hidden one
      const tempWrapper = document.createElement('div')
      tempWrapper.style.cssText = 'position:fixed;top:0;left:0;width:580px;height:76vh;visibility:hidden;overflow:hidden;'
      tempWrapper.className = 'reader-page'
      document.body.appendChild(tempWrapper)

      const measuredPages = measureAndPaginate(contentBlocks, tempWrapper)
      document.body.removeChild(tempWrapper)

      const allPages = [coverPage]
      measuredPages.forEach(html => allPages.push({ type: 'measured', html }))
      allPages.push({ type: 'end' })

      if (!cancelled) {
        setPages(allPages)
        setCurrentPage(0)
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [personId, storyId, personName, isFreeform])

  const flip = useCallback((direction) => {
    if (flippingRef.current) return
    const nextIndex = currentPage + direction
    if (nextIndex < 0 || nextIndex >= pages.length) return

    flippingRef.current = true

    const book = bookRef.current
    const currentEl = book?.querySelector('#reader-active-page')
    if (!book || !currentEl) { flippingRef.current = false; return }

    currentEl.removeAttribute('id')
    currentEl.style.overflow = 'hidden'

    const nextPage = pages[nextIndex]
    const nextEl = document.createElement('div')
    nextEl.className = 'reader-page'
    nextEl.id = 'reader-active-page'
    nextEl.innerHTML = buildPageContent(nextPage)

    if (direction === 1) {
      nextEl.style.transform = 'rotateY(180deg)'
      book.insertBefore(nextEl, currentEl)
      void nextEl.offsetHeight
      currentEl.classList.add('flip-out-forward')
      nextEl.classList.add('flip-in-forward')
    } else {
      nextEl.style.transform = 'rotateY(-180deg)'
      book.insertBefore(nextEl, currentEl)
      void nextEl.offsetHeight
      currentEl.classList.add('flip-out-backward')
      nextEl.classList.add('flip-in-backward')
    }

    setTimeout(() => {
      currentEl.remove()
      nextEl.className = 'reader-page'
      nextEl.style.transform = ''
      nextEl.scrollTop = 0
      setCurrentPage(nextIndex)
      flippingRef.current = false
    }, 720)
  }, [currentPage, pages])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); flip(1) }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); flip(-1) }
      if (e.key === 'Escape') onGoHome()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [flip, onGoHome])

  const handleTouchStart = (e) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
  }

  const handleTouchEnd = (e) => {
    const dx = touchStartRef.current.x - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartRef.current.y - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 50 && Math.abs(dx) > dy) {
      flip(dx > 0 ? 1 : -1)
    }
  }

  const handleEndBtn = (e) => {
    e.stopPropagation()
    onGoHome()
  }

  if (loading) {
    return (
      <div id="reader-screen" className="screen active">
        <div className="reader-book-wrapper">
          <div className="reader-book">
            <div className="reader-book-spine" />
            <div className="reader-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p className="reader-empty-msg">Loading...</p>
            </div>
            <div className="reader-book-edges" />
          </div>
        </div>
      </div>
    )
  }

  const page = pages[currentPage]

  return (
    <div id="reader-screen" className="screen active">
      <button className="reader-close" onClick={onGoHome} title="Return to library">{'\u2715'}</button>

      <div
        className="reader-book-wrapper"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="reader-book" ref={bookRef}>
          <div className="reader-book-spine" />
          <div
            className="reader-page"
            id="reader-active-page"
            dangerouslySetInnerHTML={{
              __html: page.type === 'end'
                ? buildPageContent(page).replace(
                    '</div>\n    ',
                    `<button class="reader-end-btn" id="reader-end-btn">Return to Library</button></div>\n    `
                  )
                : buildPageContent(page)
            }}
            onClick={(e) => {
              if (e.target.id === 'reader-end-btn' || e.target.classList.contains('reader-end-btn')) {
                onGoHome()
              }
            }}
          />
          <div className="reader-book-edges" />
        </div>
      </div>

      <nav className="reader-nav">
        <button className="reader-nav-btn" onClick={() => flip(-1)} disabled={currentPage === 0}>{'\u2190'}</button>
        <span className="reader-page-indicator">{currentPage + 1} of {pages.length}</span>
        <button className="reader-nav-btn" onClick={() => flip(1)} disabled={currentPage === pages.length - 1}>{'\u2192'}</button>
      </nav>
    </div>
  )
}
