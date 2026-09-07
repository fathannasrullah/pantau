import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  angleDelta,
  bearingDeg,
  destinationPoint,
  distanceKm,
  fixQuality,
  isDownwind,
  nearestTo,
  pointInPolygon,
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

test('titik tujuan konsisten dengan jarak dan arahnya', () => {
  // Kalau rumusnya salah, garis arah abu di peta akan menunjuk ke tempat yang
  // keliru — dan itu tidak akan terlihat sebagai galat, hanya sebagai peta
  // yang tampak masuk akal.
  const kawah = { lat: -6.102, lon: 105.423 }
  const tujuan = destinationPoint(kawah, 315, 40)
  assert.ok(Math.abs(distanceKm(kawah, tujuan) - 40) < 0.1)
  assert.ok(Math.abs(bearingDeg(kawah, tujuan) - 315) < 0.1)
})

test('bergerak ke utara menaikkan lintang, ke timur menaikkan bujur', () => {
  const asal = { lat: 0, lon: 0 }
  assert.ok(destinationPoint(asal, 0, 111).lat > 0.99)
  assert.ok(destinationPoint(asal, 90, 111).lon > 0.99)
  assert.ok(destinationPoint(asal, 180, 111).lat < -0.99)
})

test('bujur tetap dalam rentang −180..180 saat melewati antimeridian', () => {
  const dekatBatas = { lat: 0, lon: 179.5 }
  const lewat = destinationPoint(dekatBatas, 90, 200)
  assert.ok(lewat.lon >= -180 && lewat.lon <= 180)
  assert.ok(lewat.lon < 0, 'harus melompat ke bujur negatif, bukan 181')
})

test('titik di dalam dan di luar poligon dibedakan', () => {
  // Persegi sederhana; jawabannya harus jelas di kedua sisi batas.
  const kotak: [number, number][] = [
    [-6, 105],
    [-6, 106],
    [-7, 106],
    [-7, 105],
  ]
  assert.equal(pointInPolygon({ lat: -6.5, lon: 105.5 }, kotak), true)
  assert.equal(pointInPolygon({ lat: -5.5, lon: 105.5 }, kotak), false)
  assert.equal(pointInPolygon({ lat: -6.5, lon: 104.5 }, kotak), false)
  assert.equal(pointInPolygon({ lat: -6.5, lon: 106.5 }, kotak), false)
})

test('poligon cekung tidak menelan titik di teluknya', () => {
  // Bentuk L: titik di lekukannya ada di luar, walau berada dalam kotak
  // pembatasnya. Ini bedanya ray casting dengan sekadar memeriksa bounding box.
  const bentukL: [number, number][] = [
    [0, 0],
    [0, 4],
    [2, 4],
    [2, 2],
    [4, 2],
    [4, 0],
  ]
  assert.equal(pointInPolygon({ lat: 1, lon: 1 }, bentukL), true)
  assert.equal(pointInPolygon({ lat: 3, lon: 3 }, bentukL), false)
})

test('bentuk yang bukan poligon selalu menjawab di luar', () => {
  assert.equal(pointInPolygon({ lat: 0, lon: 0 }, []), false)
  assert.equal(pointInPolygon({ lat: 0, lon: 0 }, [[0, 0], [1, 1]]), false)
})
