import { useRef, useEffect, useCallback, useState } from 'react'
import Matter from 'matter-js'

const { Engine, World, Bodies, Body, Runner } = Matter

interface LotteryMachineProps {
  members: string[]
  onDrawComplete: (winner: string) => void
  drawRequested: boolean
  onDrawStart: () => void
}

const CANVAS_WIDTH = 500
const CANVAS_HEIGHT = 450
const BALL_RADIUS = 32
const WALL_THICKNESS = 20

const BALL_COLORS = [
  '#1a2d5a', '#2a4fa0', '#3a6bc7', '#1e3a6e', '#264d8e',
  '#1b3f7a', '#2b5aaa', '#345fa5', '#1c3468', '#2e5590',
]

function createWalls() {
  const opts = { isStatic: true, render: { visible: false }, friction: 0.3, restitution: 0.4 }

  // Floor
  const floor = Bodies.rectangle(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT + WALL_THICKNESS / 2,
    CANVAS_WIDTH + WALL_THICKNESS * 2, WALL_THICKNESS, opts
  )

  // Left wall — angled inward slightly for a bowl shape
  const leftWall = Bodies.rectangle(
    -WALL_THICKNESS / 2 + 10, CANVAS_HEIGHT / 2,
    WALL_THICKNESS, CANVAS_HEIGHT + WALL_THICKNESS, { ...opts, angle: 0.06 }
  )

  // Right wall — angled inward
  const rightWall = Bodies.rectangle(
    CANVAS_WIDTH + WALL_THICKNESS / 2 - 10, CANVAS_HEIGHT / 2,
    WALL_THICKNESS, CANVAS_HEIGHT + WALL_THICKNESS, { ...opts, angle: -0.06 }
  )

  // Angled bottom-left
  const bottomLeft = Bodies.rectangle(
    60, CANVAS_HEIGHT - 15,
    140, WALL_THICKNESS, { ...opts, angle: 0.35 }
  )

  // Angled bottom-right
  const bottomRight = Bodies.rectangle(
    CANVAS_WIDTH - 60, CANVAS_HEIGHT - 15,
    140, WALL_THICKNESS, { ...opts, angle: -0.35 }
  )

  return [floor, leftWall, rightWall, bottomLeft, bottomRight]
}

function createBall(name: string, index: number, total: number): Matter.Body {
  const cols = Math.min(total, 6)
  const col = index % cols
  const row = Math.floor(index / cols)
  const spacingX = (CANVAS_WIDTH - 100) / (cols + 1)
  const x = 50 + spacingX * (col + 1) + (Math.random() - 0.5) * 20
  const y = 30 + row * (BALL_RADIUS * 2 + 10) + (Math.random() - 0.5) * 10

  const ball = Bodies.circle(x, y, BALL_RADIUS, {
    restitution: 0.6,
    friction: 0.05,
    frictionAir: 0.01,
    density: 0.002,
    label: name,
  })

  return ball
}

