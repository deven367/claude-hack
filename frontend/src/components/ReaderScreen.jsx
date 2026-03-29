import { useState, useEffect, useRef, useCallback } from 'react'
import { CHAPTERS } from '../data/chapters'
import { api } from '../utils/api'

function esc(s) {
  return s.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function guidedToBlocks(chapterData) {
  // chapterData: { chapterIndex: [ { messages, extracted_answers }, ... ] }
  const blocks = []
  CHAPTERS.forEach((chapter, idx) => {
    const sessions = chapterData[idx]
    if (!sessions || sessions.length === 0) return

    const hasContent = sessions.some(s =>
      s.messages && s.messages.some(m => m.role === 'user')
    )
    if (!hasContent) return

    blocks.push(`
      <div class="reader-chapter-header" style="--ch-color: ${chapter.color}">
        <span class="reader-chapter-icon">${chapter.icon}</span>
        <h2 class="reader-chapter-title">${chapter.title}</h2>
        <p class="reader-chapter-subtitle">${chapter.subtitle}</p>
      </div>
    `)

    const contentSessions = sessions.filter(s => s.messages && s.messages.some(m => m.role === 'user'))

    contentSessions.forEach((session, si) => {
      // Session divider (for multi-session chapters)
      if (contentSessions.length > 1) {
        blocks.push(`
          <div class="reader-session-divider" data-session-chapter="${esc(chapter.title)}" data-session-num="${si + 1}">
            <span class="reader-session-ornament">\u2727</span>
            <span class="reader-session-label">Story ${si + 1}</span>
            <span class="reader-session-ornament">\u2727</span>
          </div>
        `)
      }

      session.messages.forEach(msg => {
        if (msg.role === 'assistant') {
          blocks.push(`
            <div class="reader-transcript-prompt">
              <p>${esc(msg.content)}</p>
            </div>
          `)
        } else if (msg.role === 'user') {
          const polished = msg.polished ? esc(msg.polished).replace(/\n/g, '<br>') : null
          const original = esc(msg.content).replace(/\n/g, '<br>')
          if (polished && polished !== original) {
            blocks.push(`
              <div class="reader-transcript-response">
                <p class="reader-text-polished">${polished}</p>
                <p class="reader-text-original">${original}</p>
              </div>
            `)
          } else {
            blocks.push(`
              <div class="reader-transcript-response">
                <p>${original}</p>
              </div>
            `)
          }
        }
      })
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
  const [showOriginal, setShowOriginal] = useState(false)
  const flippingRef = useRef(false)
  const bookRef = useRef(null)
  const touchStartRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    let cancelled = false

    async function load() {
      let coverPage
      let contentBlocks = []

      // Load all conversations grouped by chapter
      const conversations = await api('GET', `/api/conversations/${storyId}`)
      if (cancelled) return
      const chapterData = {}

      if (conversations && conversations.length > 0) {
        const chapterPromises = conversations.map(conv =>
          api('GET', `/api/conversations/${storyId}/${conv.chapter_index}`).then(chapterConvs => ({
            chapterIndex: conv.chapter_index,
            chapterConvs,
          }))
        )

        const chapterResults = await Promise.all(chapterPromises)
        if (cancelled) return

        chapterResults.forEach(({ chapterIndex, chapterConvs }) => {
          if (chapterConvs.sessions && chapterConvs.sessions.length > 0) {
            chapterData[chapterIndex] = chapterConvs.sessions
          }
        })
      }

      // Handle freeform stories (chapter_index = -1)
      if (isFreeform && chapterData[-1]) {
        const freeformSessions = chapterData[-1]
        let storyTitle = null
        for (const session of freeformSessions) {
          if (session.extracted_answers?.title) { storyTitle = session.extracted_answers.title; break }
        }
        const safeStoryTitle = storyTitle ? esc(storyTitle) : null
        coverPage = { type: 'cover', personName, customTitle: safeStoryTitle || `${personName}'s Story` }
        // Render freeform as transcript too
        const blocks = []
        freeformSessions.forEach(session => {
          if (!session.messages) return
          session.messages.forEach(msg => {
            if (msg.role === 'assistant') {
              blocks.push(`<div class="reader-transcript-prompt"><p>${esc(msg.content)}</p></div>`)
            } else if (msg.role === 'user') {
              const polished = msg.polished ? esc(msg.polished).replace(/\n/g, '<br>') : null
              const original = esc(msg.content).replace(/\n/g, '<br>')
              if (polished && polished !== original) {
                blocks.push(`<div class="reader-transcript-response"><p class="reader-text-polished">${polished}</p><p class="reader-text-original">${original}</p></div>`)
              } else {
                blocks.push(`<div class="reader-transcript-response"><p>${original}</p></div>`)
              }
            }
          })
        })
        contentBlocks = blocks
      } else if (isFreeform) {
        const story = await api('GET', `/api/stories/${storyId}`)
        const title = story.title || `${personName}'s Story`
        coverPage = { type: 'cover', personName, customTitle: esc(title) }
        contentBlocks = freeformToBlocks(story.content || '')
      } else {
        coverPage = { type: 'cover', personName }
        contentBlocks = guidedToBlocks(chapterData)
      }

      if (cancelled) return

      // We need a DOM element to measure — use a temporary hidden one
      const tempWrapper = document.createElement('div')
      tempWrapper.style.cssText = 'position:fixed;top:0;left:0;width:580px;height:76vh;visibility:hidden;overflow:hidden;'
      tempWrapper.className = 'reader-page'
      document.body.appendChild(tempWrapper)

      const measuredPages = measureAndPaginate(contentBlocks, tempWrapper)
      document.body.removeChild(tempWrapper)

      // Build page list and track chapter/session start pages for TOC
      const allPages = [coverPage]
      const tocEntries = [] // { title, icon, pageIndex, isSession }

      measuredPages.forEach(html => {
        const pageIndex = allPages.length + 1 // +1 for TOC page we'll insert

        // Check for chapter header
        const chapterMatch = html.match(/reader-chapter-icon">([^<]+)<.*?reader-chapter-title">([^<]+)</)
        if (chapterMatch) {
          tocEntries.push({ icon: chapterMatch[1], title: chapterMatch[2], pageIndex, isSession: false })
        }

        // Check for session divider
        const sessionMatch = html.match(/reader-session-label">([^<]+)</)
        if (sessionMatch && !chapterMatch) {
          // Get chapter name from data attribute
          const chapterNameMatch = html.match(/data-session-chapter="([^"]+)"/)
          const sessionNum = html.match(/data-session-num="([^"]+)"/)
          if (sessionNum) {
            tocEntries.push({
              icon: '',
              title: `Story ${sessionNum[1]}`,
              pageIndex,
              isSession: true,
            })
          }
        }

        allPages.push({ type: 'measured', html })
      })

      // Insert TOC page after cover if there are chapters
      if (tocEntries.length > 0) {
        const tocHtml = `
          <div class="reader-page-gutter"></div>
          <div class="reader-toc">
            <h2 class="reader-toc-heading">Contents</h2>
            <div class="reader-toc-list">
              ${tocEntries.map(e =>
                `<button class="reader-toc-item ${e.isSession ? 'reader-toc-sub' : ''}" data-page="${e.pageIndex}">
                  <span class="reader-toc-icon">${e.icon}</span>
                  <span class="reader-toc-title">${e.title}</span>
                  <span class="reader-toc-dots"></span>
                  <span class="reader-toc-page">${e.pageIndex + 1}</span>
                </button>`
              ).join('')}
            </div>
          </div>
        `
        allPages.splice(1, 0, { type: 'measured', html: tocHtml })
      }

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

  const jumpToPage = useCallback((pageIndex) => {
    if (pageIndex < 0 || pageIndex >= pages.length || flippingRef.current) return
    const book = bookRef.current
    const currentEl = book?.querySelector('#reader-active-page')
    if (!book || !currentEl) return

    const nextPage = pages[pageIndex]
    const nextEl = document.createElement('div')
    nextEl.className = 'reader-page'
    nextEl.id = 'reader-active-page'
    nextEl.innerHTML = buildPageContent(nextPage)

    currentEl.removeAttribute('id')
    currentEl.style.transition = 'opacity 0.3s'
    currentEl.style.opacity = '0'
    nextEl.style.opacity = '0'
    book.insertBefore(nextEl, currentEl)

    setTimeout(() => {
      currentEl.remove()
      nextEl.style.transition = 'opacity 0.3s'
      nextEl.style.opacity = '1'
      nextEl.scrollTop = 0
      setCurrentPage(pageIndex)
    }, 300)
  }, [pages])

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
        <div className={`reader-book ${showOriginal ? 'show-original' : ''}`} ref={bookRef}>
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
              // TOC navigation
              const tocItem = e.target.closest('.reader-toc-item')
              if (tocItem) {
                const targetPage = parseInt(tocItem.dataset.page, 10)
                if (!isNaN(targetPage)) jumpToPage(targetPage)
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
        <button
          className={`reader-original-toggle ${showOriginal ? 'active' : ''}`}
          onClick={() => setShowOriginal(prev => !prev)}
          title={showOriginal ? 'Show polished text' : 'Show original transcript'}
        >
          {showOriginal ? 'Polished' : 'Original'}
        </button>
      </nav>
    </div>
  )
}
