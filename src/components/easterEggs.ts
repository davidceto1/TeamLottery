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

// ─── Jhon — slim English gentleman having tea ────────────────────────────────

const jhonEnglishman: EasterEggDef = {
  matches: (name) => name.toLowerCase() === 'jhon',

  render({ ctx, elapsed, particles, canvasWidth, cx, cy }) {
    const slideIn = Math.min(1, elapsed / 600)
    // Slides in from the right
    const figX = canvasWidth + 100 - easeOutBack(slideIn) * (canvasWidth + 100 - (cx + 30))
    const figY = cy - 20
    const bob = Math.sin(performance.now() / 900) * 2

    // Teacup position in canvas coords (for steam source)
    const cupX = figX + 52
    const cupY = figY + bob - 14

    // Spawn steam particles rising from the tea
    if (slideIn > 0.5 && elapsed < 5000) {
      particles.push({
        x: cupX + (Math.random() - 0.5) * 10,
        y: cupY - 6,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.9 - Math.random() * 0.7,
        color: '#CCCCCC',
        opacity: 0.55,
        size: 3 + Math.random() * 2.5,
        gravity: 0.01,
      })
    }

    // Update & draw steam particles
    ctx.save()
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.opacity -= 0.005
      p.size += 0.06
      if (p.opacity <= 0 || p.y < -20) { particles.splice(i, 1); continue }
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0')
      ctx.fill()
    }
    ctx.restore()

    ctx.save()
    ctx.translate(figX, figY + bob)

    // ── Top hat ──
    ctx.fillStyle = '#111111'
    // Brim
    ctx.beginPath()
    ctx.ellipse(0, -108, 24, 6, 0, 0, Math.PI * 2)
    ctx.fill()
    // Cylinder
    ctx.fillRect(-14, -143, 28, 37)
    // Crown
    ctx.beginPath()
    ctx.ellipse(0, -143, 14, 4, 0, 0, Math.PI * 2)
    ctx.fill()
    // Hat band
    ctx.fillStyle = '#8B0000'
    ctx.fillRect(-14, -114, 28, 5)

    // ── Head ──
    ctx.fillStyle = '#FFDAB9'
    ctx.beginPath()
    ctx.ellipse(0, -87, 17, 20, 0, 0, Math.PI * 2)
    ctx.fill()
    // Ear
    ctx.fillStyle = '#F5C5A0'
    ctx.beginPath()
    ctx.ellipse(-17, -88, 5, 7, 0.2, 0, Math.PI * 2)
    ctx.fill()

    // ── Monocle ──
    ctx.strokeStyle = '#B8860B'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(7, -84, 7, 0, Math.PI * 2)
    ctx.stroke()
    // Monocle cord
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(13, -79)
    ctx.lineTo(16, -70)
    ctx.stroke()

    // ── Eyes ──
    ctx.fillStyle = '#2a1a0a'
    ctx.beginPath()
    ctx.arc(-5, -88, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(7, -84, 2.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.arc(-4, -89, 1, 0, Math.PI * 2)
    ctx.fill()

    // ── Mustache ──
    ctx.strokeStyle = '#6B3A2A'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-1, -73)
    ctx.quadraticCurveTo(-8, -71, -13, -76)
    ctx.moveTo(-1, -73)
    ctx.quadraticCurveTo(8, -71, 13, -76)
    ctx.stroke()

    // ── Neck ──
    ctx.fillStyle = '#FFDAB9'
    ctx.fillRect(-5, -67, 10, 12)

    // ── Suit jacket (slim, navy) ──
    ctx.fillStyle = '#1C3557'
    ctx.beginPath()
    ctx.moveTo(-13, -55)
    ctx.lineTo(-15, 32)
    ctx.lineTo(15, 32)
    ctx.lineTo(13, -55)
    ctx.closePath()
    ctx.fill()
    // White shirt strip
    ctx.fillStyle = '#F8F8F0'
    ctx.beginPath()
    ctx.moveTo(-5, -55)
    ctx.lineTo(-4, 15)
    ctx.lineTo(4, 15)
    ctx.lineTo(5, -55)
    ctx.closePath()
    ctx.fill()
    // Shirt buttons
    ctx.fillStyle = '#D0C8B0'
    for (let i = 0; i < 4; i++) {
      ctx.beginPath()
      ctx.arc(0, -45 + i * 14, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    // Lapels
    ctx.fillStyle = '#1C3557'
    ctx.beginPath()
    ctx.moveTo(-5, -55)
    ctx.lineTo(-13, -43)
    ctx.lineTo(-7, -28)
    ctx.lineTo(-4, -28)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(5, -55)
    ctx.lineTo(13, -43)
    ctx.lineTo(7, -28)
    ctx.lineTo(4, -28)
    ctx.closePath()
    ctx.fill()
    // Bow tie
    ctx.fillStyle = '#CC0000'
    ctx.beginPath()
    ctx.moveTo(-6, -58)
    ctx.lineTo(0, -53)
    ctx.lineTo(6, -58)
    ctx.lineTo(0, -63)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#AA0000'
    ctx.beginPath()
    ctx.arc(0, -58, 3, 0, Math.PI * 2)
    ctx.fill()
    // Pocket square
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.moveTo(-12, -40)
    ctx.lineTo(-8, -46)
    ctx.lineTo(-5, -40)
    ctx.closePath()
    ctx.fill()

    // ── Left arm (relaxed at side) ──
    ctx.strokeStyle = '#1C3557'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-12, -42)
    ctx.quadraticCurveTo(-24, -8, -20, 22)
    ctx.stroke()
    ctx.fillStyle = '#FFDAB9'
    ctx.beginPath()
    ctx.ellipse(-20, 24, 6, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    // ── Right arm (extended, holding tea) ──
    ctx.strokeStyle = '#1C3557'
    ctx.lineWidth = 9
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(12, -42)
    ctx.quadraticCurveTo(32, -28, 50, -15)
    ctx.stroke()
    ctx.fillStyle = '#FFDAB9'
    ctx.beginPath()
    ctx.ellipse(50, -13, 6, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    // ── Saucer ──
    ctx.fillStyle = '#F2EAD8'
    ctx.beginPath()
    ctx.ellipse(52, -5, 18, 5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#C4A882'
    ctx.lineWidth = 1
    ctx.stroke()

    // ── Teacup ──
    ctx.fillStyle = '#F2EAD8'
    ctx.beginPath()
    ctx.moveTo(39, -18)
    ctx.lineTo(41, -5)
    ctx.lineTo(63, -5)
    ctx.lineTo(64, -18)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#C4A882'
    ctx.lineWidth = 1
    ctx.stroke()
    // Union Jack-style stripes on cup
    ctx.strokeStyle = '#CC0000'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(42, -14)
    ctx.lineTo(62, -14)
    ctx.stroke()
    ctx.strokeStyle = '#000080'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(42, -10)
    ctx.lineTo(62, -10)
    ctx.stroke()
    // Cup handle
    ctx.strokeStyle = '#C4A882'
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.arc(63, -12, 7, -0.8, 0.8)
    ctx.stroke()
    // Tea liquid
    ctx.fillStyle = '#6B3A2A'
    ctx.beginPath()
    ctx.ellipse(52, -15, 10, 3, 0, 0, Math.PI * 2)
    ctx.fill()

    // ── Trousers ──
    ctx.fillStyle = '#1C3557'
    ctx.beginPath()
    ctx.moveTo(-13, 32)
    ctx.lineTo(-15, 78)
    ctx.lineTo(-5, 78)
    ctx.lineTo(0, 52)
    ctx.lineTo(5, 78)
    ctx.lineTo(15, 78)
    ctx.lineTo(13, 32)
    ctx.closePath()
    ctx.fill()
    // Trouser crease
    ctx.strokeStyle = '#162D47'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-3, 32)
    ctx.lineTo(-3, 78)
    ctx.moveTo(3, 32)
    ctx.lineTo(3, 78)
    ctx.stroke()

    // ── Shoes ──
    ctx.fillStyle = '#1a1a1a'
    ctx.beginPath()
    ctx.ellipse(-10, 81, 9, 4, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(10, 81, 9, 4, 0.1, 0, Math.PI * 2)
    ctx.fill()
    // Shoe shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath()
    ctx.ellipse(-8, 79, 4, 1.5, -0.1, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(12, 79, 4, 1.5, 0.1, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    // ── Speech bubble (fades in after 800ms, once fully slid in) ──
    if (elapsed > 800 && slideIn >= 1) {
      const bubbleAlpha = Math.min(1, (elapsed - 800) / 400)
      const bx = figX - 55
      const by = figY + bob - 148
      const bw = 130, bh = 42, br = 10

      ctx.save()
      ctx.globalAlpha = bubbleAlpha

      ctx.fillStyle = '#FFFFF8'
      ctx.strokeStyle = '#444444'
      ctx.lineWidth = 2
      // Rounded rect (manual for broad compatibility)
      ctx.beginPath()
      ctx.moveTo(bx - bw / 2 + br, by - bh / 2)
      ctx.lineTo(bx + bw / 2 - br, by - bh / 2)
      ctx.quadraticCurveTo(bx + bw / 2, by - bh / 2, bx + bw / 2, by - bh / 2 + br)
      ctx.lineTo(bx + bw / 2, by + bh / 2 - br)
      ctx.quadraticCurveTo(bx + bw / 2, by + bh / 2, bx + bw / 2 - br, by + bh / 2)
      ctx.lineTo(bx - bw / 2 + br, by + bh / 2)
      ctx.quadraticCurveTo(bx - bw / 2, by + bh / 2, bx - bw / 2, by + bh / 2 - br)
      ctx.lineTo(bx - bw / 2, by - bh / 2 + br)
      ctx.quadraticCurveTo(bx - bw / 2, by - bh / 2, bx - bw / 2 + br, by - bh / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      // Tail pointing down toward head
      ctx.fillStyle = '#FFFFF8'
      ctx.beginPath()
      ctx.moveTo(bx + 10, by + bh / 2)
      ctx.lineTo(bx + 30, by + bh / 2 + 20)
      ctx.lineTo(bx + 30, by + bh / 2)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(bx + 10, by + bh / 2)
      ctx.lineTo(bx + 30, by + bh / 2 + 20)
      ctx.stroke()

      ctx.fillStyle = '#1a1a1a'
      ctx.font = 'bold 13px Georgia, serif'
      ctx.textAlign = 'center'
      ctx.fillText('Splendid!', bx, by - 7)
      ctx.font = 'italic 11px Georgia, serif'
      ctx.fillText('*sips tea*', bx, by + 10)

      ctx.restore()
    }
  },
}

// ─── Registry ────────────────────────────────────────────────────────────────
// Add new Easter eggs here — order doesn't matter, first match wins.

export const EASTER_EGGS: EasterEggDef[] = [
  joUnicorn,
  jhonEnglishman,
]
