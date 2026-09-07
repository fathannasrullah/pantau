import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { destinationPoint } from '../lib/geo'
import type { GeolocationState } from '../hooks/useGeolocation'
import type { AshAdvisory, MapLayer, VolcanoRef } from '../types'

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
}

/**
 * Peta sungguhan: petak dasar OpenStreetMap, semua bentuk digambar dari
 * koordinat asli.
 *
 * Aturan yang dipegang di sini sama dengan sisa app: tidak ada bentuk karangan.
 * Prototipe memakai poligon abu ilustratif dan enam penanda desa yang ditulis
 * tangan; keduanya tidak dipakai. Yang digambar hanya kawah dari katalog
 * Smithsonian, poligon SIGMET apa adanya dari otoritas penerbangan, arah abu
 * dari angin terukur, dan posisi GPS pengguna sendiri.
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
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const drawnRef = useRef<L.Layer[]>([])

  // Peta dibuat sekali; berpindah gunung hanya menggeser pusatnya.
  useEffect(() => {
    const host = hostRef.current
    if (!host || mapRef.current) return

    const map = L.map(host, {
      center: [volcano.lat, volcano.lon],
      zoom: 9,
      zoomControl: false,
      scrollWheelZoom: false,
      attributionControl: true,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© Kontributor OpenStreetMap',
      maxZoom: 17,
    }).addTo(map)

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
    }
  }, [volcano.lat, volcano.lon])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setView([volcano.lat, volcano.lon], map.getZoom(), { animate: false })
  }, [volcano.lat, volcano.lon])

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

    add(
      L.circle(vent, {
        radius: radiusKm * 1000,
        color: '#f87171',
        weight: 2,
        dashArray: '5 5',
        fillColor: '#f87171',
        fillOpacity: 0.14,
      }).bindPopup(
        `Radius pembanding ${radiusKm} km. Zona terlarang resmi hanya ditetapkan Badan Geologi dan belum tersambung.`,
      ),
    )

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
            fillOpacity: a.namedHere ? 0.3 : 0.16,
            dashArray: a.namedHere ? undefined : '4 5',
          }).bindPopup(
            `Area peringatan abu ${a.fir ?? 'FIR tidak disebut'}. ${
              a.namedHere
                ? `Teksnya menyebut ${volcano.name}.`
                : 'Teksnya tidak menyebut gunung ini — bisa milik gunung lain.'
            } Sumber: SIGMET via NOAA Aviation Weather Center.`,
          ),
        )
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
            opacity: 0.8,
            dashArray: '2 6',
          }).bindPopup(
            `Angin membawa abu ke arah ini, ${windSpeedKmh} km/jam. Panjang garis = jarak tempuh satu jam, bukan batas jatuhnya abu. Sumber: Open-Meteo.`,
          ),
        )
      }
    }

    if (layer === 'pesisir' && volcano.strait) {
      add(
        L.circleMarker([volcano.strait.lat, volcano.strait.lon], {
          radius: 6,
          color: '#38bdf8',
          weight: 2,
          fillColor: '#0d1117',
          fillOpacity: 0.9,
        }).bindPopup(
          'Titik pengambilan tinggi gelombang. Peringatan tsunami hanya dikeluarkan BMKG — app ini tidak mengeluarkannya.',
        ),
      )
    }

    add(
      L.circleMarker(vent, {
        radius: 7,
        color: '#0d1117',
        weight: 2,
        fillColor: accent,
        fillOpacity: 1,
      }).bindPopup(
        `${volcano.name} · ${Math.abs(volcano.lat).toFixed(3)}°${
          volcano.lat < 0 ? 'S' : 'N'
        } ${Math.abs(volcano.lon).toFixed(3)}°${volcano.lon < 0 ? 'W' : 'E'} · katalog Smithsonian GVP`,
      ),
    )

    // Posisi pengguna hanya digambar bila GPS-nya benar-benar memberi titik.
    if (geo.fix) {
      const me: L.LatLngExpression = [geo.fix.lat, geo.fix.lon]
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
      add(
        L.circleMarker(me, {
          radius: 6,
          color: '#0d1117',
          weight: 2,
          fillColor: '#4ade80',
          fillOpacity: 1,
        }).bindPopup(
          `Posisi Anda · akurasi ${Math.round(geo.fix.accuracyM)} m, dari GPS perangkat.`,
        ),
      )
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
  ])

  return <div className="lmap" ref={hostRef} role="application" aria-label={`Peta ${volcano.name}`} />
}
