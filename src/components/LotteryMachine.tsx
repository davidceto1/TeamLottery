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
const BALL_RADIUS = 26
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

const BALL_COLORS = [
  '#1a2d5a', '#2a4fa0', '#3a6bc7', '#1e3a6e', '#264d8e',
  '#1b3f7a', '#2b5aaa', '#345fa5', '#1c3468', '#2e5590',
]

// Air particle type for visual effect
interface AirParticle {
  x: number
  y: number
  vy: number
  opacity: number
  size: number
}

const wallOpts: Matter.IChamferableBodyDefinition = {
  isStatic: true,
  friction: 0.1,
  restitution: 0.8,
}

function createCapsuleWalls() {
  // Floor
  const floor = Bodies.rectangle(
    CANVAS_WIDTH / 2, BOTTOM + WALL / 2,
    CANVAS_WIDTH, WALL, wallOpts
  )

  // Left wall
  const leftWall = Bodies.rectangle(
    LEFT - WALL / 2, CANVAS_HEIGHT / 2,
    WALL, CANVAS_HEIGHT, wallOpts
  )

  // Right wall
  const rightWall = Bodies.rectangle(
    RIGHT + WALL / 2, CANVAS_HEIGHT / 2,
    WALL, CANVAS_HEIGHT, wallOpts
  )

  // Ceiling — two halves with a gap for the chute
  const ceilLeftWidth = CHUTE_LEFT - LEFT
  const ceilLeft = Bodies.rectangle(
    LEFT + ceilLeftWidth / 2, TOP - WALL / 2,
    ceilLeftWidth, WALL, wallOpts
  )

  const ceilRightWidth = RIGHT - CHUTE_RIGHT
  const ceilRight = Bodies.rectangle(
    CHUTE_RIGHT + ceilRightWidth / 2, TOP - WALL / 2,
    ceilRightWidth, WALL, wallOpts
  )

  // Funnel slopes guiding balls toward the chute opening
  const funnelLen = 100
  const funnelLeft = Bodies.rectangle(
    CHUTE_LEFT - funnelLen / 2 + 10, TOP + 15,
    funnelLen, WALL, { ...wallOpts, angle: -0.4 }
  )

  const funnelRight = Bodies.rectangle(
    CHUTE_RIGHT + funnelLen / 2 - 10, TOP + 15,
    funnelLen, WALL, { ...wallOpts, angle: 0.4 }
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

  return {
    walls: [floor, leftWall, rightWall, ceilLeft, ceilRight, funnelLeft, funnelRight, chuteLeftWall, chuteRightWall],
  }
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
  const spacingX = (RIGHT - LEFT - 60) / (cols + 1)
  const x = LEFT + 30 + spacingX * (col + 1) + (Math.random() - 0.5) * 16
  const y = BOTTOM - 40 - row * (BALL_RADIUS * 2 + 6) + (Math.random() - 0.5) * 8

  return Bodies.circle(x, y, BALL_RADIUS, {
    restitution: 0.9,
    friction: 0.05,
    frictionAir: 0.015,
    density: 0.002,
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
) {
  const { x, y } = body.position
  const radius = BALL_RADIUS
  const name = body.label
  const isWinner = name === winnerName

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(body.angle)

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

  // Winner glow
  if (isWinner) {
    ctx.shadowColor = '#f5c842'
    ctx.shadowBlur = 25
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

function drawCapsule(ctx: CanvasRenderingContext2D, gateOpen: boolean) {
  ctx.save()

  const r = 18 // corner radius

  // Main capsule body
  ctx.beginPath()
  // Start from bottom-left, go clockwise
  ctx.moveTo(LEFT, BOTTOM + r)
  // Bottom
  ctx.lineTo(LEFT, BOTTOM)
  ctx.lineTo(RIGHT, BOTTOM)
  // Right wall up
  ctx.lineTo(RIGHT, TOP + r)
  ctx.arcTo(RIGHT, TOP, RIGHT - r, TOP, r)
  // Top — right half to chute
  ctx.lineTo(CHUTE_RIGHT, TOP)
  // Chute right wall going up
  ctx.lineTo(CHUTE_RIGHT, CHUTE_TOP)
  // Chute top
  ctx.lineTo(CHUTE_LEFT, CHUTE_TOP)
  // Chute left wall coming down
  ctx.lineTo(CHUTE_LEFT, TOP)
  // Top — left half
  ctx.lineTo(LEFT + r, TOP)
  ctx.arcTo(LEFT, TOP, LEFT, TOP + r, r)
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
  ctx.moveTo(CHUTE_LEFT - 70, TOP + 4)
  ctx.lineTo(CHUTE_LEFT + 2, TOP + 30)
  ctx.moveTo(CHUTE_RIGHT + 70, TOP + 4)
  ctx.lineTo(CHUTE_RIGHT - 2, TOP + 30)
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

  // Air vent slits on the bottom-left corner
  const slitCount = 4
  ctx.strokeStyle = 'rgba(26, 45, 90, 0.25)'
  ctx.lineWidth = 2
  for (let i = 0; i < slitCount; i++) {
    const sx = LEFT + 18 + i * 20
    ctx.beginPath()
    ctx.moveTo(sx - 6, BOTTOM)
    ctx.lineTo(sx + 6, BOTTOM)
    ctx.stroke()
  }
  // Small vent arrow indicator
  ctx.fillStyle = 'rgba(26, 45, 90, 0.15)'
  ctx.beginPath()
  ctx.moveTo(LEFT + 40, BOTTOM - 2)
  ctx.lineTo(LEFT + 35, BOTTOM - 10)
  ctx.lineTo(LEFT + 45, BOTTOM - 10)
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
  const [, forceRender] = useState(0)

  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1

  // Initialize engine
  useEffect(() => {
    const engine = Engine.create({
      gravity: { x: 0, y: 1.8, scale: 0.001 },
    })
    engineRef.current = engine

    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)

    // Build capsule walls
    const { walls } = createCapsuleWalls()
    World.add(engine.world, walls)

    // Create gate (closed by default)
    const gate = createGate()
    World.add(engine.world, [gate])
    gateRef.current = gate

    // Create sensor above chute
    const sensor = createSensor()
    World.add(engine.world, [sensor])
    sensorRef.current = sensor

    // Air force — jet from bottom-left corner pushing up and to the right
    // Creates a circular mixing pattern with chaotic variation
    Events.on(engine, 'beforeUpdate', () => {
      if (!airBlowingRef.current) return
      const balls = ballsRef.current
      for (const ball of balls) {
        const { x, y } = ball.position

        // Distance from bottom-left corner (air source)
        const dx = x - LEFT
        const dy = BOTTOM - y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const maxDist = Math.sqrt((RIGHT - LEFT) ** 2 + (BOTTOM - TOP) ** 2)

        // Air jet is strongest near the bottom-left, fades with distance
        const strength = Math.max(0, 1 - dist / (maxDist * 0.8))

        // Base force: up and to the right (from bottom-left corner)
        const baseForceX = 0.004 * strength
        const baseForceY = -0.007 * strength

        // Chaotic per-ball variation each tick
        const chaosX = (Math.random() - 0.45) * 0.003
        const chaosY = (Math.random() - 0.5) * 0.004

        Body.applyForce(ball, ball.position, {
          x: baseForceX + chaosX,
          y: baseForceY + chaosY,
        })

        // Random spin for visual turbulence
        if (Math.random() < 0.15) {
          Body.setAngularVelocity(ball, ball.angularVelocity + (Math.random() - 0.5) * 0.3)
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
        forceRender((n) => n + 1)

        // Let the ball fly up a bit out of the chute
        Body.setVelocity(ballBody, { x: 0, y: -4 })

        setTimeout(() => {
          onDrawComplete(ballBody.label)
        }, 600)

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

      // Update air particles — originate from bottom-left corner
      if (airBlowingRef.current) {
        // Spawn new particles from bottom-left area
        if (Math.random() < 0.5) {
          airParticlesRef.current.push({
            x: LEFT + 10 + Math.random() * 80,
            y: BOTTOM - 5 - Math.random() * 30,
            vy: -(2 + Math.random() * 3),
            opacity: 0.2 + Math.random() * 0.25,
            size: 1.5 + Math.random() * 2.5,
          })
        }
      }

      // Update existing particles — drift up and to the right
      const particles = airParticlesRef.current
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.y += p.vy
        p.x += 0.8 + Math.random() * 1.2
        p.opacity -= 0.004
        if (p.opacity <= 0 || p.y < TOP - 10 || p.x > RIGHT + 10) {
          particles.splice(i, 1)
        }
      }

      drawAirParticles(ctx, particles)
      drawCapsule(ctx, gateOpenRef.current)

      // Draw balls
      const balls = ballsRef.current
      const winner = winnerRef.current
      for (const ball of balls) {
        drawBallOnCanvas(ctx, ball, winner)
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

    // After 5 seconds, open the gate
    drawTimerRef.current = setTimeout(() => {
      if (!engineRef.current || winnerFoundRef.current) return

      // Remove the gate
      if (gateRef.current) {
        World.remove(engineRef.current.world, [gateRef.current])
        gateRef.current = null
      }
      gateOpenRef.current = true
      forceRender((n) => n + 1)
    }, 5000)
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
