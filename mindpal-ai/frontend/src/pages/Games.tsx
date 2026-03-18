import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'

type GameId = 'garden' | 'color' | 'blocks' | 'clean' | 'loop' | 'builder'

export default function Games() {
  const [selected, setSelected] = useState<GameId | null>(null)

  if (selected) {
    return (
      <div className="space-y-4 page-soft-fade-in">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-sm text-[#4b5563] hover:text-[#111827]"
        >
          <span>←</span>
          <span>Back to Calm Arcade</span>
        </button>
        <div className="rounded-3xl bg-gradient-to-b from-[#fdf5ec] via-[#f4f7fb] to-[#e8f5f1] p-4 md:p-6 min-h-[420px] flex items-center justify-center">
          <div className="w-full max-w-3xl">
            {selected === 'garden' && <GardenGrowGame />}
            {selected === 'color' && <ColorHarmonyGame />}
            {selected === 'blocks' && <CalmBlocksGame />}
            {selected === 'clean' && <CleanShineGame />}
            {selected === 'loop' && <LoopConnectGame />}
            {selected === 'builder' && <MiniBuilderGame />}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 page-soft-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-[#2c2c2c]">Calm Arcade 🌿</h1>
        <p className="text-[#5a5a5a] text-sm md:text-base">
          Relax, play gently, and breathe. Choose a quiet mini-game and stay as long as you like — no scores, no
          pressure.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <GameCardOverview
          title="Garden grow 🌱"
          subtitle="Tap the soil and watch your tiny garden rise from seed to tree."
          onClick={() => setSelected('garden')}
        />
        <GameCardOverview
          title="Color harmony 🎨"
          subtitle="Gently rearrange gradient tiles until everything feels smooth again."
          onClick={() => setSelected('color')}
        />
        <GameCardOverview
          title="Calm blocks 🧩"
          subtitle="Place soft blocks in a slow grid. Lines clear with a quiet shimmer."
          onClick={() => setSelected('blocks')}
        />
        <GameCardOverview
          title="Clean & shine ✨"
          subtitle="Wipe away a light dust layer to reveal a bright, calm space."
          onClick={() => setSelected('clean')}
        />
        <GameCardOverview
          title="Loop connect 🔗"
          subtitle="Rotate tiles to complete a gentle looping path. No rush."
          onClick={() => setSelected('loop')}
        />
        <GameCardOverview
          title="Mini builder 🏡"
          subtitle="Place grass, water, stone and trees to build a tiny peaceful world."
          onClick={() => setSelected('builder')}
        />
      </div>
    </div>
  )
}

// --- Optional calm activity tracker (2+ minutes) ---

function useCalmActivityTracker(fetchApi: (path: string, options?: RequestInit) => Promise<Response>) {
  const [seconds, setSeconds] = useState(0)
  const sentRef = useRef(false)

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!sentRef.current && seconds >= 120) {
      sentRef.current = true
      fetchApi('/activity/calm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'calm_game', duration: seconds }),
      }).catch(() => {})
    }
  }, [seconds, fetchApi])
}

// --- Garden Grow 🌱 ---

type GardenStage = 0 | 1 | 2 | 3 | 4

