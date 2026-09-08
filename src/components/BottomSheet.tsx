import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

/** Di bawah lebar ini lembar geser menempel di bawah; di atasnya jadi panel kiri. */
export const WIDE_PX = 1000

/** Sisa layar di atas lembar saat dibuka penuh, supaya peta tetap terlihat. */
const TOP_GAP = 76

export interface SheetMetrics {
  /** Tinggi lembar sekarang, dipakai peta untuk menghitung ruang yang tertutup. */
  height: number
  wide: boolean
  /** Lebar panel kiri saat layar lebar; 0 saat lembar menempel di bawah. */
  panelWidth: number
}

interface Props {
  /** Tiga posisi jepret dihitung dari tinggi layar. */
  onMetrics: (m: SheetMetrics) => void
  /**
   * Posisi jepret dipegang induknya supaya berpindah tab bisa ikut membuka
   * lembar — 0 rendah, 1 setengah, 2 penuh.
   */
  snap: number
  onSnapChange: (snap: number) => void
  /** Isi tetap di atas area gulir — navigasi tab. */
  header: ReactNode
  children: ReactNode
}

function snapPointsFor(viewportH: number): [number, number, number] {
  return [
    Math.min(348, Math.round(viewportH * 0.44)),
    Math.round(viewportH * 0.58),
    viewportH - TOP_GAP,
  ]
}

function panelWidthFor(viewportW: number): number {
  return Math.min(420, Math.max(340, Math.round(viewportW * 0.32)))
}

/**
 * Lembar geser di atas peta.
 *
 * Peta kini jadi latar penuh layar, jadi isi app duduk di lembar yang bisa
 * ditarik: rendah untuk melihat peta, tinggi untuk membaca. Tiga posisi jepret
 * cukup — lebih banyak hanya membuat orang menebak-nebak.
 *
 * Di layar lebar tidak ada yang perlu ditarik: lembar berubah jadi panel kiri
 * setinggi layar, dan peta memakai sisa ruangnya.
 */
export function BottomSheet({
  onMetrics,
  snap,
  onSnapChange,
  header,
  children,
}: Props) {
  const [viewport, setViewport] = useState(() => ({
    w: typeof window === 'undefined' ? 420 : window.innerWidth,
    h: typeof window === 'undefined' ? 880 : window.innerHeight,
  }))
  /** Tinggi saat sedang ditarik; null berarti sedang diam di titik jepret. */
  const [drag, setDrag] = useState<number | null>(null)
  const movedRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const wide = viewport.w >= WIDE_PX
  const snaps = snapPointsFor(viewport.h)
  const height = drag ?? snaps[snap]
  const panelWidth = wide ? panelWidthFor(viewport.w) : 0

  useEffect(() => {
    onMetrics({ height: wide ? 0 : height, wide, panelWidth })
  }, [onMetrics, height, wide, panelWidth])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (wide) return
      const startY = e.clientY
      const startH = height
      movedRef.current = false

      const move = (ev: PointerEvent) => {
        const dy = startY - ev.clientY
        if (Math.abs(dy) > 4) movedRef.current = true
        // Sedikit lebih rendah dari jepret terendah supaya terasa lentur,
        // tapi tidak sampai hilang dari layar.
        setDrag(Math.max(snaps[0] - 40, Math.min(snaps[2], startH + dy)))
      }
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        setDrag((current) => {
          if (current === null) return null
          let best = 0
          let bestGap = Infinity
          snaps.forEach((v, i) => {
            const gap = Math.abs(v - current)
            if (gap < bestGap) {
              bestGap = gap
              best = i
            }
          })
          onSnapChange(best)
          return null
        })
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [wide, height, snaps],
  )

  // Ketuk gagang memutar antar tiga posisi — jalan pintas untuk yang tidak
  // ingin menarik, dan satu-satunya cara lewat papan ketik.
  const cycle = useCallback(() => {
    if (wide) return
    if (movedRef.current) {
      movedRef.current = false
      return
    }
    onSnapChange((snap + 1) % 3)
  }, [wide, snap, onSnapChange])

  // Berpindah tab selalu mulai dari awal isinya, bukan dari posisi gulir tab
  // sebelumnya.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [children])

  const style = wide
    ? ({ width: `${panelWidth}px` } as React.CSSProperties)
    : ({
        height: `${height}px`,
        transition: drag === null ? undefined : 'none',
      } as React.CSSProperties)

  return (
    <section
      className={`sheetpanel${wide ? ' sheetpanel--side' : ''}`}
      style={style}
      aria-label="Panel informasi"
    >
      {!wide && (
        <button
          type="button"
          className="sheetpanel__grip"
          onPointerDown={onPointerDown}
          onClick={cycle}
          aria-label={`Tinggi panel: posisi ${snap + 1} dari 3. Ketuk untuk mengubah.`}
        >
          <span className="sheetpanel__gripbar" aria-hidden="true" />
        </button>
      )}
      <div className="sheetpanel__head">{header}</div>
      <div className="sheetpanel__scroll" ref={scrollRef} data-sheet-scroll>
        {children}
      </div>
    </section>
  )
}
