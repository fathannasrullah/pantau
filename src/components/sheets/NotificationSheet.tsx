import { useState } from 'react'
import { NOTIFICATION_RULES } from '../../data/notificationRules'
import type { NotificationsState } from '../../hooks/useNotifications'
import { Sheet } from '../Sheet'

interface Props {
  notifications: NotificationsState
  onClose: () => void
}

export function NotificationSheet({ notifications, onClose }: Props) {
  const { permission, rules, toggleRule, request, sendTest } = notifications
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'gagal'>('idle')
  const granted = permission === 'granted'

  return (
    <Sheet
      title="Aturan notifikasi"
      note="Dibatasi supaya tidak jenuh: yang dikirim hanya perpindahan keadaan, bukan setiap kali data disegarkan."
      onClose={onClose}
    >
      {permission === 'unsupported' && (
        <div className="permbox">
          <div className="permbox__t">Peramban ini tidak mendukung notifikasi</div>
          <div className="permbox__n">
            Layar app tetap diperbarui sendiri selama dibuka. Untuk kabar
            mendesak, ikuti pengumuman resmi Badan Geologi dan BPBD.
          </div>
        </div>
      )}

      {permission === 'default' && (
        <div className="permbox">
          <div className="permbox__t">Notifikasi belum diizinkan</div>
          <div className="permbox__n">
            App perlu izin peramban sebelum bisa mengirim apa pun. Anda bisa
            mencabutnya kapan saja lewat setelan situs.
          </div>
          <button type="button" className="permbox__cta" onClick={request}>
            Izinkan notifikasi
          </button>
        </div>
      )}

      {permission === 'denied' && (
        <div className="permbox permbox--bad">
          <div className="permbox__t">Notifikasi ditolak</div>
          <div className="permbox__n">
            Izinnya diblokir untuk situs ini, dan app tidak bisa memintanya lagi
            dari sini. Buka setelan situs di peramban Anda — biasanya lewat ikon
            gembok di bilah alamat — lalu izinkan notifikasi.
          </div>
        </div>
      )}

      {granted && (
        <div className="permbox permbox--ok">
          <div className="permbox__t">Notifikasi aktif</div>
          <div className="permbox__n">
            Aturan di bawah menentukan apa yang boleh mengganggu Anda.
          </div>
          <button
            type="button"
            className="permbox__cta"
            onClick={async () => {
              setTestResult((await sendTest()) ? 'ok' : 'gagal')
            }}
          >
            {testResult === 'ok'
              ? 'Terkirim — periksa pemberitahuan perangkat'
              : testResult === 'gagal'
                ? 'Gagal mengirim, coba lagi'
                : 'Kirim pemberitahuan uji'}
          </button>
        </div>
      )}

      <div className="rules">
        {NOTIFICATION_RULES.map((rule) => {
          const on = !rule.locked && rules[rule.id]
          return (
            <button
              key={rule.id}
              type="button"
              className={`rule${rule.locked ? ' rule--locked' : ''}`}
              role="switch"
              aria-checked={on}
              aria-disabled={rule.locked || !granted || undefined}
              onClick={() => {
                if (!rule.locked) toggleRule(rule.id)
              }}
            >
              <span className="rule__body">
                <span className="rule__label">{rule.label}</span>
                <span className="rule__note">{rule.note}</span>
              </span>
              <span
                className={`switch${on ? ' switch--on' : ''}${
                  rule.locked ? ' switch--locked' : ''
                }`}
                aria-hidden="true"
              >
                <span className="switch__knob" />
              </span>
            </button>
          )
        })}
      </div>

      <div className="sheet__fallback">
        <div className="sheet__fallback-title">Batas yang perlu Anda tahu</div>
        <div className="sheet__fallback-note">
          App ini tidak punya server pengirim, jadi pemberitahuan hanya terbit
          selama halaman ini berjalan — terbuka di tab, atau app terpasang dan
          masih hidup di latar. App tidak bisa membangunkan perangkat yang
          sedang mati. Untuk keadaan mendesak, sirene, petugas BPBD, dan
          pengumuman resmi tetap saluran utamanya.
        </div>
      </div>
    </Sheet>
  )
}
