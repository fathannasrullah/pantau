import assert from 'node:assert/strict'
import { test } from 'node:test'
import { selectNearbyQuakes } from './useLiveQuakes.ts'

const KRAKATAU = { lat: -6.1009, lon: 105.4233 }
const now = Date.now()

const feature = (
  id: string,
  lon: number,
  lat: number,
  props: Record<string, unknown> = {},
) => ({
  type: 'Feature',
  id,
  geometry: { type: 'Point', coordinates: [lon, lat, 42] },
  properties: {
    mag: 5,
    place: 'suatu tempat',
    time: now,
    url: `https://earthquake.usgs.gov/eventpage/${id}`,
    ...props,
  },
})

test('hanya gempa di sekitar gunung yang dipilih', () => {
  const raw = {
    features: [
      feature('dekat', 105.9, -6.4),
      // Halmahera, ribuan km jauhnya — tidak boleh dikira berhubungan.
      feature('jauh', 127.9, 1.7),
    ],
  }
  const picked = selectNearbyQuakes(raw, KRAKATAU)
  assert.equal(picked.length, 1)
  assert.equal(picked[0]?.id, 'dekat')
  assert.ok(picked[0]!.distanceKm > 0 && picked[0]!.distanceKm < 200)
})

test('kejadian tanpa medan wajib dibuang, bukan ditebak', () => {
  const raw = {
    features: [
      { type: 'Feature', id: 'tanpa-geometry', properties: { mag: 5, time: now, url: 'x' } },
      feature('tanpa-mag', 105.9, -6.4, { mag: null }),
      feature('tanpa-url', 105.9, -6.4, { url: null }),
    ],
  }
  assert.deepEqual(selectNearbyQuakes(raw, KRAKATAU), [])
})

test('bentuk feed yang tidak dikenali menghasilkan daftar kosong', () => {
  assert.deepEqual(selectNearbyQuakes(null, KRAKATAU), [])
  assert.deepEqual(selectNearbyQuakes({ features: 'bukan array' }, KRAKATAU), [])
})

test('penanda tsunami dan PAGER dibaca apa adanya', () => {
  const raw = {
    features: [feature('a', 105.9, -6.4, { tsunami: 1, alert: 'yellow', felt: 340 })],
  }
  const [q] = selectNearbyQuakes(raw, KRAKATAU)
  assert.equal(q?.tsunami, true)
  assert.equal(q?.alert, 'yellow')
  assert.equal(q?.felt, 340)
})

test('urut dari yang terbaru', () => {
  const raw = {
    features: [
      feature('lama', 105.9, -6.4, { time: now - 7200e3 }),
      feature('baru', 105.9, -6.4, { time: now }),
    ],
  }
  assert.deepEqual(
    selectNearbyQuakes(raw, KRAKATAU).map((q) => q.id),
    ['baru', 'lama'],
  )
})
