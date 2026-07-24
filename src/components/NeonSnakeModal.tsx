import { useEffect, useRef, useState } from 'react'

interface NeonSnakeModalProps {
  onClose: () => void
}

const GRID = 20
const TICK_MS = 110
const HIGH_SCORE_KEY = 'taadaa.snake.highScore'

// Sized off the viewport so the board fills most of the docked panel's
// height rather than sitting at a fixed, easy-to-outgrow size.
function computeCell(): number {
  const availableH = window.innerHeight - 200
  return Math.max(16, Math.min(30, Math.floor(availableH / GRID)))
}

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

function randomCell(exclude: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
    if (!exclude.some((e) => e.x === p.x && e.y === p.y)) return p
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function NeonSnakeModal({ onClose }: NeonSnakeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0))
  const [gameOver, setGameOver] = useState(false)
  const [cell] = useState(computeCell)

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }])
  // The snake's segment positions from immediately before the most recent
  // tick — kept so the render loop can lerp each segment from its old spot
  // to its new one instead of the classic teleport-per-cell jump.
  const prevSnakeRef = useRef<Point[]>(snakeRef.current)
  const dirRef = useRef<Direction>('right')
  const nextDirRef = useRef<Direction>('right')
  const foodRef = useRef<Point>(randomCell(snakeRef.current))
  const scoreRef = useRef(0)
  const overRef = useRef(false)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const map: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }
      if (e.key === 'Escape') {
        onClose()
        return
      }
      const next = map[e.key]
      if (next && OPPOSITE[next] !== dirRef.current) {
        nextDirRef.current = next
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const CELL = cell

    function draw(fraction: number) {
      if (!ctx) return
      ctx.fillStyle = '#141416'
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)

      ctx.fillStyle = '#4FBDAE'
      ctx.shadowColor = '#4FBDAE'
      ctx.shadowBlur = 8
      ctx.fillRect(foodRef.current.x * CELL + 3, foodRef.current.y * CELL + 3, CELL - 6, CELL - 6)
      ctx.shadowBlur = 0

      const snake = snakeRef.current
      const prev = prevSnakeRef.current
      snake.forEach((seg, i) => {
        // Segment i follows where segment i-1 used to be (classic
        // follow-the-leader snake motion); the head (i=0) follows its own
        // previous position instead.
        const from = i === 0 ? (prev[0] ?? seg) : (prev[i - 1] ?? seg)
        const x = lerp(from.x, seg.x, fraction)
        const y = lerp(from.y, seg.y, fraction)
        ctx.fillStyle = i === 0 ? '#D63C7A' : '#E39BC4'
        if (i === 0) {
          ctx.shadowColor = '#D63C7A'
          ctx.shadowBlur = 6
        }
        ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2)
        ctx.shadowBlur = 0
      })
    }

    function tick() {
      if (overRef.current) return
      prevSnakeRef.current = snakeRef.current
      dirRef.current = nextDirRef.current
      const head = snakeRef.current[0]
      const delta: Record<Direction, Point> = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      }
      const d = delta[dirRef.current]
      const newHead = { x: head.x + d.x, y: head.y + d.y }

      const hitWall = newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID
      const hitSelf = snakeRef.current.some((s) => s.x === newHead.x && s.y === newHead.y)
      if (hitWall || hitSelf) {
        overRef.current = true
        setGameOver(true)
        if (scoreRef.current > highScore) {
          localStorage.setItem(HIGH_SCORE_KEY, String(scoreRef.current))
          setHighScore(scoreRef.current)
        }
        return
      }

      const ateFood = newHead.x === foodRef.current.x && newHead.y === foodRef.current.y
      const nextSnake = [newHead, ...snakeRef.current]
      if (!ateFood) nextSnake.pop()
      else {
        scoreRef.current += 10
        setScore(scoreRef.current)
        foodRef.current = randomCell(nextSnake)
      }
      snakeRef.current = nextSnake
    }

    // requestAnimationFrame drives continuous drawing at display refresh
    // rate; tick() still advances the game state on its own fixed cadence,
    // but draw() now runs every frame with a fraction (0..1 through the
    // current tick) so segments glide smoothly instead of jumping cell to
    // cell.
    let rafId: number
    let lastTick = performance.now()
    function frame(now: number) {
      if (!overRef.current) {
        const elapsed = now - lastTick
        if (elapsed >= TICK_MS) {
          tick()
          lastTick = now
        }
        const fraction = Math.min(1, (now - lastTick) / TICK_MS)
        draw(fraction)
      }
      rafId = requestAnimationFrame(frame)
    }
    draw(1)
    rafId = requestAnimationFrame(frame)

    return () => cancelAnimationFrame(rafId)
    // deliberately run once on mount only — refs carry mutable game state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 hidden sm:block">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col items-center justify-center gap-4 border-l border-white/[0.08] bg-[#141416] px-8 py-6 shadow-[-30px_0_60px_rgba(0,0,0,0.45)]">
        <div className="flex w-full max-w-fit items-center justify-between gap-6 font-mono text-xs tracking-wider text-white/70">
          <span>
            SCORE: {String(score).padStart(4, '0')} | HIGH: {String(highScore).padStart(4, '0')}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Snake"
            className="text-white/40 transition-colors duration-150 hover:text-[#D63C7A]"
          >
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={GRID * cell}
          height={GRID * cell}
          className="rounded-md border border-[#D63C7A] shadow-[0_0_30px_rgba(214,60,122,0.2)]"
        />
        {gameOver && (
          <p className="text-center font-mono text-xs tracking-wider text-white/50">game over — esc to close</p>
        )}
      </div>
    </div>
  )
}
