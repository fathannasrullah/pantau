import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LEVELS } from './levels.ts'
import { EMERGENCY_CONTACTS, EMPTY_REGION, REGION_SAMPLES } from './regions.ts'
import { DEFAULT_VOLCANO_ID, findVolcano, VOLCANOES } from './volcanoes.ts'

test('registri lengkap dan tanpa id ganda', () => {
  assert.equal(VOLCANOES.length, 7)
  assert.equal(new Set(VOLCANOES.map((v) => v.id)).size, 7)
  assert.equal(new Set(VOLCANOES.map((v) => v.gvpNumber)).size, 7)
})

test('koordinat masuk akal untuk wilayah Indonesia', () => {
  for (const v of VOLCANOES) {
    assert.ok(v.lat > -11 && v.lat < 6, `${v.id} lintang ${v.lat}`)
    assert.ok(v.lon > 95 && v.lon < 141, `${v.id} bujur ${v.lon}`)
    assert.ok(v.elevationM > 0 && v.elevationM < 4000, `${v.id} ${v.elevationM} m`)
  }
})

test('gunung tak dikenal jatuh ke default, bukan undefined', () => {
  assert.equal(findVolcano('tidak-ada').id, DEFAULT_VOLCANO_ID)
  assert.equal(findVolcano(null).id, DEFAULT_VOLCANO_ID)
  assert.equal(findVolcano('semeru').id, 'semeru')
})

test('tidak ada isi wilayah karangan untuk gunung mana pun', () => {
  // Dampak, titik kumpul, transportasi, dan daftar desa hanya boleh datang dari
  // BPBD. Selama belum tersambung, layar harus kosong dengan keterangan — bukan
  // diisi contoh yang terbaca seperti laporan sungguhan.
  for (const v of VOLCANOES) {
    const region = REGION_SAMPLES[v.id] ?? EMPTY_REGION
    assert.equal(region.shelters.length, 0, `${v.id} punya titik kumpul karangan`)
    assert.equal(region.impacts.length, 0, `${v.id} punya dampak karangan`)
    assert.equal(region.villages.length, 0, `${v.id} punya daftar desa karangan`)
    assert.equal(region.transport.length, 0, `${v.id} punya transportasi karangan`)
  }
})

test('kontak darurat hanya nomor yang berlaku nasional', () => {
  // Nomor posko per kabupaten yang salah saat keadaan darurat lebih buruk
  // daripada tidak ada nomor sama sekali.
  assert.equal(EMERGENCY_CONTACTS.length, 1)
  assert.equal(EMERGENCY_CONTACTS[0]?.tel, '112')
})

test('teks level menjelaskan arti, bukan mengklaim pengamatan', () => {
  for (const level of Object.values(LEVELS)) {
    // Tanggal penetapan level hanya PVMBG yang tahu.
    assert.equal(level.sinceISO, null, `${level.id} memuat tanggal karangan`)
    const copy = `${level.headline} ${level.plain} ${level.strip}`
    for (const forbidden of ['Kalianda', 'Rajabasa', 'Sebesi', 'Anyer', '1.200']) {
      assert.ok(
        !copy.includes(forbidden),
        `${level.id} menyebut "${forbidden}" seolah pengamatan sungguhan`,
      )
    }
  }
})

test('hanya gunung berbahaya pesisir yang punya titik perairan', () => {
  for (const v of VOLCANOES) {
    assert.equal(v.coastalHazard, v.strait !== null, `${v.id} tidak konsisten`)
  }
})