function GardenGrowGame() {
  const { fetchApi } = useAuth()
  useCalmActivityTracker(fetchApi)
  const [stage, setStage] = useState<GardenStage>(0)
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([])
  const nextId = useRef(0)

  const bumpStage = () => {
    setStage((s) => (Math.min(4, s + 1) as GardenStage))
    const idBase = nextId.current
    const newParticles = Array.from({ length: 6 }).map((_, i) => ({
      id: idBase + i,
      x: 50 + (Math.random() * 30 - 15),
      y: 55 + (Math.random() * 10 - 5),
    }))
    nextId.current += 6
    setParticles((prev) => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !newParticles.some((n) => n.id === p.id)))
    }, 900)
  }

  const emoji =
    stage === 0 ? '🌱' : stage === 1 ? '🌿' : stage === 2 ? '🌷' : stage === 3 ? '🌳' : '🌳'
  const caption =
    stage === 0
      ? 'Tap the soil to plant a tiny seed.'
      : stage === 1
      ? 'Your sprout is waking up. Keep gently watering.'
      : stage === 2
      ? 'A small flower appears. Breathe with it.'
      : stage === 3
      ? 'Your tree is growing steady and calm.'
      : 'Full, quiet tree. You can still tap when you need a reset.'

  return (
    <div className="flex flex-col gap-4 items-center text-center">
      <div className="relative w-full h-48 rounded-3xl bg-gradient-to-b from-[#fdf2e9] via-[#e8f5f1] to-[#cfe9ff] overflow-hidden flex items-end justify-center">
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-r from-[#d4c8a4] via-[#c6d3a7] to-[#d4c8a4]" />
        <button
          type="button"
          onClick={bumpStage}
          className="relative z-10 mb-6 flex flex-col items-center gap-2 focus:outline-none"
        >
          <span className="text-5xl drop-shadow-sm">{emoji}</span>
          <span className="text-xs text-[#4b5563] bg-white/70 rounded-full px-3 py-1 shadow-sm">
            Tap soil
          </span>
        </button>
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute text-xs text-[#ecb3ff] animate-ping"
            style={{ left: `${p.x}%`, bottom: `${p.y}%` }}
          >
            ✨
          </span>
        ))}
      </div>
      <p className="text-sm text-gray-600 max-w-md">{caption}</p>
    </div>
  )
}

// --- Color Harmony 🎨 ---

type HarmonyTile = { id: number }

function ColorHarmonyGame() {
  const { fetchApi } = useAuth()
  useCalmActivityTracker(fetchApi)
  const [board, setBoard] = useState<HarmonyTile[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    const base: HarmonyTile[] = []
    for (let i = 0; i < 16; i++) base.push({ id: i })
    // shuffle
    for (let i = base.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[base[i], base[j]] = [base[j], base[i]]
    }
    setBoard(base)
  }, [])

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return
    setBoard((prev) => {
      const next = [...prev]
      ;[next[dragIndex], next[index]] = [next[index], next[dragIndex]]
      return next
    })
    setDragIndex(null)
  }

  const isSolved = board.every((tile, idx) => tile.id === idx)

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="relative">
        <div
          className={`grid grid-cols-4 gap-1 rounded-3xl p-2 shadow-sm bg-[#f4f5fb] ${
            isSolved ? 'ring-2 ring-[#a5b4fc]' : ''
          }`}
        >
          {board.map((tile, index) => {
            const row = Math.floor(tile.id / 4)
            const col = tile.id % 4
            const hue = 200 + col * 6
            const lightness = 85 - row * 6
            const color = `hsl(${hue}, 65%, ${lightness}%)`
            return (
              <div
                key={tile.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(index)}
                className="h-14 rounded-2xl transition-all duration-200 shadow-sm hover:shadow-md cursor-move"
                style={{ background: color }}
              />
            )
          })}
        </div>
        {isSolved && (
          <div className="absolute inset-0 rounded-3xl pointer-events-none bg-white/0 animate-[page-soft-fade-in_0.6s_ease-out]"></div>
        )}
      </div>
      <p className="text-sm text-gray-600 max-w-md text-center">
        Drag tiles until the gradient feels smooth from corner to corner. There&apos;s no timer — move slowly.
      </p>
    </div>
  )
}

// --- Calm Blocks 🧩 (gentle stacking) ---

const GRID_ROWS = 12
const GRID_COLS = 8
const BLOCK_COLORS = ['#bfdbfe', '#fecaca', '#bbf7d0', '#fde68a']

type BlockGrid = (number | null)[][]

type Falling = { col: number; row: number; targetRow: number; colorIndex: number } | null

