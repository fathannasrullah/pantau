import assert from 'node:assert/strict'
import { test } from 'node:test'
import { detectAlerts, EMPTY_MEMORY, type AlertInput } from './alerts.ts'
import type { NotificationRuleId } from '../types.ts'

const ALL_ON: Record<NotificationRuleId, boolean> = {
  evac: true,
  level: true,
  ash: true,
  quake: true,
}

const input = (over: Partial<AlertInput> = {}): AlertInput => ({
  volcanoName: 'Anak Krakatau',
  aviation: 'clear',
  aviationHeadline: 'Tidak ada peringatan abu vulkanik aktif.',
  aqi: 40,
  newestQuake: null,
  ...over,
})

test('kunjungan pertama tidak menerbitkan pemberitahuan apa pun', () => {
  // Tanpa pembanding, semua terlihat seperti perubahan. Membanjiri orang
  // dengan kabar lama adalah cara tercepat membuat notifikasi diabaikan.
  const r = detectAlerts(
    input({ aviation: 'active', aqi: 180, newestQuake: {
      timeISO: '2026-09-07T10:00:00Z', magnitude: '4,1', area: 'Selat Sunda', distanceKm: 30,
    } }),
    EMPTY_MEMORY,
    ALL_ON,
  )
  assert.deepEqual(r.alerts, [])
  // Tapi keadaannya tetap dicatat, supaya perubahan berikutnya terdeteksi.
  assert.equal(r.memory.aviation, 'active')
  assert.equal(r.memory.newestQuakeISO, '2026-09-07T10:00:00Z')
})

test('keadaan yang sama tidak diberitahukan dua kali', () => {
  const memory = { aviation: 'active' as const, aqiBandMax: 50, newestQuakeISO: null }
  const r = detectAlerts(input({ aviation: 'active', aqi: 40 }), memory, ALL_ON)
  assert.deepEqual(r.alerts, [])
})

test('peringatan abu yang naik menerbitkan kabar mendesak', () => {
  const memory = { aviation: 'clear' as const, aqiBandMax: null, newestQuakeISO: null }
  const r = detectAlerts(
    input({ aviation: 'active', aviationHeadline: 'Ada peringatan abu.' }),
    memory,
    ALL_ON,
  )
  assert.equal(r.alerts.length, 1)
  assert.equal(r.alerts[0]?.rule, 'level')
  assert.equal(r.alerts[0]?.urgent, true)
  assert.match(r.alerts[0]?.title ?? '', /naik/)
})

test('peringatan abu yang berakhir tetap dikabarkan, tapi tidak mendesak', () => {
  const memory = { aviation: 'active' as const, aqiBandMax: null, newestQuakeISO: null }
  const r = detectAlerts(input({ aviation: 'clear' }), memory, ALL_ON)
  assert.equal(r.alerts[0]?.urgent, false)
  assert.match(r.alerts[0]?.title ?? '', /turun/)
})

test('sumber yang gagal terbaca bukan kabar', () => {
  // "Belum diketahui" hanya berarti sumbernya sedang tidak terbaca.
  // Membangunkan orang untuk itu tidak ada gunanya, ke arah mana pun.
  const dari = detectAlerts(
    input({ aviation: 'unknown' }),
    { aviation: 'active', aqiBandMax: null, newestQuakeISO: null },
    ALL_ON,
  )
  assert.deepEqual(dari.alerts, [])
  const ke = detectAlerts(
    input({ aviation: 'active' }),
    { aviation: 'unknown', aqiBandMax: null, newestQuakeISO: null },
    ALL_ON,
  )
  assert.deepEqual(ke.alerts, [])
})

test('hanya udara yang memburuk yang mengganggu', () => {
  const memory = { aviation: 'clear' as const, aqiBandMax: 50, newestQuakeISO: null }
  const buruk = detectAlerts(input({ aqi: 138 }), memory, ALL_ON)
  assert.equal(buruk.alerts.length, 1)
  assert.equal(buruk.alerts[0]?.rule, 'ash')

  const membaik = detectAlerts(
    input({ aqi: 30 }),
    { ...memory, aqiBandMax: 150 },
    ALL_ON,
  )
  assert.deepEqual(membaik.alerts, [])
})

test('gempa lama tidak diberitahukan ulang', () => {
  const memory = {
    aviation: 'clear' as const,
    aqiBandMax: null,
    newestQuakeISO: '2026-09-07T10:00:00Z',
  }
  const quake = {
    timeISO: '2026-09-07T10:00:00Z',
    magnitude: '4,1',
    area: 'Selat Sunda',
    distanceKm: 30,
  }
  assert.deepEqual(detectAlerts(input({ newestQuake: quake }), memory, ALL_ON).alerts, [])

  const baru = detectAlerts(
    input({ newestQuake: { ...quake, timeISO: '2026-09-07T11:30:00Z' } }),
    memory,
    ALL_ON,
  )
  assert.equal(baru.alerts.length, 1)
  assert.equal(baru.alerts[0]?.rule, 'quake')
})

test('aturan yang dimatikan tidak menerbitkan apa pun', () => {
  const memory = { aviation: 'clear' as const, aqiBandMax: 50, newestQuakeISO: '2026-09-07T09:00:00Z' }
  const off: Record<NotificationRuleId, boolean> = {
    evac: true, level: false, ash: false, quake: false,
  }
  const r = detectAlerts(
    input({
      aviation: 'active',
      aqi: 180,
      newestQuake: {
        timeISO: '2026-09-07T12:00:00Z', magnitude: '5,0', area: 'Selat Sunda', distanceKm: 12,
      },
    }),
    memory,
    off,
  )
  assert.deepEqual(r.alerts, [])
  // Ingatan tetap diperbarui walau tidak ada yang dikirim, supaya menyalakan
  // aturan nanti tidak langsung memuntahkan kabar yang sudah lewat.
  assert.equal(r.memory.aviation, 'active')
  assert.equal(r.memory.newestQuakeISO, '2026-09-07T12:00:00Z')
})
