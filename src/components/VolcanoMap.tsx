import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { destinationPoint, distanceKm } from '../lib/geo'
import { formatNumber } from '../lib/format'
import type { GeolocationState } from '../hooks/useGeolocation'
import type { LiveQuake } from '../hooks/useLiveQuakes'
import type { AshAdvisory, Epicentre, MapLayer, VolcanoRef } from '../types'

export type BaseMapId = 'jalan' | 'relief'

interface BaseMapDef {
  id: BaseMapId
  label: string
  url: string
  attribution: string
  maxZoom: number
}

/**
 * Dua peta dasar, keduanya terbuka dan wajib membawa atribusinya. Relief
 * dipakai karena bentuk lereng menentukan ke mana aliran dan lahar turun —
 * hal yang tidak terlihat sama sekali di peta jalan.
 */
const BASE_MAPS: BaseMapDef[] = [
  {
    id: 'jalan',
    label: 'Jalan',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© Kontributor OpenStreetMap',
    maxZoom: 17,
  },
  {
    id: 'relief',
    label: 'Relief',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '© Kontributor OpenStreetMap · SRTM · tampilan © OpenTopoMap (CC-BY-SA)',
    maxZoom: 15,
  },
]

interface Props {
  volcano: VolcanoRef
  /** Radius pembanding dalam km — bukan zona resmi Badan Geologi. */
  radiusKm: number
  layer: MapLayer['id']
  accent: string
  geo: GeolocationState
  /** Arah tujuan abu dalam derajat, dihitung dari angin sungguhan. */
  ashHeadingDeg: number | null
  windSpeedKmh: number
  advisories: AshAdvisory[] | null
  /** Cincin radius WorldPop, untuk digambar bersama jumlah penduduknya. */
  population: { year: number; rings: { radiusKm: number; people: number }[] } | null
  /** Episentrum BMKG dan USGS; keduanya sudah tersaring ke sekitar gunung. */
  bmkgEpicentres: Epicentre[]
  usgsQuakes: LiveQuake[]
}

/** Warna PAGER USGS — satu-satunya penilaian dampak resmi yang kita punya. */
const PAGER_COLOR: Record<string, string> = {
  green: '#4ade80',
  yellow: '#facc15',
  orange: '#fb923c',
  red: '#f87171',
}

const BMKG_COLOR = '#38bdf8'
const USGS_COLOR = '#facc15'

/** Jari-jari penanda gempa mengikuti magnitudo, dibatasi agar tetap terbaca. */
function magRadius(mag: number): number {
  return Math.max(4, Math.min(16, 3 + mag * 1.6))
}

