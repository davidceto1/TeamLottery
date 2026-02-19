import { useRef, useEffect, useCallback, useState } from 'react'
import Matter from 'matter-js'

const { Engine, World, Bodies, Body, Events, Runner } = Matter

interface LotteryMachineProps {
  members: string[]
  onDrawComplete: (winner: string) => void
  drawRequested: boolean
  onDrawStart: () => void
}

// Layout constants
const CANVAS_WIDTH = 520
const CANVAS_HEIGHT = 500
const BALL_RADIUS = 32
const WALL = 12

// Capsule interior bounds
const LEFT = WALL
const RIGHT = CANVAS_WIDTH - WALL
const TOP = WALL
const BOTTOM = CANVAS_HEIGHT - WALL

// Chute dimensions — exit channel at the top center
const CHUTE_WIDTH = BALL_RADIUS * 2 + 14
const CHUTE_HEIGHT = 60
const CHUTE_LEFT = CANVAS_WIDTH / 2 - CHUTE_WIDTH / 2
const CHUTE_RIGHT = CANVAS_WIDTH / 2 + CHUTE_WIDTH / 2
const CHUTE_TOP = -CHUTE_HEIGHT

// Sensor position — just above the chute exit
const SENSOR_Y = CHUTE_TOP + 5

// Oval container dimensions
const CX = CANVAS_WIDTH / 2
const CY = CANVAS_HEIGHT / 2
const RX = (CANVAS_WIDTH - WALL * 2) / 2
const RY = (CANVAS_HEIGHT - WALL * 2) / 2
const OVAL_SEGMENTS = 48

// Precompute gap angles for the chute opening at the top of the oval
const GAP_ANGLE_RIGHT = 2 * Math.PI - Math.acos((CHUTE_RIGHT - CX) / RX)
const GAP_ANGLE_LEFT = 2 * Math.PI - Math.acos((CHUTE_LEFT - CX) / RX)

const BALL_COLORS = [
  '#1a2d5a', '#2a4fa0', '#3a6bc7', '#1e3a6e', '#264d8e',
  '#1b3f7a', '#2b5aaa', '#345fa5', '#1c3468', '#2e5590',
]

