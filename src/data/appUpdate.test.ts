import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decideUpdateAction, shouldCheckForUpdate } from './appUpdate.ts'

test('tanpa versi baru tidak ada yang dikerjakan', () => {
  assert.equal(decideUpdateAction({ ready: false, visible: true }), 'idle')
  assert.equal(decideUpdateAction({ ready: false, visible: false }), 'idle')
})

test('versi baru dipasang diam-diam saat halaman tidak dilihat', () => {
  assert.equal(decideUpdateAction({ ready: true, visible: false }), 'apply')
})

test('saat sedang dibaca, versi baru hanya ditawarkan', () => {
  // Memuat ulang sendiri di tengah orang membaca peringatan abu adalah
  // kehilangan konteks, bukan pembaruan.
  assert.equal(decideUpdateAction({ ready: true, visible: true }), 'offer')
})

test('pemeriksaan versi hanya saat dilihat dan ada jaringan', () => {
  assert.equal(shouldCheckForUpdate({ visible: true, online: true }), true)
  assert.equal(shouldCheckForUpdate({ visible: false, online: true }), false)
  assert.equal(shouldCheckForUpdate({ visible: true, online: false }), false)
  assert.equal(shouldCheckForUpdate({ visible: false, online: false }), false)
})
