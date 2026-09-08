import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseVisitCount, visitBeaconUrl, visitTotalUrl } from './visits.ts'

test('tanpa kode situs, tidak ada permintaan yang dibuat', () => {
  // Ini yang menjaga app tetap bersih selama penghitungnya belum disetel:
  // tidak ada satu pun permintaan keluar dari peramban pengunjung.
  assert.equal(
    visitBeaconUrl('', { path: '/', title: 'x', referrer: '', rnd: '1' }),
    null,
  )
  assert.equal(visitTotalUrl(''), null)
})

test('kunjungan dikirim ke endpoint dan jalur yang benar', () => {
  const url = visitBeaconUrl('pantau', {
    path: '/',
    title: 'Pantau Gunung',
    referrer: 'https://google.com/',
    rnd: 'abc',
  })
  assert.ok(url)
  const u = new URL(url)
  assert.equal(u.origin, 'https://pantau.goatcounter.com')
  assert.equal(u.pathname, '/count')
  assert.equal(u.searchParams.get('p'), '/')
  assert.equal(u.searchParams.get('t'), 'Pantau Gunung')
  assert.equal(u.searchParams.get('r'), 'https://google.com/')
  assert.equal(u.searchParams.get('rnd'), 'abc')
})

test('rujukan kosong tidak ikut dikirim', () => {
  const url = visitBeaconUrl('pantau', {
    path: '/',
    title: 'x',
    referrer: '',
    rnd: 'abc',
  })
  assert.ok(url)
  assert.equal(new URL(url).searchParams.has('r'), false)
})

test('angka total diambil dari jalur TOTAL', () => {
  assert.equal(
    visitTotalUrl('pantau'),
    'https://pantau.goatcounter.com/counter/TOTAL.json',
  )
})

test('angka berpemisah ribuan dikembalikan jadi bilangan', () => {
  // GoatCounter mengirimnya sudah terformat gaya Inggris.
  assert.equal(parseVisitCount({ count: '1,234' }), 1234)
  assert.equal(parseVisitCount({ count: '7' }), 7)
  assert.equal(parseVisitCount({ count: 42 }), 42)
})

test('bentuk yang tidak dikenali menjawab kosong, bukan nol', () => {
  // Nol adalah angka; "tidak tahu" bukan. Layar harus bisa membedakannya.
  assert.equal(parseVisitCount(null), null)
  assert.equal(parseVisitCount({}), null)
  assert.equal(parseVisitCount({ count: '' }), null)
  assert.equal(parseVisitCount({ count: 'entah' }), null)
  assert.equal(parseVisitCount('1234'), null)
})
