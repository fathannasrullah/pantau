import { aqiBand } from './aqi.ts'
import type { AviationStateId } from './aviation.ts'
import type { NotificationRuleId } from '../types.ts'

/**
 * Apa yang terakhir kali sudah diberitahukan untuk satu gunung. Disimpan supaya
 * pemberitahuan yang sama tidak terbit berulang setiap kali data disegarkan.
 */
export interface AlertMemory {
  aviation: AviationStateId | null
  /** Batas atas kategori AQI, bukan angkanya — hanya perpindahan kategori yang penting. */
  aqiBandMax: number | null
  /** Waktu gempa terbaru yang sudah pernah diberitahukan. */
  newestQuakeISO: string | null
}

export const EMPTY_MEMORY: AlertMemory = {
  aviation: null,
  aqiBandMax: null,
  newestQuakeISO: null,
}

export interface AlertInput {
  volcanoName: string
  aviation: AviationStateId
  aviationHeadline: string
  aqi: number | null
  /** Gempa terdekat yang baru masuk, bila ada. */
  newestQuake: {
    timeISO: string
    magnitude: string
    area: string
    distanceKm: number
  } | null
}

export interface Alert {
  rule: NotificationRuleId
  title: string
  body: string
  tag: string
  urgent: boolean
}

export interface AlertResult {
  alerts: Alert[]
  memory: AlertMemory
}

/** Urutan keparahan, supaya "membaik" bisa dibedakan dari "memburuk". */
const AVIATION_RANK: Record<AviationStateId, number> = {
  unknown: 0,
  clear: 1,
  nearby: 2,
  active: 3,
}

/**
 * Bandingkan keadaan sekarang dengan yang terakhir diberitahukan, lalu putuskan
 * pemberitahuan apa yang pantas terbit.
 *
 * Dua aturan yang dipegang:
 *
 * 1. Kunjungan pertama tidak menerbitkan apa pun. Tanpa pembanding, semuanya
 *    terlihat seperti "perubahan", dan pengguna akan dibanjiri kabar lama.
 * 2. Keadaan yang sama tidak diberitahukan dua kali. Yang memicu adalah
 *    perpindahan keadaan, bukan keadaan itu sendiri.
 */
export function detectAlerts(
  input: AlertInput,
  memory: AlertMemory,
  rules: Record<NotificationRuleId, boolean>,
): AlertResult {
  const alerts: Alert[] = []
  const band = input.aqi === null ? null : aqiBand(input.aqi)
  const next: AlertMemory = {
    aviation: input.aviation,
    aqiBandMax: band?.max ?? memory.aqiBandMax,
    newestQuakeISO: input.newestQuake?.timeISO ?? memory.newestQuakeISO,
  }

  // Keadaan "belum diketahui" bukan kabar; itu hanya berarti sumbernya sedang
  // tidak terbaca, dan membangunkan orang untuk itu tidak ada gunanya.
  const aviationChanged =
    memory.aviation !== null &&
    memory.aviation !== input.aviation &&
    input.aviation !== 'unknown' &&
    memory.aviation !== 'unknown'

  if (rules.level && aviationChanged) {
    const naik = AVIATION_RANK[input.aviation] > AVIATION_RANK[memory.aviation!]
    alerts.push({
      rule: 'level',
      title: naik
        ? `Peringatan abu naik · ${input.volcanoName}`
        : `Peringatan abu turun · ${input.volcanoName}`,
      body: input.aviationHeadline,
      tag: `abu-${input.volcanoName}`,
      urgent: input.aviation === 'active',
    })
  }

  // Hanya kualitas udara yang memburuk yang layak mengganggu. Kabar bahwa udara
  // membaik boleh menunggu sampai orang membuka app.
  if (
    rules.ash &&
    band !== null &&
    memory.aqiBandMax !== null &&
    band.max > memory.aqiBandMax
  ) {
    alerts.push({
      rule: 'ash',
      title: `Kualitas udara memburuk · ${band.label}`,
      body: `AQI ${input.aqi} di sekitar kawah ${input.volcanoName}. ${band.advice}`,
      tag: `udara-${input.volcanoName}`,
      urgent: false,
    })
  }

  if (
    rules.quake &&
    input.newestQuake &&
    memory.newestQuakeISO !== null &&
    input.newestQuake.timeISO > memory.newestQuakeISO
  ) {
    const q = input.newestQuake
    alerts.push({
      rule: 'quake',
      title: `Gempa M ${q.magnitude} · ${q.distanceKm} km dari kawah`,
      body: `${q.area}. Dekat ${input.volcanoName}.`,
      tag: `gempa-${input.volcanoName}`,
      urgent: false,
    })
  }

  return { alerts, memory: next }
}
