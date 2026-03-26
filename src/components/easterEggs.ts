// Easter eggs — add a new entry to EASTER_EGGS to create a secret animation
// for a specific winner name.
//
// Each egg needs:
//   matches(name)  — return true when this egg should fire
//   render(ctx)    — draw the animation for one frame

export interface EasterEggParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  opacity: number
  size: number
  gravity: number
}

export interface EasterEggRenderContext {
  ctx: CanvasRenderingContext2D
  /** ms elapsed since the egg started (already offset by ball-move animation) */
  elapsed: number
  /** mutable particle array — push new ones, splice dead ones */
  particles: EasterEggParticle[]
  canvasWidth: number
  canvasHeight: number
  cx: number
  cy: number
}

export interface EasterEggDef {
  matches: (name: string) => boolean
  render: (context: EasterEggRenderContext) => void
}

// ─── Jo — unicorn rainbow vomit ──────────────────────────────────────────────

const RAINBOW_COLORS = [
  '#FF0000', '#FF4500', '#FF8C00', '#FFD700', '#FFFF00',
  '#7FFF00', '#00FF00', '#00CED1', '#1E90FF', '#4B0082', '#8B00FF',
]

function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

const joUnicorn: EasterEggDef = {
  matches: (name) => name.toLowerCase() === 'jo',

  render({ ctx, elapsed, particles, canvasWidth, canvasHeight, cx, cy }) {
    const unicornSlideIn = Math.min(1, elapsed / 500)

    // Unicorn position — slides in from the left
    const unicornX = -60 + easeOutBack(unicornSlideIn) * (cx - 120)
    const unicornY = cy - 20

    // Spawn rainbow particles from the unicorn's mouth
    if (unicornSlideIn > 0.3 && elapsed < 3000) {
      for (let i = 0; i < 3; i++) {
        const angle = -0.4 + Math.random() * 0.8
        const speed = 4 + Math.random() * 6
        particles.push({
          x: unicornX + 55,
          y: unicornY + 8 + (Math.random() - 0.5) * 6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          color: RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)],
          opacity: 0.9,
          size: 4 + Math.random() * 6,
          gravity: 0.12 + Math.random() * 0.08,
        })
      }
    }

    // Update & draw rainbow particles
    ctx.save()
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.opacity -= 0.008
      p.size *= 0.997

      if (p.opacity <= 0 || p.x > canvasWidth + 50 || p.y > canvasHeight + 50) {
        particles.splice(i, 1)
        continue
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0')
      ctx.fill()
    }
    ctx.restore()

    // Draw the unicorn
    ctx.save()
    ctx.translate(unicornX, unicornY)

    // Body
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.ellipse(0, 0, 40, 28, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#E0D8F0'
    ctx.lineWidth = 2
    ctx.stroke()

    // Head
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.ellipse(38, -18, 18, 15, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#E0D8F0'
    ctx.stroke()

    // Horn — rainbow gradient
    ctx.save()
    ctx.translate(48, -34)
    ctx.rotate(-0.2)
    const hornGrad = ctx.createLinearGradient(0, 0, 0, -22)
    hornGrad.addColorStop(0, '#FFD700')
    hornGrad.addColorStop(0.5, '#FF69B4')
    hornGrad.addColorStop(1, '#DA70D6')
    ctx.fillStyle = hornGrad
    ctx.beginPath()
    ctx.moveTo(-5, 0)
    ctx.lineTo(0, -22)
    ctx.lineTo(5, 0)
    ctx.closePath()
    ctx.fill()
    // Spiral lines on horn
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-3, -4)
    ctx.lineTo(3, -7)
    ctx.moveTo(-2, -10)
    ctx.lineTo(2, -13)
    ctx.moveTo(-1, -16)
    ctx.lineTo(1, -19)
    ctx.stroke()
    ctx.restore()

    // Eye
    ctx.fillStyle = '#2a1a4a'
    ctx.beginPath()
    ctx.arc(44, -20, 3, 0, Math.PI * 2)
    ctx.fill()
    // Eye sparkle
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(45, -21, 1.2, 0, Math.PI * 2)
    ctx.fill()

    // Blush
    ctx.fillStyle = 'rgba(255, 150, 180, 0.35)'
    ctx.beginPath()
    ctx.ellipse(48, -12, 6, 4, 0, 0, Math.PI * 2)
    ctx.fill()

    // Mouth — open wide, vomiting rainbows!
    ctx.fillStyle = '#FF69B4'
    ctx.beginPath()
    ctx.ellipse(55, -8, 7, 9, 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#CC3366'
    ctx.beginPath()
    ctx.ellipse(55, -8, 5, 6, 0.2, 0, Math.PI * 2)
    ctx.fill()

    // Mane — colorful flowing hair
    const maneColors = ['#FF69B4', '#DA70D6', '#9370DB', '#7B68EE', '#6495ED']
    for (let i = 0; i < maneColors.length; i++) {
      ctx.strokeStyle = maneColors[i]
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.beginPath()
      const waveOffset = Math.sin(performance.now() / 200 + i * 0.8) * 5
      ctx.moveTo(28 - i * 6, -28)
      ctx.quadraticCurveTo(22 - i * 8, -36 + waveOffset, 16 - i * 6, -24 + waveOffset)
      ctx.stroke()
    }

    // Legs
    ctx.strokeStyle = '#E0D8F0'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    const legWobble = Math.sin(performance.now() / 150) * 2
    ctx.beginPath()
    ctx.moveTo(-20, 22)
    ctx.lineTo(-22, 38 + legWobble)
    ctx.moveTo(-6, 24)
    ctx.lineTo(-5, 40 - legWobble)
    ctx.moveTo(10, 24)
    ctx.lineTo(11, 40 + legWobble)
    ctx.moveTo(24, 22)
    ctx.lineTo(26, 38 - legWobble)
    ctx.stroke()
    // Hooves
    ctx.fillStyle = '#FFD700'
    for (const hx of [-22, -5, 11, 26]) {
      ctx.beginPath()
      ctx.arc(hx, 40, 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Tail — rainbow flowing
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    const tailColors = ['#FF0000', '#FF8C00', '#FFFF00', '#00FF00', '#1E90FF', '#8B00FF']
    for (let i = 0; i < tailColors.length; i++) {
      ctx.strokeStyle = tailColors[i]
      const wave = Math.sin(performance.now() / 180 + i * 0.6) * 8
      ctx.beginPath()
      ctx.moveTo(-38, -4 + i * 3)
      ctx.quadraticCurveTo(-55, -10 + i * 3 + wave, -62, -2 + i * 4 + wave)
      ctx.stroke()
    }

    ctx.restore()
  },
}

// ─── Registry ────────────────────────────────────────────────────────────────
// Add new Easter eggs here — order doesn't matter, first match wins.

export const EASTER_EGGS: EasterEggDef[] = [
  joUnicorn,
]