function formatCoords(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(3)}°${lat < 0 ? 'S' : 'N'} ${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'W' : 'E'}`
}

const clockWIB = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

/**
 * Peta sungguhan: petak dasar OpenStreetMap atau OpenTopoMap, semua bentuk di
 * atasnya digambar dari koordinat asli.
 *
 * Aturan yang dipegang di sini sama dengan sisa app: tidak ada bentuk karangan.
 * Prototipe memakai poligon abu ilustratif dan enam penanda desa yang ditulis
 * tangan; keduanya tidak dipakai. Yang digambar hanya kawah dari katalog
 * Smithsonian, poligon SIGMET apa adanya dari otoritas penerbangan, arah abu
 * dari angin terukur, cincin penduduk WorldPop, episentrum BMKG dan USGS, serta
 * posisi GPS pengguna sendiri.
 */
export function VolcanoMap({
  volcano,
  radiusKm,
  layer,
  accent,
  geo,
  ashHeadingDeg,
  windSpeedKmh,
  advisories,
  population,
  bmkgEpicentres,
  usgsQuakes,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseRef = useRef<L.TileLayer | null>(null)
  const drawnRef = useRef<L.Layer[]>([])
  const [baseId, setBaseId] = useState<BaseMapId>('jalan')
  const [tilesFailed, setTilesFailed] = useState(false)

  // Peta dibuat sekali; berpindah gunung hanya memindahkan pandangannya.
  useEffect(() => {
    const host = hostRef.current
    if (!host || mapRef.current) return

    const map = L.map(host, {
      center: [volcano.lat, volcano.lon],
      zoom: 9,
      zoomControl: false,
      // Gulir halaman tidak boleh tersangkut di peta saat membaca di ponsel.
      scrollWheelZoom: false,
      attributionControl: true,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    // Skala metrik: satu-satunya cara pembaca menilai jarak sebenarnya.
    L.control.scale({ position: 'topleft', imperial: false }).addTo(map)

    mapRef.current = map
    // Kartu peta sering baru mendapat ukuran akhirnya setelah tata letak
    // selesai; tanpa ini petaknya hanya terisi sebagian.
    const nudge = [60, 250, 700].map((ms) =>
      window.setTimeout(() => map.invalidateSize(), ms),
    )
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => map.invalidateSize())
    observer?.observe(host)

    return () => {
      nudge.forEach(window.clearTimeout)
      observer?.disconnect()
      map.remove()
      mapRef.current = null
      baseRef.current = null
    }
  }, [volcano.lat, volcano.lon])

  // Petak dasar dipasang terpisah supaya bisa ditukar tanpa membangun ulang.
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const def = BASE_MAPS.find((b) => b.id === baseId) ?? BASE_MAPS[0]
    if (baseRef.current) map.removeLayer(baseRef.current)
    setTilesFailed(false)
    const tiles = L.tileLayer(def.url, {
      attribution: def.attribution,
      maxZoom: def.maxZoom,
    })
    // Petak gagal berarti sedang offline atau penyedia menolak; itu harus
    // terlihat, bukan menyisakan layar kosong tanpa penjelasan.
    tiles.on('tileerror', () => setTilesFailed(true))
    tiles.on('tileload', () => setTilesFailed(false))
    tiles.addTo(map)
    baseRef.current = tiles
  }, [baseId])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    drawnRef.current.forEach((item) => map.removeLayer(item))
    drawnRef.current = []
    const add = (item: L.Layer) => {
      item.addTo(map)
      drawnRef.current.push(item)
    }

    const vent: L.LatLngExpression = [volcano.lat, volcano.lon]
    // Semua yang perlu terlihat pada lapisan ini, untuk menyetel pandangan.
    const focus: L.LatLngExpression[] = [vent]

    add(
      L.circle(vent, {
        radius: radiusKm * 1000,
        color: '#f87171',
        weight: 2,
        dashArray: '5 5',
        fillColor: '#f87171',
        fillOpacity: 0.12,
      }).bindPopup(
        `Radius pembanding ${radiusKm} km. Zona terlarang resmi hanya ditetapkan Badan Geologi dan belum tersambung.`,
      ),
    )
    /** Empat ujung sebuah lingkaran, supaya fitBounds memuat seluruhnya. */
    const ringEdges = (km: number): L.LatLngExpression[] =>
      [0, 90, 180, 270].map((bearing) => {
        const p = destinationPoint(
          { lat: volcano.lat, lon: volcano.lon },
          bearing,
          km,
        )
        return [p.lat, p.lon] as L.LatLngExpression
      })

    focus.push(...ringEdges(radiusKm))

    if (layer === 'radius' && population) {
      // Cincin WorldPop: jaraknya nyata dan jumlah penduduknya nyata, jadi
      // pembaca bisa melihat berapa orang ada di dalam tiap jarak.
      for (const ring of population.rings) {
        add(
          L.circle(vent, {
            radius: ring.radiusKm * 1000,
            color: '#c084fc',
            weight: 1,
            opacity: 0.65,
            fill: false,
            dashArray: '3 7',
          })
            .bindTooltip(`${ring.radiusKm} km · ${formatNumber(ring.people)} jiwa`, {
              direction: 'top',
              sticky: true,
            })
            .bindPopup(
              `Sekitar ${formatNumber(ring.people)} jiwa tinggal dalam radius ${ring.radiusKm} km dari kawah. Model sebaran penduduk WorldPop ${population.year} beresolusi 100 m — bukan sensus terkini, bukan hitungan orang yang sedang berada di sana hari ini.`,
            ),
        )
        focus.push(...ringEdges(ring.radiusKm))
      }
    }

    if (layer === 'abu') {
      // Poligon SIGMET adalah area yang benar-benar dinyatakan otoritas
      // penerbangan — ini satu-satunya sebaran abu yang boleh digambar.
      for (const a of advisories ?? []) {
        if (!a.polygon) continue
        add(
          L.polygon(a.polygon, {
            color: a.namedHere ? '#cbd5e1' : '#64748b',
            weight: 1.5,
            fillColor: '#94a3b8',
            fillOpacity: a.namedHere ? 0.28 : 0.14,
            dashArray: a.namedHere ? undefined : '4 5',
          }).bindPopup(
            `Area peringatan abu ${a.fir ?? 'FIR tidak disebut'}${
              a.topFt === null ? '' : `, puncak FL${Math.round(a.topFt / 100)}`
            }. ${
              a.namedHere
                ? `Teksnya menyebut ${volcano.name}.`
                : 'Teksnya tidak menyebut gunung ini — bisa milik gunung lain.'
            } Sumber: SIGMET via NOAA Aviation Weather Center.`,
          ),
        )
        for (const point of a.polygon) focus.push(point)
      }

      // Arah angin terukur, digambar sebagai garis dari kawah. Panjangnya
      // jarak tempuh satu jam — bukan klaim sejauh mana abu benar-benar jatuh.
      if (ashHeadingDeg !== null && windSpeedKmh > 0) {
        const tip = destinationPoint(
          { lat: volcano.lat, lon: volcano.lon },
          ashHeadingDeg,
          windSpeedKmh,
        )
        add(
          L.polyline([vent, [tip.lat, tip.lon]], {
            color: accent,
            weight: 3,
            opacity: 0.85,
            dashArray: '2 6',
          })
            .bindTooltip(`abu terbawa ke sini · ${windSpeedKmh} km/jam`, {
              direction: 'top',
            })
            .bindPopup(
              `Angin membawa abu ke arah ini, ${windSpeedKmh} km/jam. Panjang garis = jarak tempuh satu jam, bukan batas jatuhnya abu. Sumber: Open-Meteo.`,
            ),
        )
        focus.push([tip.lat, tip.lon])
      }
    }

    if (layer === 'gempa') {
      for (const q of bmkgEpicentres) {
        const mag = Number.parseFloat(q.magnitude.replace(',', '.'))
        add(
          L.circleMarker([q.lat, q.lon], {
            radius: magRadius(Number.isFinite(mag) ? mag : 3),
            color: '#0d1117',
            weight: 1.5,
            fillColor: BMKG_COLOR,
            fillOpacity: 0.75,
          })
            .bindTooltip(`M ${q.magnitude} · BMKG`, { direction: 'top' })
            .bindPopup(
              `<strong>M ${q.magnitude}</strong> · ${q.area}<br>${
                q.depth ? `Kedalaman ${q.depth}. ` : ''
              }${q.distanceKm} km dari kawah, ${clockWIB(q.timeISO)} WIB.${
                q.potential ? `<br>${q.potential}` : ''
              }<br><span class="lpop__src">Sumber: BMKG</span>`,
            ),
        )
        focus.push([q.lat, q.lon])
      }

      for (const q of usgsQuakes) {
        const color = q.alert ? (PAGER_COLOR[q.alert] ?? USGS_COLOR) : USGS_COLOR
        add(
          L.circleMarker([q.lat, q.lon], {
            radius: magRadius(q.mag),
            color: '#0d1117',
            weight: 1.5,
            fillColor: color,
            fillOpacity: 0.7,
          })
            .bindTooltip(`M ${q.mag.toFixed(1)} · USGS`, { direction: 'top' })
            .bindPopup(
              `<strong>M ${q.mag.toFixed(1)}</strong> · ${q.place}<br>${
                q.depthKm === null ? '' : `Kedalaman ${Math.round(q.depthKm)} km. `
              }${q.distanceKm} km dari kawah, ${clockWIB(q.timeISO)} WIB.${
                q.tsunami ? '<br>Ditandai berpotensi tsunami.' : ''
              }<br><a href="${q.url}" target="_blank" rel="noopener noreferrer">Halaman resmi kejadian →</a>`,
            ),
        )
        focus.push([q.lat, q.lon])
      }
    }

    if (layer === 'pesisir' && volcano.strait) {
      add(
        L.circleMarker([volcano.strait.lat, volcano.strait.lon], {
          radius: 6,
          color: '#0d1117',
          weight: 2,
          fillColor: BMKG_COLOR,
          fillOpacity: 0.9,
        })
          .bindTooltip('titik ukur gelombang', { direction: 'top' })
          .bindPopup(
            'Titik pengambilan tinggi gelombang (Open-Meteo Marine). Peringatan tsunami hanya dikeluarkan BMKG — app ini tidak mengeluarkannya.',
          ),
      )
      focus.push([volcano.strait.lat, volcano.strait.lon])
    }

    add(
      L.circleMarker(vent, {
        radius: 7,
        color: '#0d1117',
        weight: 2,
        fillColor: accent,
        fillOpacity: 1,
      })
        .bindTooltip(volcano.name, { direction: 'top' })
        .bindPopup(
          `<strong>${volcano.name}</strong><br>${formatCoords(volcano.lat, volcano.lon)} · ${formatNumber(volcano.elevationM)} m<br><span class="lpop__src">Koordinat katalog Smithsonian GVP #${volcano.gvpNumber}</span>`,
        ),
    )

    // Posisi pengguna hanya digambar bila GPS-nya benar-benar memberi titik.
    if (geo.fix) {
      const me: L.LatLngExpression = [geo.fix.lat, geo.fix.lon]
      const km = distanceKm({ lat: geo.fix.lat, lon: geo.fix.lon }, volcano)
      add(
        L.circle(me, {
          radius: geo.fix.accuracyM,
          color: '#4ade80',
          weight: 1,
          opacity: 0.5,
          fillColor: '#4ade80',
          fillOpacity: 0.1,
        }),
      )
      // Garis ke kawah membuat jarak di kartu Posisi bisa dilihat, bukan hanya
      // dibaca sebagai angka.
      add(
        L.polyline([me, vent], {
          color: '#4ade80',
          weight: 1.5,
          opacity: 0.55,
          dashArray: '4 6',
        }).bindTooltip(`${km < 10 ? km.toFixed(1) : Math.round(km)} km ke kawah`, {
          direction: 'center',
          sticky: true,
        }),
      )
      add(
        L.circleMarker(me, {
          radius: 6,
          color: '#0d1117',
          weight: 2,
          fillColor: '#4ade80',
          fillOpacity: 1,
        })
          .bindTooltip('posisi Anda', { direction: 'top' })
          .bindPopup(
            `<strong>Posisi Anda</strong><br>${formatCoords(geo.fix.lat, geo.fix.lon)}<br>${
              km < 10 ? km.toFixed(1) : Math.round(km)
            } km dari kawah · akurasi ${Math.round(geo.fix.accuracyM)} m<br><span class="lpop__src">GPS perangkat Anda</span>`,
          ),
      )
      focus.push(me)
    }

    // Pandangan disetel agar seluruh bentuk lapisan ini muat, bukan zoom tetap
    // yang bisa memotong episentrum atau poligon abu di luar layar.
    const bounds = L.latLngBounds(focus)
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12, animate: false })
    }
  }, [
    volcano,
    radiusKm,
    layer,
    accent,
    geo.fix,
    ashHeadingDeg,
    windSpeedKmh,
    advisories,
    population,
    bmkgEpicentres,
    usgsQuakes,
  ])

  const legend = buildLegend({
    layer,
    radiusKm,
    hasPopulation: layer === 'radius' && population !== null,
    hasAdvisory: layer === 'abu' && (advisories ?? []).some((a) => a.polygon),
    hasWind: layer === 'abu' && ashHeadingDeg !== null,
    quakeCount:
      layer === 'gempa' ? bmkgEpicentres.length + usgsQuakes.length : 0,
    hasFix: geo.fix !== null,
  })

  return (
    <div className="lmapwrap">
      <div
        className="lmap"
        ref={hostRef}
        role="application"
        aria-label={`Peta ${volcano.name}`}
      />

      <div className="lmapbase" role="group" aria-label="Peta dasar">
        {BASE_MAPS.map((b) => (
          <button
            key={b.id}
            type="button"
            className={`lmapbase__btn${b.id === baseId ? ' lmapbase__btn--on' : ''}`}
            aria-pressed={b.id === baseId}
            onClick={() => setBaseId(b.id)}
          >
            {b.label}
          </button>
        ))}
      </div>

      {tilesFailed && (
        <div className="lmapoff" role="status">
          Petak peta tidak bisa dimuat. Yang tampil hanya petak yang tersimpan
          sebelumnya; bentuk di atasnya tetap digambar dari koordinat.
        </div>
      )}

      {legend.length > 0 && (
        <ul className="lmaplegend">
          {legend.map((item) => (
            <li className="lmaplegend__row" key={item.label}>
              <span
                className={`lmaplegend__key lmaplegend__key--${item.shape}`}
                style={{ color: item.color }}
                aria-hidden="true"
              />
              <span className="lmaplegend__label">{item.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface LegendItem {
  shape: 'dot' | 'ring' | 'line' | 'area'
  color: string
  label: string
}

/** Keterangan warna hanya memuat yang benar-benar sedang tergambar. */
function buildLegend(params: {
  layer: MapLayer['id']
  radiusKm: number
  hasPopulation: boolean
  hasAdvisory: boolean
  hasWind: boolean
  quakeCount: number
  hasFix: boolean
}): LegendItem[] {
  const items: LegendItem[] = [
    { shape: 'ring', color: '#f87171', label: `radius pembanding ${params.radiusKm} km` },
  ]
  if (params.hasPopulation) {
    items.push({ shape: 'ring', color: '#c084fc', label: 'cincin penduduk WorldPop' })
  }
  if (params.hasAdvisory) {
    items.push({ shape: 'area', color: '#94a3b8', label: 'area peringatan abu (SIGMET)' })
  }
  if (params.hasWind) {
    items.push({ shape: 'line', color: '#fb923c', label: 'arah angin terukur' })
  }
  if (params.quakeCount > 0) {
    items.push({ shape: 'dot', color: BMKG_COLOR, label: 'episentrum BMKG' })
    items.push({ shape: 'dot', color: USGS_COLOR, label: 'episentrum USGS' })
  }
  if (params.hasFix) {
    items.push({ shape: 'dot', color: '#4ade80', label: 'posisi Anda' })
  }
  return items
}