function CalmBlocksGame() {
  const { fetchApi } = useAuth()
  useCalmActivityTracker(fetchApi)
  const [grid, setGrid] = useState<BlockGrid>(() =>
    Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null)),
  )
  const [falling, setFalling] = useState<Falling>(null)

  const dropInColumn = (col: number) => {
    if (falling) return
    let targetRow = -1
    for (let r = GRID_ROWS - 1; r >= 0; r--) {
      if (grid[r][col] === null) {
        targetRow = r
        break
      }
    }
    if (targetRow === -1) return
    const colorIndex = Math.floor(Math.random() * BLOCK_COLORS.length)
    setFalling({ col, row: -1, targetRow, colorIndex })
  }

  useEffect(() => {
    if (!falling) return
    let frame: number
    const step = () => {
      setFalling((current) => {
        if (!current) return null
        if (current.row >= current.targetRow) {
          // settle block
          setGrid((prev) => {
            const next = prev.map((row) => [...row])
            next[current.targetRow][current.col] = current.colorIndex
            // softly clear full lines
            for (let r = GRID_ROWS - 1; r >= 0; r--) {
              if (next[r].every((c) => c !== null)) {
                next[r] = Array(GRID_COLS).fill(null)
              }
            }
            return next
          })
          return null
        }
        return { ...current, row: current.row + 0.2 }
      })
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [falling])

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="w-full max-w-md space-y-2">
        <div className="grid grid-cols-8 gap-1 cursor-pointer">
          {Array.from({ length: GRID_COLS }).map((_, c) => (
            <button
              key={c}
              type="button"
              onClick={() => dropInColumn(c)}
              className="h-6 rounded-full bg-[#e5e7eb] hover:bg-[#d1fae5] transition-colors"
            />
          ))}
        </div>
        <div className="relative border border-gray-200 rounded-2xl bg-[#f9fafb] overflow-hidden">
          <div className="grid grid-cols-8 gap-[1px] p-2">
            {grid.map((row, r) =>
              row.map((cell, c) => {
                const isFalling = falling && Math.round(falling.row) === r && falling.col === c
                const colorIndex = isFalling
                  ? falling!.colorIndex
                  : cell != null
                  ? cell
                  : null
                const color = colorIndex != null ? BLOCK_COLORS[colorIndex] : 'transparent'
                return (
                  <div
                    key={`${r}-${c}`}
                    className="h-5 rounded-md bg-white/0"
                    style={
                      colorIndex != null
                        ? {
                            backgroundColor: color,
                            boxShadow: '0 1px 2px rgba(148, 163, 184, 0.6)',
                          }
                        : undefined
                    }
                  />
                )
              }),
            )}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 max-w-md text-center">
        Tap a column to let a soft block drift down. When a row fills up, it quietly clears and makes space again.
      </p>
    </div>
  )
}

// --- Clean & Shine ✨ ---

function CleanShineGame() {
  const { fetchApi } = useAuth()
  useCalmActivityTracker(fetchApi)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const isPointerDown = useRef(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height

    // underlying calm gradient
    const gradient = ctx.createLinearGradient(0, 0, w, h)
    gradient.addColorStop(0, '#e0f2fe')
    gradient.addColorStop(1, '#dcfce7')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)

    // soft dust layer
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)'
    ctx.fillRect(0, 0, w, h)
  }, [])

  const cleanAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = clientX - rect.left
    const y = clientY - rect.top
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    const radius = 24
    const grd = ctx.createRadialGradient(x, y, 0, x, y, radius)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isPointerDown.current = true
    cleanAt(e.clientX, e.clientY)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown.current) return
    cleanAt(e.clientX, e.clientY)
  }

  const handlePointerUp = () => {
    isPointerDown.current = false
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <canvas
        ref={canvasRef}
        width={360}
        height={200}
        className="rounded-3xl shadow-sm border border-gray-200 touch-none max-w-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <p className="text-sm text-gray-600 max-w-md text-center">
        Gently wipe away the soft dust to reveal a brighter scene underneath. Slow, steady strokes are enough.
      </p>
    </div>
  )
}

// --- Loop Connect 🔗 ---

type LoopTile = { id: number; rotation: number }

const LOOP_LAYOUT: LoopTile[] = [
  { id: 0, rotation: 0 },
  { id: 1, rotation: 0 },
  { id: 2, rotation: 0 },
  { id: 3, rotation: 0 },
  { id: 4, rotation: 0 },
  { id: 5, rotation: 0 },
  { id: 6, rotation: 0 },
  { id: 7, rotation: 0 },
  { id: 8, rotation: 0 },
]

