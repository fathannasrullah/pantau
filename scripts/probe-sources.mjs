#!/usr/bin/env node
/**
 * Menguji calon sumber untuk dua bagian yang belum tersambung: level status
 * (PVMBG/MAGMA) dan kegempaan vulkanik beserta tinggi kolom abu.
 *
 * Ini alat pemeriksaan, bukan bagian dari build. Alasannya: menyatakan sebuah
 * endpoint "tidak publik" tanpa pernah memanggilnya hanyalah tebakan, dan
 * tebakan itu yang menentukan fitur mana yang tidak dikerjakan.
 *
 * Hasilnya diterbitkan sebagai annotation supaya bisa dibaca lewat API tanpa
 * membuka log: status HTTP, tipe isi, header CORS, dan cuplikan awal respons.
 */

const TIMEOUT_MS = 25_000

const TARGETS = [
  // --- MAGMA Indonesia / PVMBG: satu-satunya sumber sah untuk level status ---
  ['magma-root', 'https://magma.esdm.go.id/'],
  ['magma-api-evaluasi', 'https://magma.esdm.go.id/api/v1/magma-var/evaluasi'],
  ['magma-api-vona', 'https://magma.esdm.go.id/api/v1/home/vona'],
  [
    'magma-tingkat-aktivitas',
    'https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas',
  ],
  ['magma-api-gunungapi', 'https://magma.esdm.go.id/api/v1/gunung-api'],

  // --- Smithsonian GVP: status erupsi global, bukan level resmi Indonesia ---
  [
    'gvp-wfs',
    'https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes&outputFormat=application/json&count=1',
  ],
  ['gvp-weekly-rss', 'https://volcano.si.edu/news/WeeklyVolcanoRSS.xml'],

  // --- Tinggi kolom abu untuk penerbangan ---
  ['vaac-darwin', 'http://www.bom.gov.au/aviation/volcanic-ash/'],

  // --- Kejadian bencana global, kadang memuat erupsi ---
  [
    'gdacs-volcano',
    'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=VO',
  ],
]

function encodeAnnotation(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

async function probe(url) {
  const started = Date.now()
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'follow',
      headers: {
        // Beberapa situs pemerintah menolak klien tanpa User-Agent browser.
        'user-agent':
          'Mozilla/5.0 (compatible; PantauGunung/1.0; +https://github.com/fathannasrullah/pantau)',
        accept: 'application/json, text/html;q=0.9, */*;q=0.8',
      },
    })
    const body = (await res.text()).replace(/\s+/g, ' ').trim()
    return {
      status: `${res.status} ${res.statusText}`,
      type: res.headers.get('content-type') ?? '(tanpa content-type)',
      cors: res.headers.get('access-control-allow-origin') ?? 'tidak ada',
      ms: Date.now() - started,
      body: body.slice(0, 260),
      bytes: body.length,
    }
  } catch (err) {
    return {
      status: 'GAGAL',
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
      ms: Date.now() - started,
    }
  }
}

const results = []
for (const [id, url] of TARGETS) {
  const r = await probe(url)
  results.push([id, url, r])
  console.log(`${r.status.padEnd(24)} ${id}`)
}

// Annotation dibatasi jumlahnya oleh GitHub, jadi hasilnya dikelompokkan.
const CHUNK = 3
for (let i = 0; i < results.length; i += CHUNK) {
  const lines = results.slice(i, i + CHUNK).map(([id, url, r]) => {
    const head = `${id} -> ${r.status} (${r.ms} ms)`
    if (r.error) return `${head}\n  ${r.error}\n  url=${url}`
    return [
      head,
      `  type=${r.type}`,
      `  CORS=${r.cors}`,
      `  bytes=${r.bytes}`,
      `  body=${r.body}`,
    ].join('\n')
  })
  console.log(
    `::notice title=probe-${i / CHUNK + 1}::${encodeAnnotation(lines.join('\n\n'))}`,
  )
}
