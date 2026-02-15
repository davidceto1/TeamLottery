import { useEffect } from 'react'

const COLORS = ['#5b9bd5', '#2a4fa0', '#ffffff', '#8fb1cd', '#1a2d5a', '#a8d0f0']
const PIECE_COUNT = 60

interface ConfettiProps {
  onDone: () => void
}

function Confetti({ onDone }: ConfettiProps) {
  useEffect(() => {
    const pieces: HTMLDivElement[] = []

    for (let i = 0; i < PIECE_COUNT; i++) {
      const piece = document.createElement('div')
      piece.className = 'confetti-piece'
      piece.style.left = `${Math.random() * 100}vw`
      piece.style.background = COLORS[Math.floor(Math.random() * COLORS.length)]
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      const size = 6 + Math.random() * 8
      piece.style.width = `${size}px`
      piece.style.height = `${size}px`
      document.body.appendChild(piece)
      pieces.push(piece)

      const duration = 1500 + Math.random() * 2000
      const anim = piece.animate(
        [
          { top: '-12px', opacity: 1, transform: 'rotate(0deg) translateX(0)' },
          {
            top: '105vh',
            opacity: 0,
            transform: `rotate(${Math.random() * 720}deg) translateX(${(Math.random() - 0.5) * 200}px)`,
          },
        ],
        {
          duration,
          delay: Math.random() * 400,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        },
      )

      anim.onfinish = () => piece.remove()
    }

    const timeout = setTimeout(onDone, 4000)

    return () => {
      clearTimeout(timeout)
      pieces.forEach((p) => p.remove())
    }
  }, [onDone])

  return null
}

export default Confetti