function LoopConnectGame() {
  const { fetchApi } = useAuth()
  useCalmActivityTracker(fetchApi)
  const [tiles, setTiles] = useState<LoopTile[]>(() =>
    LOOP_LAYOUT.map((t) => ({
      ...t,
      rotation: (Math.floor(Math.random() * 4) * 90) % 360,
    })),
  )

  const rotateTile = (index: number) => {
    setTiles((prev) =>
      prev.map((tile, i) =>
        i === index ? { ...tile, rotation: (tile.rotation + 90) % 360 } : tile,
      ),
    )
  }

  const solved = tiles.every((t) => t.rotation === 0)

  return (
    <div className="flex flex-col gap-4 items-center">
      <div
        className={`rounded-3xl p-3 bg-[#eef2ff] shadow-sm ${
          solved ? 'ring-2 ring-[#a5b4fc]' : ''
        }`}
      >
        <div className="grid grid-cols-3 gap-2">
          {tiles.map((tile, index) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => rotateTile(index)}
              className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center hover:shadow-md transition-all"
            >
              <span
                className="block w-10 h-10 border-2 border-[#6366f1] rounded-full border-dashed"
                style={{ transform: `rotate(${tile.rotation}deg)` }}
              />
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-gray-600 max-w-md text-center">
        Tap tiles to rotate them. When every circle aligns, you&apos;ll see a soft ring of calm.
      </p>
    </div>
  )
}

// --- Mini Builder 🏡 ---

type BlockType = 'grass' | 'water' | 'stone' | 'tree' | 'empty'

const BLOCKS: { id: BlockType; label: string; emoji: string; color: string }[] = [
  { id: 'grass', label: 'Grass', emoji: '🌿', color: '#bbf7d0' },
  { id: 'water', label: 'Water', emoji: '💧', color: '#bfdbfe' },
  { id: 'stone', label: 'Stone', emoji: '🪨', color: '#e5e7eb' },
  { id: 'tree', label: 'Tree', emoji: '🌳', color: '#a7f3d0' },
]

const BUILDER_ROWS = 8
const BUILDER_COLS = 12

type BuilderGrid = BlockType[][]

function MiniBuilderGame() {
  const { fetchApi } = useAuth()
  useCalmActivityTracker(fetchApi)
  const [selected, setSelected] = useState<BlockType>('grass')
  const [grid, setGrid] = useState<BuilderGrid>(() =>
    Array.from({ length: BUILDER_ROWS }, () => Array(BUILDER_COLS).fill('empty')),
  )

  const handleCell = (row: number, col: number) => {
    setGrid((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = next[row][col] === selected ? 'empty' : selected
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 items-center">
      <div className="flex flex-wrap justify-center gap-2">
        {BLOCKS.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelected(b.id)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 shadow-sm border transition-all ${
              selected === b.id
                ? 'bg-[#e0f2fe] border-[#60a5fa] text-[#1f2937]'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-[#f3f4ff]'
            }`}
          >
            <span>{b.emoji}</span>
            <span>{b.label}</span>
          </button>
        ))}
      </div>
      <div className="rounded-3xl border border-gray-200 bg-[#f3f4f6] shadow-sm overflow-hidden">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${BUILDER_COLS}, minmax(0, 1fr))` }}>
          {grid.map((row, r) =>
            row.map((cell, c) => {
              const def = BLOCKS.find((b) => b.id === cell)
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCell(r, c)}
                  className="w-7 h-7 md:w-8 md:h-8 border border-white/60 flex items-center justify-center text-xs"
                  style={def ? { backgroundColor: def.color } : undefined}
                >
                  {def?.emoji}
                </button>
              )
            }),
          )}
        </div>
      </div>
      <p className="text-sm text-gray-600 max-w-md text-center">
        Place blocks to build a tiny peaceful scene — water, trees, stone paths. There&apos;s no right or wrong layout.
      </p>
    </div>
  )
}

// --- Overview card ---

type GameCardOverviewProps = {
  title: string
  subtitle: string
  onClick: () => void
}

function GameCardOverview({ title, subtitle, onClick }: GameCardOverviewProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-card text-left rounded-[16px] bg-white/95 shadow-sm border border-[#e0dce8] p-4 flex flex-col gap-2 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <h2 className="text-base font-semibold text-[#303234]">{title}</h2>
      <p className="text-xs text-[#7c8083]">{subtitle}</p>
    </button>
  )
}
