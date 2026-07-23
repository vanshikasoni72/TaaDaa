import { useEffect, useRef, useState } from 'react'

interface TetrisModalProps {
  onClose: () => void
}

const COLS = 10
const ROWS = 20
const CELL = 20
const HIGH_SCORE_KEY = 'taadaa.tetris.highScore'
const ACCENTS = ['#D63C7A', '#E39BC4', '#4FBDAE']

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
        const full = row.every((cell) => cell !== null)
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

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (overRef.current) return
      const piece = pieceRef.current
      if (e.key === 'ArrowLeft') {
        if (!collides(boardRef.current, piece.row, piece.col - 1, piece.shape)) {
          pieceRef.current = { ...piece, col: piece.col - 1 }
        }
      } else if (e.key === 'ArrowRight') {
        if (!collides(boardRef.current, piece.row, piece.col + 1, piece.shape)) {
          pieceRef.current = { ...piece, col: piece.col + 1 }
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

    window.addEventListener('keydown', handleKey)
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
      window.removeEventListener('keydown', handleKey)
    }
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
            aria-label="Close Tetris"
            className="text-white/40 transition-colors duration-150 hover:text-[#D63C7A]"
          >
            ✕
          </button>
        </div>
        <canvas
          ref={canvasRef}
          width={COLS * CELL}
          height={ROWS * CELL}
          className="rounded-md border border-[#D63C7A]"
        />
        {gameOver && (
          <p className="mt-3 text-center font-mono text-xs tracking-wider text-white/50">game over — esc to close</p>
        )}
      </div>
    </div>
  )
}
