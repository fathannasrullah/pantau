import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  airSeverity,
  ashHeadingDeg,
  compassLabel,
  newestFetchISO,
  parseLiveBundle,
  readAir,
  readBmkg,
  readEruption,
  readPopulation,
  readQuakes,
  readQuakesFrom,
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
    ashHeadingDeg: 315,
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
      radiusKm: 500,
      nearby: [
        {
          timeISO: '2026-09-06T09:30:00Z',
          magnitude: '5.1',
          area: 'Selat Sunda',
          depth: '10 km',
          potential: 'Tidak berpotensi tsunami',
          distanceKm: 40,
        },
        { magnitude: '4.2', distanceKm: 12 }, // tanpa waktu dan wilayah
        { timeISO: '2026-09-06T08:00:00Z', magnitude: '4.4', area: 'Banten' }, // tanpa jarak
      ],
    }),
  })
  const bmkg = readBmkg(live)
  assert.equal(bmkg?.nearby.length, 1)
  assert.equal(bmkg?.nearby[0]?.magnitude, '5.1')
  assert.equal(bmkg?.nearby[0]?.distanceKm, 40)
})

test('feed kosong saat tidak ada gempa di sekitar gunung', () => {
  // Lebih baik tidak menampilkan apa pun daripada gempa 2.000 km jauhnya yang
  // dikira berhubungan dengan gunung ini.
  const live = bundle({ bmkg: source({ radiusKm: 500, scanned: 16, nearby: [] }) })
  assert.equal(readBmkg(live), null)
})

test('radius sepi terbaca sebagai nol kejadian, bukan data hilang', () => {
  const live = bundle({
    quakes: source({
      hourly: new Array(24).fill(0),
      total: 0,
      total7d: 3,
      radiusKm: 300,
      largest: null,
    }),
  })
  const quakes = readQuakes(live)
  assert.equal(quakes?.total, 0)
  assert.equal(quakes?.total7d, 3)
  assert.equal(quakes?.largest, null)
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

test('catatan erupsi GVP ditolak bila tahun mulainya kosong', () => {
  const noYear = bundle({ gvp: source({ activityType: 'Confirmed Eruption', vei: 1 }) })
  assert.equal(readEruption(noYear), null)

  const live = bundle({
    gvp: source({
      activityType: 'Confirmed Eruption',
      area: 'Summit crater',
      vei: 2,
      startYear: 2026,
      startMonth: 9,
      startDay: 3,
      ongoing: true,
    }),
  })
  const e = readEruption(live)
  assert.equal(e?.startYear, 2026)
  assert.equal(e?.vei, 2)
  assert.equal(e?.ongoing, true)
})

test('kualitas udara ditolak bila SO2 atau PM10 hilang', () => {
  assert.equal(readAir(bundle({ air: source({ so2: 27.6 }) })), null)
  const live = bundle({ air: source({ so2: 27.6, pm10: 35.5, pm25: 29.3, aod: 0.85 }) })
  assert.equal(readAir(live)?.so2, 27.6)
})

test('tingkat bahaya udara mengikuti pedoman WHO', () => {
  // SO2: pedoman 24 jam 40 ug/m3.
  assert.equal(airSeverity(27.6, 40), 'safe')
  assert.equal(airSeverity(80, 40), 'watch')
  assert.equal(airSeverity(200, 40), 'alert')
})

test('grafik kegempaan bisa dibaca dari katalog mana pun', () => {
  const live = bundle({
    emsc: source({ hourly: new Array(24).fill(1), total: 24, total7d: 90, radiusKm: 333 }),
  })
  assert.equal(readQuakesFrom(live, 'emsc')?.total, 24)
  assert.equal(readQuakesFrom(live, 'quakes'), null)
})

test('perkiraan penduduk ditolak bila salah satu radius rusak', () => {
  // Angka setengah lengkap lebih menyesatkan daripada tidak ada angka.
  const rusak = bundle({
    population: source({
      year: 2020,
      rings: [{ radiusKm: 5, people: 120 }, { radiusKm: 10 }],
    }),
  })
  assert.equal(readPopulation(rusak), null)

  const live = bundle({
    population: source({
      year: 2020,
      rings: [
        { radiusKm: 30, people: 480000 },
        { radiusKm: 5, people: 120 },
      ],
    }),
  })
  const pop = readPopulation(live)
  assert.equal(pop?.year, 2020)
  // Selalu urut dari radius terkecil, apa pun urutan aslinya.
  assert.deepEqual(pop?.rings.map((r) => r.radiusKm), [5, 30])
})
