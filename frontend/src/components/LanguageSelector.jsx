import { useState, useRef, useEffect } from 'react'
import { LANGUAGES, getLanguageInfo } from '../data/translations'
import { useLanguage } from '../contexts/LanguageContext'

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const info = getLanguageInfo(language)

  useEffect(() => {
    if (!open) return
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="language-selector" ref={ref}>
      <button className="language-selector-btn" onClick={() => setOpen(o => !o)}>
        <span className="language-flag">{info.flag}</span>
        <span className="language-code">{info.code.toUpperCase()}</span>
        <span className="language-chevron">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open && (
        <div className="language-dropdown">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              className={`language-option ${lang.code === language ? 'active' : ''}`}
              onClick={() => { setLanguage(lang.code); setOpen(false) }}
            >
              <span className="language-flag">{lang.flag}</span>
              <span className="language-option-name">{lang.nativeName}</span>
              {lang.code === language && <span className="language-check">{'\u2713'}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
