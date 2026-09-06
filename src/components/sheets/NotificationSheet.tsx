import { NOTIFICATION_RULES } from '../../data/notificationRules'
import type { NotificationRuleId } from '../../types'
import { Sheet } from '../Sheet'

interface Props {
  rules: Record<NotificationRuleId, boolean>
  onToggle: (id: NotificationRuleId) => void
  onClose: () => void
}

export function NotificationSheet({ rules, onToggle, onClose }: Props) {
  return (
    <Sheet
      title="Aturan notifikasi"
      note="Dibatasi supaya tidak jenuh: erupsi kecil yang berulang tidak dikirim satu per satu."
      onClose={onClose}
    >
      <div className="rules">
        {NOTIFICATION_RULES.map((rule) => {
          const on = rule.locked || rules[rule.id]
          return (
            <button
              key={rule.id}
              type="button"
              className={`rule${rule.locked ? ' rule--locked' : ''}`}
              role="switch"
              aria-checked={on}
              aria-disabled={rule.locked || undefined}
              onClick={() => {
                if (!rule.locked) onToggle(rule.id)
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
        <div className="sheet__fallback-title">Cadangan saat sinyal lemah</div>
        <div className="sheet__fallback-note">
          Perintah evakuasi juga dikirim lewat SMS, tanpa perlu internet. Data
          lain dimuat dalam mode hemat.
        </div>
      </div>
    </Sheet>
  )
}
