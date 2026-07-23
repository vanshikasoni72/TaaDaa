import { useEffect, useRef, useState } from 'react'

interface NeonSnakeModalProps {
  onClose: () => void
}

const GRID = 20
const CELL = 18
const TICK_MS = 110
const HIGH_SCORE_KEY = 'taadaa.snake.highScore'

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' }

function randomCell(exclude: Point[]): Point {
  while (true) {
    const p = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
    if (!exclude.some((e) => e.x === p.x && e.y === p.y)) return p
  }
}

export function NeonSnakeModal({ onClose }: NeonSnakeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0))
  const [gameOver, setGameOver] = useState(false)

  const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }])
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

    function draw() {
      if (!ctx) return
      ctx.fillStyle = '#141416'
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)

      ctx.fillStyle = '#4FBDAE'
      ctx.shadowColor = '#4FBDAE'
      ctx.shadowBlur = 8
      ctx.fillRect(foodRef.current.x * CELL + 3, foodRef.current.y * CELL + 3, CELL - 6, CELL - 6)
      ctx.shadowBlur = 0

      snakeRef.current.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#D63C7A' : '#E39BC4'
        if (i === 0) {
          ctx.shadowColor = '#D63C7A'
          ctx.shadowBlur = 6
        }
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2)
        ctx.shadowBlur = 0
      })
    }

    function tick() {
      if (overRef.current) return
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
      draw()
    }

    draw()
    const interval = setInterval(tick, TICK_MS)
    return () => clearInterval(interval)
    // deliberately run once on mount only — refs carry mutable game state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="fixed inset-0 z-50 hidden items-center justify-center bg-black/70 backdrop-blur-md sm:flex">
      <div className="rounded-2xl border border-white/[0.08] bg-[#141416] p-5 shadow-[0_0_40px_rgba(214,60,122,0.15)]">
        <div className="mb-3 flex items-center justify-between font-mono text-xs tracking-wider text-white/70">
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
          width={GRID * CELL}
          height={GRID * CELL}
          className="rounded-md border border-[#D63C7A]"
        />
        {gameOver && (
          <p className="mt-3 text-center font-mono text-xs tracking-wider text-white/50">game over — esc to close</p>
        )}
      </div>
    </div>
  )
}
