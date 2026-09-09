import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  normalizeSiteCode,
  parseVisitCount,
  visitBeaconUrl,
  visitTotalUrl,
} from './visits.ts'

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

test('kode situs disaring dari bentuk apa pun yang diisikan', () => {
  assert.equal(normalizeSiteCode('fathan'), 'fathan')
  assert.equal(normalizeSiteCode('  fathan  '), 'fathan')
  assert.equal(normalizeSiteCode('fathan.goatcounter.com'), 'fathan')
  assert.equal(normalizeSiteCode('https://fathan.goatcounter.com/count'), 'fathan')
})

test('potongan script yang disalin dari GoatCounter tetap terbaca', () => {
  // Ini yang benar-benar terjadi: seluruh potongan <script> terisi apa adanya
  // ke repository variable, dan app menyusun URL omong kosong tanpa satu pun
  // tanda kesalahan di mana pun.
  const disalin =
    '<script data-goatcounter="https://fathan.goatcounter.com/count"\n' +
    '        async src="//gc.zgo.at/count.js"></script>'
  assert.equal(normalizeSiteCode(disalin), 'fathan')
  const url = visitBeaconUrl(normalizeSiteCode(disalin), {
    path: '/',
    title: 'x',
    referrer: '',
    rnd: '1',
  })
  assert.ok(url)
  assert.equal(new URL(url).origin, 'https://fathan.goatcounter.com')
})

test('nilai yang bukan kode sah mematikan penghitung, bukan bikin URL ngawur', () => {
  assert.equal(normalizeSiteCode(''), '')
  assert.equal(normalizeSiteCode('   '), '')
  assert.equal(normalizeSiteCode('kode situs saya'), '')
  assert.equal(normalizeSiteCode('https://contoh.lain/count'), '')
  assert.equal(normalizeSiteCode('a'.repeat(64)), '')
  // Dan yang kosong itu memang berarti tidak ada permintaan sama sekali.
  assert.equal(
    visitBeaconUrl(normalizeSiteCode('kode situs saya'), {
      path: '/',
      title: 'x',
      referrer: '',
      rnd: '1',
    }),
    null,
  )
})