// Winner animation state
interface WinnerAnim {
  ballBody: Matter.Body
  startX: number
  startY: number
  startTime: number
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

// Overshoot then settle — gives the Keno "zoom out" feel
function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

// Air particle type for visual effect
interface AirParticle {
  x: number
  y: number
  vx: number
  vy: number
  opacity: number
  size: number
}

const wallOpts: Matter.IChamferableBodyDefinition = {
  isStatic: true,
  friction: 0.164,
  restitution: 0.594,
}

function createOvalWalls() {
  const walls: Matter.Body[] = []
  const angleStep = (Math.PI * 2) / OVAL_SEGMENTS

  for (let i = 0; i < OVAL_SEGMENTS; i++) {
    const a1 = i * angleStep
    const a2 = (i + 1) * angleStep

    const x1 = CX + RX * Math.cos(a1)
    const y1 = CY + RY * Math.sin(a1)
    const x2 = CX + RX * Math.cos(a2)
    const y2 = CY + RY * Math.sin(a2)

    const mx = (x1 + x2) / 2
    const my = (y1 + y2) / 2

    // Skip segments at the top where the chute opening is
    if (my < CY - RY + 30 && mx > CHUTE_LEFT - 10 && mx < CHUTE_RIGHT + 10) {
      continue
    }

    const dx = x2 - x1
    const dy = y2 - y1
    const length = Math.sqrt(dx * dx + dy * dy) + 4
    const angle = Math.atan2(dy, dx)

    walls.push(Bodies.rectangle(mx, my, length, WALL, { ...wallOpts, angle }))
  }

  // Funnel slopes guiding balls toward the chute opening
  const funnelLen = 80
  const funnelLeft = Bodies.rectangle(
    CHUTE_LEFT - funnelLen / 2 + 8, TOP + 20,
    funnelLen, WALL, { ...wallOpts, angle: -0.45 }
  )
  const funnelRight = Bodies.rectangle(
    CHUTE_RIGHT + funnelLen / 2 - 8, TOP + 20,
    funnelLen, WALL, { ...wallOpts, angle: 0.45 }
  )

  // Chute side walls
  const chuteLeftWall = Bodies.rectangle(
    CHUTE_LEFT - WALL / 2, TOP - CHUTE_HEIGHT / 2,
    WALL, CHUTE_HEIGHT, wallOpts
  )
  const chuteRightWall = Bodies.rectangle(
    CHUTE_RIGHT + WALL / 2, TOP - CHUTE_HEIGHT / 2,
    WALL, CHUTE_HEIGHT, wallOpts
  )

  walls.push(funnelLeft, funnelRight, chuteLeftWall, chuteRightWall)

  return { walls }
}

function createGate(): Matter.Body {
  return Bodies.rectangle(
    CANVAS_WIDTH / 2, TOP,
    CHUTE_WIDTH + WALL, WALL,
    { ...wallOpts, label: 'gate' }
  )
}

function createSensor(): Matter.Body {
  return Bodies.rectangle(
    CANVAS_WIDTH / 2, SENSOR_Y,
    CHUTE_WIDTH - 4, 8,
    { isStatic: true, isSensor: true, label: 'exit-sensor' }
  )
}

function createBall(name: string, index: number, total: number): Matter.Body {
  const cols = Math.min(total, 7)
  const col = index % cols
  const row = Math.floor(index / cols)

  // Place balls in the lower portion of the oval
  const y = CY + RY * 0.4 - row * (BALL_RADIUS * 2 + 6) + (Math.random() - 0.5) * 8

  // Compute available width at this y-coordinate within the oval
  const normY = (y - CY) / RY
  const halfW = RX * Math.sqrt(Math.max(0, 1 - normY * normY)) - BALL_RADIUS - WALL
  const spacingX = (halfW * 2) / (cols + 1)
  const x = CX - halfW + spacingX * (col + 1) + (Math.random() - 0.5) * 10

  return Bodies.circle(x, y, BALL_RADIUS, {
    restitution: 0.782,
    friction: 0.092,
    frictionAir: 0.007,
    density: 0.003,
    label: name,
  })
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `rgb(${r},${g},${b})`
}

function drawBallOnCanvas(
  ctx: CanvasRenderingContext2D,
  body: Matter.Body,
  winnerName: string | null,
  opts?: { overrideX?: number; overrideY?: number; scale?: number; lockAngle?: boolean },
) {
  const drawX = opts?.overrideX ?? body.position.x
  const drawY = opts?.overrideY ?? body.position.y
  const scale = opts?.scale ?? 1
  const radius = BALL_RADIUS
  const name = body.label
  const isWinner = name === winnerName

  ctx.save()
  ctx.translate(drawX, drawY)
  if (!opts?.lockAngle) ctx.rotate(body.angle)
  if (scale !== 1) ctx.scale(scale, scale)

  // Shadow
  ctx.beginPath()
  ctx.arc(2, 3, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fill()

  // Ball gradient
  const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius)
  if (isWinner) {
    grad.addColorStop(0, '#f5c842')
    grad.addColorStop(0.7, '#e6a817')
    grad.addColorStop(1, '#c48a00')
  } else {
    const colorIndex = Math.abs(name.charCodeAt(0)) % BALL_COLORS.length
    const color = BALL_COLORS[colorIndex]
    grad.addColorStop(0, lightenColor(color, 40))
    grad.addColorStop(1, color)
  }

  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()

  // Shine
  ctx.beginPath()
  ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()

  // Winner glow (shadow is in untransformed space so compensate for ctx.scale)
  if (isWinner) {
    ctx.shadowColor = '#f5c842'
    ctx.shadowBlur = 25 / scale
    ctx.beginPath()
    ctx.arc(0, 0, radius + 3, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(245, 200, 66, 0.7)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Name
  const fontSize = Math.min(13, (radius * 1.3) / Math.max(name.length * 0.55, 1))
  ctx.font = `bold ${fontSize}px 'Segoe UI', Tahoma, sans-serif`
  ctx.fillStyle = isWinner ? '#1a2d5a' : '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, 0, 1)

  ctx.restore()
}

function drawOval(ctx: CanvasRenderingContext2D, gateOpen: boolean) {
  ctx.save()

  // Draw the oval body arc (excluding the chute gap at the top)
  ctx.beginPath()
  ctx.ellipse(CX, CY, RX, RY, 0, GAP_ANGLE_RIGHT, GAP_ANGLE_LEFT, false)
  // Connect to chute
  ctx.lineTo(CHUTE_LEFT, TOP)
  ctx.lineTo(CHUTE_LEFT, CHUTE_TOP)
  ctx.lineTo(CHUTE_RIGHT, CHUTE_TOP)
  ctx.lineTo(CHUTE_RIGHT, TOP)
  ctx.closePath()

  // Fill
  ctx.fillStyle = 'rgba(26, 45, 90, 0.04)'
  ctx.fill()

  // Stroke
  ctx.strokeStyle = 'rgba(26, 45, 90, 0.3)'
  ctx.lineWidth = 3
  ctx.stroke()

  // Draw funnel lines inside
  ctx.beginPath()
  ctx.moveTo(CHUTE_LEFT - 55, TOP + 4)
  ctx.lineTo(CHUTE_LEFT + 2, TOP + 28)
  ctx.moveTo(CHUTE_RIGHT + 55, TOP + 4)
  ctx.lineTo(CHUTE_RIGHT - 2, TOP + 28)
  ctx.strokeStyle = 'rgba(26, 45, 90, 0.15)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Gate
  if (!gateOpen) {
    ctx.fillStyle = 'rgba(26, 45, 90, 0.6)'
    ctx.fillRect(CHUTE_LEFT - 2, TOP - 4, CHUTE_WIDTH + 4, 8)

    // Gate knobs
    ctx.fillStyle = 'rgba(26, 45, 90, 0.8)'
    ctx.beginPath()
    ctx.arc(CHUTE_LEFT + 2, TOP, 4, 0, Math.PI * 2)
    ctx.arc(CHUTE_RIGHT - 2, TOP, 4, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Open gate — draw small open flaps
    ctx.strokeStyle = 'rgba(26, 45, 90, 0.3)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(CHUTE_LEFT, TOP)
    ctx.lineTo(CHUTE_LEFT - 12, TOP + 14)
    ctx.moveTo(CHUTE_RIGHT, TOP)
    ctx.lineTo(CHUTE_RIGHT + 12, TOP + 14)
    ctx.stroke()
  }

  // Air vent indicators at the bottom of the oval
  const slitCount = 4
  ctx.strokeStyle = 'rgba(26, 45, 90, 0.25)'
  ctx.lineWidth = 2
  for (let i = 0; i < slitCount; i++) {
    const angle = Math.PI / 2 + (i - (slitCount - 1) / 2) * 0.12
    const sx = CX + RX * Math.cos(angle) * 0.92
    const sy = CY + RY * Math.sin(angle) * 0.92
    ctx.beginPath()
    ctx.moveTo(sx - 6, sy)
    ctx.lineTo(sx + 6, sy)
    ctx.stroke()
  }
  // Vent arrow indicators
  ctx.fillStyle = 'rgba(26, 45, 90, 0.15)'
  ctx.beginPath()
  ctx.moveTo(CX - 30, CY + RY * 0.88)
  ctx.lineTo(CX - 35, CY + RY * 0.88 - 8)
  ctx.lineTo(CX - 25, CY + RY * 0.88 - 8)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(CX + 30, CY + RY * 0.88)
  ctx.lineTo(CX + 25, CY + RY * 0.88 - 8)
  ctx.lineTo(CX + 35, CY + RY * 0.88 - 8)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function drawAirParticles(ctx: CanvasRenderingContext2D, particles: AirParticle[]) {
  ctx.save()
  for (const p of particles) {
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(120, 180, 255, ${p.opacity})`
    ctx.fill()
  }
  ctx.restore()
}

function LotteryMachine({ members, onDrawComplete, drawRequested, onDrawStart }: LotteryMachineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const ballsRef = useRef<Matter.Body[]>([])
  const gateRef = useRef<Matter.Body | null>(null)
  const sensorRef = useRef<Matter.Body | null>(null)
  const animFrameRef = useRef<number>(0)
  const airBlowingRef = useRef(false)
  const gateOpenRef = useRef(false)
  const winnerRef = useRef<string | null>(null)
  const winnerFoundRef = useRef(false)
  const airParticlesRef = useRef<AirParticle[]>([])
  const drawTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const winnerAnimRef = useRef<WinnerAnim | null>(null)
  const [, forceRender] = useState(0)

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1

  // Initialize engine
  useEffect(() => {
    const engine = Engine.create({
      gravity: { x: 0, y: 2.97, scale: 0.00147 },
    })
    engineRef.current = engine

    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)

    // Build oval walls
    const { walls } = createOvalWalls()
    World.add(engine.world, walls)

    // Create gate (closed by default)
    const gate = createGate()
    World.add(engine.world, [gate])
    gateRef.current = gate

    // Create sensor above chute
    const sensor = createSensor()
    World.add(engine.world, [sensor])
    sensorRef.current = sensor

    // Wind sources positioned on the oval perimeter
    const windAngleL = Math.PI / 2 + 0.443 // bottom-left of oval
    const windAngleR = Math.PI / 2 - 0.443 // bottom-right of oval
    const srcLx = CX + RX * Math.cos(windAngleL)
    const srcLy = CY + RY * Math.sin(windAngleL)
    const srcRx = CX + RX * Math.cos(windAngleR)
    const srcRy = CY + RY * Math.sin(windAngleR)
    const maxDist = Math.sqrt((RIGHT - LEFT) ** 2 + (BOTTOM - TOP) ** 2)
    let simTick = 0

    // Air force — oval wind jets with oscillation for uniform mixing
    Events.on(engine, 'beforeUpdate', () => {
      if (!airBlowingRef.current) return
      simTick++
      const balls = ballsRef.current
      const timeSec = simTick / 60

      // Wind oscillation: alternates jet dominance → creates swirling flow
      const oscPhase = Math.sin(2 * Math.PI * 1.026 * timeSec)
      const leftMult = 1 + oscPhase * 0.785
      const rightMult = 1 - oscPhase * 0.785

      for (const ball of balls) {
        const { x, y } = ball.position

        // Distance-based strength from each wind source on the oval
        const distL = Math.sqrt((x - srcLx) ** 2 + (y - srcLy) ** 2)
        const strengthL = Math.max(0, 1 - distL / (maxDist * 1.29))

        const distR = Math.sqrt((x - srcRx) ** 2 + (y - srcRy) ** 2)
        const strengthR = Math.max(0, 1 - distR / (maxDist * 1.29))

        // Left source pushes right+up, right source pushes left+up
        // Oscillation modulates each jet's strength over time
        const forceX = 0.026 * strengthL * leftMult - 0.026 * strengthR * rightMult
        const forceY = -0.038 * strengthL * leftMult + -0.038 * strengthR * rightMult

        // High chaos for turbulent mixing
        const chaosX = (Math.random() - 0.5) * 0.028
        const chaosY = (Math.random() - 0.5) * 0.024

        Body.applyForce(ball, ball.position, {
          x: forceX + chaosX,
          y: forceY + chaosY,
        })

        // Random spin for visual turbulence
        if (Math.random() < 0.313) {
          Body.setAngularVelocity(ball, ball.angularVelocity + (Math.random() - 0.5) * 0.394)
        }
      }
    })

    // Collision detection — winner is first ball to hit exit sensor
    Events.on(engine, 'collisionStart', (event) => {
      if (winnerFoundRef.current) return

      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair
        const sensorBody = bodyA.label === 'exit-sensor' ? bodyA : bodyB.label === 'exit-sensor' ? bodyB : null
        if (!sensorBody) continue

        const ballBody = sensorBody === bodyA ? bodyB : bodyA
        if (!ballBody.label || ballBody.label === 'gate' || ballBody.label === 'exit-sensor') continue

        // This ball escaped — it's the winner!
        winnerFoundRef.current = true
        winnerRef.current = ballBody.label
        airBlowingRef.current = false

        // Freeze the ball in place and animate it to the centre
        Body.setStatic(ballBody, true)
        Body.setVelocity(ballBody, { x: 0, y: 0 })
        Body.setAngularVelocity(ballBody, 0)

        winnerAnimRef.current = {
          ballBody,
          startX: ballBody.position.x,
          startY: ballBody.position.y,
          startTime: performance.now(),
        }

        forceRender((n) => n + 1)

        // Delay until after the full animation (350 move + 800 zoom + 450 hold)
        setTimeout(() => {
          onDrawComplete(ballBody.label)
        }, 1600)

        break
      }
    })

    return () => {
      Runner.stop(runner)
      Events.off(engine, 'beforeUpdate')
      Events.off(engine, 'collisionStart')
      World.clear(engine.world, false)
      Engine.clear(engine)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync balls with members
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const oldBalls = ballsRef.current
    if (oldBalls.length > 0) {
      World.remove(engine.world, oldBalls)
    }

    const newBalls = members.map((name, i) => createBall(name, i, members.length))
    World.add(engine.world, newBalls)
    ballsRef.current = newBalls
    winnerRef.current = null
    winnerFoundRef.current = false
    airBlowingRef.current = false
    gateOpenRef.current = false
    winnerAnimRef.current = null

    // Re-add gate if it was removed
    const engine2 = engineRef.current
    if (engine2 && gateRef.current) {
      // Remove and re-add to ensure it's present
      World.remove(engine2.world, [gateRef.current])
      const newGate = createGate()
      World.add(engine2.world, [newGate])
      gateRef.current = newGate
    }
  }, [members])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = (CANVAS_HEIGHT + Math.abs(CHUTE_TOP) + 20) * dpr
    const totalHeight = CANVAS_HEIGHT + Math.abs(CHUTE_TOP) + 20
    canvas.style.width = `${CANVAS_WIDTH}px`
    canvas.style.height = `${totalHeight}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Offset so that negative Y (chute area) is visible
    const yOffset = Math.abs(CHUTE_TOP) + 10

    function render() {
      if (!ctx) return
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT + Math.abs(CHUTE_TOP) + 20)

      // Translate so chute top is visible
      ctx.translate(0, yOffset)

      // Update air particles — originate from bottom area of the oval
      if (airBlowingRef.current) {
        // Spawn from bottom-left of oval
        if (Math.random() < 0.4) {
          airParticlesRef.current.push({
            x: CX - 20 - Math.random() * 60,
            y: CY + RY * 0.85 - Math.random() * 40,
            vy: -(2 + Math.random() * 3),
            vx: 0.8 + Math.random() * 1.2,
            opacity: 0.2 + Math.random() * 0.25,
            size: 1.5 + Math.random() * 2.5,
          })
        }
        // Spawn from bottom-right of oval
        if (Math.random() < 0.4) {
          airParticlesRef.current.push({
            x: CX + 20 + Math.random() * 60,
            y: CY + RY * 0.85 - Math.random() * 40,
            vy: -(2 + Math.random() * 3),
            vx: -(0.8 + Math.random() * 1.2),
            opacity: 0.2 + Math.random() * 0.25,
            size: 1.5 + Math.random() * 2.5,
          })
        }
      }

      // Update existing particles — drift up and inward
      const particles = airParticlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.y += p.vy
        p.x += p.vx
        p.opacity -= 0.004
        if (p.opacity <= 0 || p.y < TOP - 20 || p.x > CX + RX + 20 || p.x < CX - RX - 20) {
          particles.splice(i, 1)
        }
      }

      drawAirParticles(ctx, particles)
      drawOval(ctx, gateOpenRef.current)

      // Draw balls
      const balls = ballsRef.current
      const winner = winnerRef.current
      const anim = winnerAnimRef.current
      for (const ball of balls) {
        if (anim && ball === anim.ballBody) continue // drawn separately below
        drawBallOnCanvas(ctx, ball, winner)
      }

      // Keno winner animation
      if (anim) {
        const MOVE_MS = 350
        const ZOOM_MS = 800
        const elapsed = performance.now() - anim.startTime

        // Dark overlay fades in during the move phase
        const overlayAlpha = Math.min(0.72, (elapsed / MOVE_MS) * 0.72)
        ctx.save()
        ctx.fillStyle = `rgba(5, 10, 30, ${overlayAlpha})`
        ctx.fillRect(-50, -yOffset - 50, CANVAS_WIDTH + 100, CANVAS_HEIGHT + yOffset + 100)
        ctx.restore()

        // Interpolate position & scale
        let px: number, py: number, sc: number
        if (elapsed < MOVE_MS) {
          const t = easeInOut(elapsed / MOVE_MS)
          px = anim.startX + (CX - anim.startX) * t
          py = anim.startY + (CY - anim.startY) * t
          sc = 1 + t * 0.15
        } else {
          px = CX
          py = CY
          const zt = Math.min(1, (elapsed - MOVE_MS) / ZOOM_MS)
          // easeOutBack: zooms to ~2.6× with a slight overshoot then settles ≈ 2.4×
          sc = 1.15 + easeOutBack(zt) * 1.25
        }

        // Radial glow halo behind the ball
        if (elapsed >= MOVE_MS) {
          const zt = Math.min(1, (elapsed - MOVE_MS) / ZOOM_MS)
          const glowR = BALL_RADIUS * sc * 2.2
          const grd = ctx.createRadialGradient(px, py, BALL_RADIUS * sc * 0.9, px, py, glowR)
          grd.addColorStop(0, `rgba(245, 200, 66, ${0.45 * Math.min(1, zt * 2.5)})`)
          grd.addColorStop(1, 'rgba(245, 200, 66, 0)')
          ctx.save()
          ctx.beginPath()
          ctx.arc(px, py, glowR, 0, Math.PI * 2)
          ctx.fillStyle = grd
          ctx.fill()
          ctx.restore()
        }

        drawBallOnCanvas(ctx, anim.ballBody, winner, {
          overrideX: px,
          overrideY: py,
          scale: sc,
          lockAngle: true,
        })
      }

      ctx.restore()
      animFrameRef.current = requestAnimationFrame(render)
    }

    animFrameRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [dpr])

  // Handle draw
  const performDraw = useCallback(() => {
    const engine = engineRef.current
    const balls = ballsRef.current
    if (!engine || balls.length === 0) return

    onDrawStart()
    winnerRef.current = null
    winnerFoundRef.current = false
    winnerAnimRef.current = null

    // Un-freeze any ball that was frozen as a previous winner and drop it
    // back into the centre of the oval so it rejoins the mix
    for (const ball of balls) {
      if (ball.isStatic) {
        Body.setPosition(ball, {
          x: CX + (Math.random() - 0.5) * 80,
          y: CY + (Math.random() - 0.5) * 80,
        })
        Body.setVelocity(ball, { x: 0, y: 0 })
        Body.setAngularVelocity(ball, 0)
        Body.setStatic(ball, false)
      }
    }

    // Ensure gate is closed at the start
    if (gateRef.current) {
      World.remove(engine.world, [gateRef.current])
    }
    const newGate = createGate()
    World.add(engine.world, [newGate])
    gateRef.current = newGate
    gateOpenRef.current = false

    // Start air blowing
    airBlowingRef.current = true
    forceRender((n) => n + 1)

    // After ~4.4 seconds of mixing, open the gate
    drawTimerRef.current = setTimeout(() => {
      if (!engineRef.current || winnerFoundRef.current) return

      // Remove the gate
      if (gateRef.current) {
        World.remove(engineRef.current.world, [gateRef.current])
        gateRef.current = null
      }
      gateOpenRef.current = true
      forceRender((n) => n + 1)
    }, 4400)
  }, [onDrawStart])

  // Respond to drawRequested
  useEffect(() => {
    if (drawRequested) {
      performDraw()
    }
  }, [drawRequested, performDraw])

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (drawTimerRef.current) clearTimeout(drawTimerRef.current)
    }
  }, [])

  return (
    <div className="lottery-machine">
      <canvas
        ref={canvasRef}
        className="lottery-canvas"
      />
    </div>
  )
}

export default LotteryMachine
