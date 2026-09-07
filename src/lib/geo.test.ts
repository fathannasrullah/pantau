import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  angleDelta,
  bearingDeg,
  distanceKm,
  fixQuality,
  isDownwind,
  nearestTo,
  zoneVerdict,
} from './geo.ts'

const KRAKATAU = { lat: -6.102, lon: 105.423 }
const KALIANDA = { lat: -5.7486, lon: 105.5905 }

test('jarak cocok dengan jarak sebenarnya ke Kalianda', () => {
  // Anak Krakatau–Kalianda kira-kira 43 km; toleransi 2 km menutup pembulatan
  // koordinat, bukan kesalahan rumus.
  const km = distanceKm(KRAKATAU, KALIANDA)
  assert.ok(Math.abs(km - 43) < 2, `dapat ${km.toFixed(1)} km`)
})

test('jarak ke titik yang sama nol, dan simetris', () => {
  assert.equal(distanceKm(KRAKATAU, KRAKATAU), 0)
  assert.equal(
    distanceKm(KRAKATAU, KALIANDA).toFixed(6),
    distanceKm(KALIANDA, KRAKATAU).toFixed(6),
  )
})

test('arah dari kawah ke Kalianda mengarah timur laut', () => {
  const b = bearingDeg(KRAKATAU, KALIANDA)
  assert.ok(b > 20 && b < 70, `dapat ${b.toFixed(0)}°`)
})

test('selisih sudut selalu mengambil jalur terpendek', () => {
  assert.equal(angleDelta(350, 10), 20)
  assert.equal(angleDelta(10, 350), 20)
  assert.equal(angleDelta(0, 180), 180)
})

test('searah abu dinilai dari arah tujuan abu, bukan posisi saja', () => {
  // Pengguna di timur laut kawah (45°): searah abu bila abu juga ke timur laut.
  assert.equal(isDownwind(45, 45), true)
  assert.equal(isDownwind(45, 80), true) // masih dalam toleransi 45°
  assert.equal(isDownwind(45, 200), false)
  // Melewati titik 0 derajat tidak boleh mengacaukan hasil.
  assert.equal(isDownwind(350, 20), true)
})

test('vonis zona memperhitungkan ketelitian, bukan hanya jarak', () => {
  // 4 km dari kawah dengan radius 5 km: jelas di dalam.
  assert.equal(zoneVerdict(4, 5, 50), 'di dalam')
  // 6 km dengan ketelitian 50 m: jelas di luar.
  assert.equal(zoneVerdict(6, 5, 50), 'di luar')
  // 6 km tapi ketelitian 3 km: batasnya masih mungkin terlewati, jangan
  // menyatakan aman.
  assert.equal(zoneVerdict(6, 5, 3000), 'di batas')
  assert.equal(zoneVerdict(5.1, 5, 200), 'di batas')
})

test('mutu fix dibedakan supaya posisi kasar tidak dipakai menilai batas', () => {
  assert.equal(fixQuality(12), 'baik')
  assert.equal(fixQuality(800), 'kasar')
  assert.equal(fixQuality(25_000), 'sangat kasar')
})

test('titik kumpul terdekat dipilih dari jarak sebenarnya', () => {
  const shelters = [
    { name: 'jauh', lat: -5.9, lon: 105.9 },
    { name: 'dekat', lat: -5.75, lon: 105.59 },
  ]
  const nearest = nearestTo(KALIANDA, shelters)
  assert.equal(nearest?.place.name, 'dekat')
  assert.equal(nearestTo(KALIANDA, []), null)
})
