import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ashHeadingDeg,
  compassLabel,
  newestFetchISO,
  parseLiveBundle,
  readBmkg,
  readQuakes,
  readWind,
} from './live.ts'

const bundle = (sources: Record<string, unknown>) =>
  parseLiveBundle({ generatedAt: '2026-09-06T10:00:00Z', sources })

const source = (data: unknown, extra: Record<string, unknown> = {}) => ({
  ok: true,
  label: 'sumber uji',
  url: 'https://example.test',
  fetchedAt: '2026-09-06T10:00:00Z',
  observedAt: '2026-09-06T09:50:00Z',
  data,
  ...extra,
})

test('arah abu adalah kebalikan arah asal angin', () => {
  // Angin dari tenggara (135°) membawa abu ke barat laut (315°).
  assert.equal(ashHeadingDeg(135), 315)
  assert.equal(ashHeadingDeg(0), 180)
  assert.equal(ashHeadingDeg(350), 170)
  assert.equal(ashHeadingDeg(-10), 170)
})

test('label mata angin dibulatkan ke delapan penjuru', () => {
  assert.equal(compassLabel(0), 'Utara')
  assert.equal(compassLabel(315), 'Barat laut')
  assert.equal(compassLabel(359), 'Utara')
  assert.equal(compassLabel(100), 'Timur')
})

test('angin dibaca sebagai arah tujuan abu, bukan arah asal', () => {
  const live = bundle({
    wind: source({ speedKmh: 11.4, directionDeg: 135 }),
  })
  const wind = readWind(live)
  assert.deepEqual(wind, {
    speedKmh: 11,
    ashHeading: 'Barat laut',
    observedAtISO: '2026-09-06T09:50:00.000Z',
  })
})

test('sumber yang gagal tidak dipakai sebagai angka', () => {
  const live = bundle({
    wind: { ok: false, label: 'angin', fetchedAt: '2026-09-06T10:00:00Z', error: 'HTTP 503' },
  })
  assert.equal(readWind(live), null)
  assert.equal(live?.sources[0]?.ok, false)
  assert.equal(live?.sources[0]?.error, 'HTTP 503')
})

test('bentuk data yang tidak sesuai ditolak, bukan ditebak', () => {
  assert.equal(parseLiveBundle(null), null)
  assert.equal(parseLiveBundle({ sources: {} }), null)
  assert.equal(parseLiveBundle({ generatedAt: 'bukan tanggal', sources: {} }), null)
  assert.equal(readWind(bundle({ wind: source({ speedKmh: '11' }) })), null)
  // 24 ember jam wajib utuh; kurang satu berarti grafiknya salah baca.
  assert.equal(
    readQuakes(bundle({ quakes: source({ hourly: new Array(23).fill(0) }) })),
    null,
  )
})

test('histogram gempa dibaca lengkap dengan gempa terbesar', () => {
  const hourly = new Array(24).fill(0)
  hourly[23] = 2
  const live = bundle({
    quakes: source({
      hourly,
      total: 2,
      radiusKm: 300,
      largest: { mag: 4.8, place: 'Selat Sunda', timeISO: '2026-09-06T09:00:00Z' },
    }),
  })
  const quakes = readQuakes(live)
  assert.equal(quakes?.total, 2)
  assert.equal(quakes?.hourly.length, 24)
  assert.equal(quakes?.largest?.mag, 4.8)
})

test('laporan BMKG tanpa medan wajib dibuang', () => {
  const live = bundle({
    bmkg: source({
      latest: {
        timeISO: '2026-09-06T09:30:00Z',
        magnitude: '5.1',
        area: 'Selat Sunda',
        depth: '10 km',
        potential: 'Tidak berpotensi tsunami',
      },
      recent: [
        { magnitude: '4.2' }, // tanpa waktu dan wilayah — dibuang
        {
          timeISO: '2026-09-06T08:00:00Z',
          magnitude: '4.4',
          area: 'Banten',
        },
      ],
    }),
  })
  const bmkg = readBmkg(live)
  assert.equal(bmkg?.latest.magnitude, '5.1')
  assert.equal(bmkg?.recent.length, 1)
  assert.equal(bmkg?.recent[0]?.area, 'Banten')
})

test('umur data diambil dari pengambilan tersukses terbaru', () => {
  const live = bundle({
    wind: source({ speedKmh: 5, directionDeg: 0 }, { fetchedAt: '2026-09-06T09:00:00Z' }),
    bmkg: source(
      { latest: { timeISO: '2026-09-06T09:30:00Z', magnitude: '5.1', area: 'X' } },
      { fetchedAt: '2026-09-06T10:00:00Z' },
    ),
    waves: {
      ok: false,
      label: 'gelombang',
      // Sumber gagal punya stempel terbaru, tapi tidak boleh membuat data
      // terlihat lebih segar daripada kenyataannya.
      fetchedAt: '2026-09-06T11:00:00Z',
      error: 'timeout',
    },
  })
  assert.equal(newestFetchISO(live), '2026-09-06T10:00:00.000Z')
})
