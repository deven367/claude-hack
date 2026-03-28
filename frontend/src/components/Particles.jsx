import { useEffect, useRef } from 'react'

const COLORS = ['#D4A574', '#D4A5A5', '#B5C9A8', '#C5B3D6', '#A3C4D9']

export default function Particles() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div')
      p.className = 'particle'
      const size = 3 + Math.random() * 5
      const duration = 15 + Math.random() * 25
      const delay = Math.random() * duration
      p.style.cssText = `
        width: ${size}px; height: ${size}px;
        left: ${Math.random() * 100}%;
        bottom: -10px;
        background: ${COLORS[i % COLORS.length]};
        animation-duration: ${duration}s;
        animation-delay: -${delay}s;
        --p-opacity: ${0.1 + Math.random() * 0.15};
      `
      container.appendChild(p)
    }
    return () => { container.innerHTML = '' }
  }, [])

  return <div ref={containerRef} id="particles-container" />
}
