import assert from 'node:assert/strict'
import { test } from 'node:test'
import { formatFeedTime } from './format.ts'

// 7 Sep 2026 10.30 WIB
const now = '2026-09-07T03:30:00Z'

test('kejadian hari ini cukup jamnya', () => {
  assert.equal(formatFeedTime('2026-09-07T01:41:00Z', now), '08.41 WIB')
})

test('kejadian hari lain membawa tanggal', () => {
  // Tanpa ini, gempa 4 Sep terbaca seolah pagi tadi.
  assert.equal(formatFeedTime('2026-09-04T05:04:59Z', now), '4 Sep, 12.04 WIB')
})

test('tahun ikut ditulis hanya bila berbeda', () => {
  assert.equal(formatFeedTime('2025-09-07T03:30:00Z', now), '7 Sep 2025, 10.30 WIB')
  // 31 Des 2025 20.00 UTC sudah 1 Jan 2026 di WIB, jadi tahunnya sama.
  assert.equal(formatFeedTime('2025-12-31T20:00:00Z', now), '1 Jan, 03.00 WIB')
})

test('batas hari mengikuti WIB, bukan UTC', () => {
  // 06 Sep 20.00 UTC sudah 7 Sep 03.00 WIB — hari yang sama dengan `now`.
  assert.equal(formatFeedTime('2026-09-06T20:00:00Z', now), '03.00 WIB')
})