function drawBallOnCanvas(
  ctx: CanvasRenderingContext2D,
  body: Matter.Body,
  winnerName: string | null,
  isSelected: boolean,
  selectionPhase: boolean,
) {
  const { x, y } = body.position
  const radius = BALL_RADIUS
  const name = body.label

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(body.angle)

  // Ball shadow
  ctx.beginPath()
  ctx.arc(2, 3, radius, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.fill()

  // Ball body — gradient
  const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius)
  if (isSelected) {
    grad.addColorStop(0, '#f5c842')
    grad.addColorStop(0.7, '#e6a817')
    grad.addColorStop(1, '#c48a00')
  } else if (selectionPhase && winnerName && !isSelected) {
    // Fade non-winners
    const colorIndex = Math.abs(name.charCodeAt(0)) % BALL_COLORS.length
    const color = BALL_COLORS[colorIndex]
    grad.addColorStop(0, lightenColor(color, 40))
    grad.addColorStop(1, color)
    ctx.globalAlpha = 0.4
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

  // Shine highlight
  ctx.beginPath()
  ctx.arc(-radius * 0.25, -radius * 0.25, radius * 0.4, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  ctx.fill()

  // Glow for winner
  if (isSelected) {
    ctx.shadowColor = '#f5c842'
    ctx.shadowBlur = 25
    ctx.beginPath()
    ctx.arc(0, 0, radius + 3, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(245, 200, 66, 0.7)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  // Name text
  ctx.globalAlpha = selectionPhase && winnerName && !isSelected ? 0.4 : 1
  const fontSize = Math.min(14, (radius * 1.4) / Math.max(name.length * 0.55, 1))
  ctx.font = `bold ${fontSize}px 'Segoe UI', Tahoma, sans-serif`
  ctx.fillStyle = isSelected ? '#1a2d5a' : '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(name, 0, 1)

  ctx.restore()
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, (num >> 16) + amount)
  const g = Math.min(255, ((num >> 8) & 0x00ff) + amount)
  const b = Math.min(255, (num & 0x0000ff) + amount)
  return `rgb(${r},${g},${b})`
}

function drawContainer(ctx: CanvasRenderingContext2D) {
  ctx.save()

  // Bowl shape
  ctx.beginPath()
  ctx.moveTo(5, 40)
  ctx.lineTo(25, CANVAS_HEIGHT - 5)
  ctx.lineTo(CANVAS_WIDTH - 25, CANVAS_HEIGHT - 5)
  ctx.lineTo(CANVAS_WIDTH - 5, 40)
  ctx.strokeStyle = 'rgba(26, 45, 90, 0.25)'
  ctx.lineWidth = 3
  ctx.stroke()

  // Subtle fill
  ctx.fillStyle = 'rgba(26, 45, 90, 0.03)'
  ctx.fill()

  ctx.restore()
}

function LotteryMachine({ members, onDrawComplete, drawRequested, onDrawStart }: LotteryMachineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const runnerRef = useRef<Matter.Runner | null>(null)
  const ballsRef = useRef<Matter.Body[]>([])
  const animFrameRef = useRef<number>(0)
  const winnerRef = useRef<string | null>(null)
  const selectionPhaseRef = useRef(false)
  const [, forceRender] = useState(0)

  // Scale for high-DPI displays
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1

  // Initialize engine
  useEffect(() => {
    const engine = Engine.create({
      gravity: { x: 0, y: 1.2, scale: 0.001 },
    })
    engineRef.current = engine

    const runner = Runner.create()
    runnerRef.current = runner
    Runner.run(runner, engine)

    // Add walls
    const walls = createWalls()
    World.add(engine.world, walls)

    return () => {
      Runner.stop(runner)
      World.clear(engine.world, false)
      Engine.clear(engine)
    }
  }, [])

  // Sync balls with members
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    // Remove old balls
    const oldBalls = ballsRef.current
    if (oldBalls.length > 0) {
      World.remove(engine.world, oldBalls)
    }

    // Create new balls
    const newBalls = members.map((name, i) => createBall(name, i, members.length))
    World.add(engine.world, newBalls)
    ballsRef.current = newBalls
    winnerRef.current = null
    selectionPhaseRef.current = false
  }, [members])

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = CANVAS_WIDTH * dpr
    canvas.height = CANVAS_HEIGHT * dpr
    canvas.style.width = `${CANVAS_WIDTH}px`
    canvas.style.height = `${CANVAS_HEIGHT}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function render() {
      if (!ctx) return
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      drawContainer(ctx)

      const balls = ballsRef.current
      const winner = winnerRef.current
      const selPhase = selectionPhaseRef.current

      for (const ball of balls) {
        drawBallOnCanvas(ctx, ball, winner, ball.label === winner && selPhase, selPhase)
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
    const balls = ballsRef.current
    if (balls.length === 0) return

    onDrawStart()
    winnerRef.current = null
    selectionPhaseRef.current = false

    // Phase 1: Tumble — apply chaotic forces
    const tumbleDuration = 3000
    const forceInterval = 150
    let elapsed = 0

    const tumbleTimer = setInterval(() => {
      elapsed += forceInterval
      if (elapsed >= tumbleDuration) {
        clearInterval(tumbleTimer)

        // Phase 2: Let balls settle, then pick winner
        setTimeout(() => {
          const winnerIndex = Math.floor(Math.random() * balls.length)
          const winnerBall = balls[winnerIndex]
          winnerRef.current = winnerBall.label
          selectionPhaseRef.current = true
          forceRender((n) => n + 1)

          // Lift the winner ball up gently
          Body.setVelocity(winnerBall, { x: 0, y: -6 })

          setTimeout(() => {
            onDrawComplete(winnerBall.label)
          }, 800)
        }, 1200)

        return
      }

      // Apply random impulses to all balls
      const intensity = 0.008 + Math.random() * 0.012
      for (const ball of balls) {
        Body.applyForce(ball, ball.position, {
          x: (Math.random() - 0.5) * intensity,
          y: -(Math.random() * intensity * 0.8),
        })
        // Add random spin
        Body.setAngularVelocity(ball, (Math.random() - 0.5) * 0.3)
      }
    }, forceInterval)
  }, [onDrawComplete, onDrawStart])

  // Respond to drawRequested
  useEffect(() => {
    if (drawRequested) {
      performDraw()
    }
  }, [drawRequested, performDraw])

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
