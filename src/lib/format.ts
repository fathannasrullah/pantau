const WIB = 'Asia/Jakarta'

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Ags',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: WIB,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

interface WibParts {
  day: number
  month: number
  year: number
  hour: string
  minute: string
}

function wibParts(iso: string): WibParts {
  const parts = partsFormatter.formatToParts(new Date(iso))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return {
    day: Number(get('day')),
    month: Number(get('month')),
    year: Number(get('year')),
    hour: get('hour') === '24' ? '00' : get('hour'),
    minute: get('minute'),
  }
}

/** "09.42" */
export function formatClock(iso: string): string {
  const p = wibParts(iso)
  return `${p.hour}.${p.minute}`
}

/** "09.42 WIB" */
export function formatTime(iso: string): string {
  return `${formatClock(iso)} WIB`
}

/** "3 Sep 2026" */
export function formatDate(iso: string): string {
  const p = wibParts(iso)
  return `${p.day} ${MONTHS_SHORT[p.month - 1]} ${p.year}`
}

/** "3 Sep 2026, 09.20 WIB" */
export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`
}

/** "47 menit", "1 jam 20 menit" — the wording the copy is written around. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} menit`
  const hours = Math.floor(m / 60)
  const rest = m % 60
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`
}

/** "baru saja", "47 menit lalu" */
export function formatAge(minutes: number): string {
  return minutes < 2 ? 'baru saja' : `${formatDuration(minutes)} lalu`
}

export function minutesBetween(fromISO: string, toISO: string): number {
  return (new Date(toISO).getTime() - new Date(fromISO).getTime()) / 60000
}

/** Indonesian thousands separator: 1200 -> "1.200" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

/** Indonesian decimal comma: 3.1 -> "3,1" */
export function formatDecimal(value: number, digits = 1): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value)
}
