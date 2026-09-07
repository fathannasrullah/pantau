import assert from 'node:assert/strict'
import { test } from 'node:test'
import { EMPTY_REGION, REGION_SAMPLES } from './regions.ts'
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

test('isi wilayah tidak bocor antar gunung', () => {
  // Menampilkan posko Kalianda saat memantau Semeru bisa mengarahkan orang ke
  // tempat yang salah, jadi gunung tanpa data wilayah harus benar-benar kosong.
  for (const v of VOLCANOES) {
    const region = REGION_SAMPLES[v.id] ?? EMPTY_REGION
    if (v.id === 'krakatau') {
      assert.ok(region.shelters.length > 0)
      continue
    }
    assert.equal(region.shelters.length, 0, `${v.id} punya titik kumpul contoh`)
    assert.equal(region.impacts.length, 0, `${v.id} punya dampak contoh`)
    assert.equal(region.villages.length, 0, `${v.id} punya daftar desa contoh`)
  }
})

test('hanya gunung berbahaya pesisir yang punya titik perairan', () => {
  for (const v of VOLCANOES) {
    assert.equal(v.coastalHazard, v.strait !== null, `${v.id} tidak konsisten`)
  }
})
