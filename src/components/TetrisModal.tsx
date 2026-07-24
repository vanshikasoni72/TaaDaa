import { useEffect, useRef, useState } from 'react'

interface TetrisModalProps {
  onClose: () => void
}

const COLS = 10
const ROWS = 20
const HIGH_SCORE_KEY = 'taadaa.tetris.highScore'
const ACCENTS = ['#D63C7A', '#E39BC4', '#4FBDAE']
// Delayed Auto Shift: holding left/right moves once immediately, then after
// an initial pause keeps moving on its own at a fast repeat rate — standard
// Tetris feel, and more consistent than relying on the browser/OS's own key
// -repeat timing.
const DAS_DELAY_MS = 170
const DAS_REPEAT_MS = 50

// Sized off the viewport so the board fills most of the docked panel's
// height rather than sitting at a fixed, easy-to-outgrow size.
function computeCell(): number {
  const availableH = window.innerHeight - 200
  return Math.max(18, Math.min(34, Math.floor(availableH / ROWS)))
}

type Matrix = number[][]

const SHAPES: Record<string, Matrix> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
}
const PIECE_KEYS = Object.keys(SHAPES)
const COLOR_FOR: Record<string, string> = Object.fromEntries(
  PIECE_KEYS.map((key, i) => [key, ACCENTS[i % ACCENTS.length]]),
)

interface Piece {
  shape: Matrix
  color: string
  row: number
  col: number
}

function rotate(shape: Matrix): Matrix {
  const n = shape.length
  const result: Matrix = Array.from({ length: n }, () => Array(n).fill(0))
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      result[c][n - 1 - r] = shape[r][c]
    }
  }
  return result
}

function spawnPiece(): Piece {
  const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)]
  const shape = SHAPES[key]
  return { shape, color: COLOR_FOR[key], row: 0, col: Math.floor((COLS - shape.length) / 2) }
}

function collides(board: (string | null)[][], row: number, col: number, shape: Matrix): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const boardRow = row + r
      const boardCol = col + c
      if (boardCol < 0 || boardCol >= COLS || boardRow >= ROWS) return true
      if (boardRow >= 0 && board[boardRow][boardCol]) return true
    }
  }
  return false
}

function emptyBoard(): (string | null)[][] {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

export function TetrisModal({ onClose }: TetrisModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) ?? 0))
  const [gameOver, setGameOver] = useState(false)
  const [cell] = useState(computeCell)

  const boardRef = useRef(emptyBoard())
  const pieceRef = useRef<Piece>(spawnPiece())
  const scoreRef = useRef(0)
  const overRef = useRef(false)
  const dropIntervalRef = useRef(600)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const CELL = cell

    function draw() {
      if (!ctx) return
      ctx.fillStyle = '#141416'
      ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const color = boardRef.current[r][c]
          if (color) {
            ctx.fillStyle = color
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2)
          }
        }
      }

      const piece = pieceRef.current
      ctx.fillStyle = piece.color
      ctx.shadowColor = piece.color
      ctx.shadowBlur = 5
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue
          const boardRow = piece.row + r
          if (boardRow < 0) continue
          ctx.fillRect((piece.col + c) * CELL + 1, boardRow * CELL + 1, CELL - 2, CELL - 2)
        }
      }
      ctx.shadowBlur = 0
    }

    function lockPiece() {
      const piece = pieceRef.current
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue
          const boardRow = piece.row + r
          const boardCol = piece.col + c
          if (boardRow >= 0) boardRef.current[boardRow][boardCol] = piece.color
        }
      }

      let cleared = 0
      boardRef.current = boardRef.current.filter((row) => {
        const full = row.every((cellVal) => cellVal !== null)
        if (full) cleared++
        return !full
      })
      while (boardRef.current.length < ROWS) boardRef.current.unshift(Array(COLS).fill(null))

      if (cleared > 0) {
        scoreRef.current += [0, 40, 100, 300, 1200][cleared] ?? cleared * 100
        setScore(scoreRef.current)
        dropIntervalRef.current = Math.max(150, 600 - Math.floor(scoreRef.current / 5))
      }

      const next = spawnPiece()
      if (collides(boardRef.current, next.row, next.col, next.shape)) {
        overRef.current = true
        setGameOver(true)
        if (scoreRef.current > highScore) {
          localStorage.setItem(HIGH_SCORE_KEY, String(scoreRef.current))
          setHighScore(scoreRef.current)
        }
        return
      }
      pieceRef.current = next
    }

    function tickDown() {
      if (overRef.current) return
      const piece = pieceRef.current
      if (!collides(boardRef.current, piece.row + 1, piece.col, piece.shape)) {
        pieceRef.current = { ...piece, row: piece.row + 1 }
      } else {
        lockPiece()
      }
      draw()
    }

    function moveHorizontal(dir: -1 | 1) {
      if (overRef.current) return
      const piece = pieceRef.current
      if (!collides(boardRef.current, piece.row, piece.col + dir, piece.shape)) {
        pieceRef.current = { ...piece, col: piece.col + dir }
        draw()
      }
    }

    // Tracks which arrow key (if any) is currently being auto-repeated, plus
    // the timers driving that repeat — see DAS_DELAY_MS/DAS_REPEAT_MS above.
    let dasDir: -1 | 1 | null = null
    let dasTimeout: ReturnType<typeof setTimeout> | undefined
    let dasInterval: ReturnType<typeof setInterval> | undefined

    function stopDas() {
      clearTimeout(dasTimeout)
      clearInterval(dasInterval)
      dasDir = null
    }

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (overRef.current) return
      const piece = pieceRef.current

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowLeft' ? -1 : 1
        if (!e.repeat) {
          stopDas()
          moveHorizontal(dir)
          dasDir = dir
          dasTimeout = setTimeout(() => {
            dasInterval = setInterval(() => moveHorizontal(dasDir!), DAS_REPEAT_MS)
          }, DAS_DELAY_MS)
        }
      } else if (e.key === 'ArrowDown') {
        if (!collides(boardRef.current, piece.row + 1, piece.col, piece.shape)) {
          pieceRef.current = { ...piece, row: piece.row + 1 }
        }
      } else if (e.key === 'ArrowUp') {
        const rotated = rotate(piece.shape)
        if (!collides(boardRef.current, piece.row, piece.col, rotated)) {
          pieceRef.current = { ...piece, shape: rotated }
        }
      } else if (e.key === ' ') {
        let dropRow = piece.row
        while (!collides(boardRef.current, dropRow + 1, piece.col, piece.shape)) dropRow++
        pieceRef.current = { ...piece, row: dropRow }
        lockPiece()
      } else {
        return
      }
      e.preventDefault()
      draw()
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft' && dasDir === -1) stopDas()
      else if (e.key === 'ArrowRight' && dasDir === 1) stopDas()
    }

    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKeyUp)
    draw()

    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>
    function loop() {
      if (cancelled) return
      tickDown()
      timeoutId = setTimeout(loop, dropIntervalRef.current)
    }
    timeoutId = setTimeout(loop, dropIntervalRef.current)

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      stopDas()
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKeyUp)
    }
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
            aria-label="Close Tetris"
            className="text-white/40 transition-colors duration-150 hover:text-[#D63C7A]"
          >
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={COLS * cell}
          height={ROWS * cell}
          className="rounded-md border border-[#D63C7A] shadow-[0_0_30px_rgba(214,60,122,0.2)]"
        />
        {gameOver && (
          <p className="text-center font-mono text-xs tracking-wider text-white/50">game over — esc to close</p>
        )}
      </div>
    </div>
  )
}
