#!/usr/bin/env node
/**
 * Menguji calon sumber untuk bagian yang belum tersambung: level status resmi,
 * kegempaan vulkanik, tinggi kolom abu, dan dampak wilayah.
 *
 * Ini alat pemeriksaan, bukan bagian dari build. Alasannya: menyatakan sebuah
 * endpoint "tidak publik" tanpa pernah memanggilnya hanyalah tebakan, dan
 * tebakan itu yang menentukan fitur mana yang tidak dikerjakan.
 *
 * Hasilnya diterbitkan sebagai annotation supaya bisa dibaca lewat API tanpa
 * membuka log: status HTTP, tipe isi, header CORS, dan cuplikan awal respons.
 */

const TIMEOUT_MS = 25_000
const VOLCANO = { lat: -6.102, lon: 105.423 }

/**
 * Sebagian respons terlalu besar untuk dibaca lewat cuplikan awal — daftar layer
 * WFS misalnya, yang nama-namanya terkubur di balik preamble XML. Untuk itu
 * cuplikannya diganti ringkasan yang menjawab pertanyaannya langsung.
 */
const extractLayerNames = (body) => {
  const names = [...body.matchAll(/<Name>([^<]*GVP[^<]*)<\/Name>/g)].map(
    (m) => m[1],
  )
  return names.length ? `layer: ${names.join(', ')}` : '(tidak ada nama layer)'
}

const extractArcgis = (body) => {
  try {
    const parsed = JSON.parse(body)
    const folders = parsed.folders ?? []
    const services = (parsed.services ?? []).map((s) => s.name)
    return `folders: ${folders.join(', ') || '-'} | services: ${services.slice(0, 12).join(', ') || '-'}`
  } catch {
    return null
  }
}

const TARGETS = [
  // --- Kualitas udara: SO2 penanda degassing, PM10 penanda abu ---
  [
    'openmeteo-air',
    'https://air-quality-api.open-meteo.com/v1/air-quality' +
      `?latitude=${VOLCANO.lat}&longitude=${VOLCANO.lon}` +
      '&current=sulphur_dioxide,pm10,pm2_5,dust,aerosol_optical_depth',
  ],

  // --- Daftar layer GVP: mencari layar laporan mingguan, bukan katalog erupsi ---
  [
    'gvp-capabilities',
    'https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=2.0.0&request=GetCapabilities',
    extractLayerNames,
  ],

  // --- Gempa versi Eropa, pembanding independen untuk USGS ---
  [
    'emsc',
    'https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=2' +
      `&lat=${VOLCANO.lat}&lon=${VOLCANO.lon}&maxradius=3`,
  ],

  // --- Stasiun seismik terbuka di sekitar gunung ---
  [
    'iris-stations',
    'https://service.iris.edu/fdsnws/station/1/query?format=text&level=station' +
      `&latitude=${VOLCANO.lat}&longitude=${VOLCANO.lon}&maxradius=2`,
  ],

  // --- Laporan bencana resmi terkurasi PBB ---
  [
    'reliefweb',
    'https://api.reliefweb.int/v1/disasters?appname=pantau-gunung&limit=2' +
      '&filter[field]=country&filter[value]=Indonesia&profile=list',
  ],

  // --- Titik panas termal: butuh kunci gratis atau tidak? ---
  [
    'nasa-firms',
    'https://firms.modaps.eosdis.nasa.gov/api/area/csv/YOUR_KEY/VIIRS_SNPP_NRT/105,-7,106,-5/1',
  ],

  // --- Jalur pemerintah Indonesia yang belum dicoba: ArcGIS biasanya terbuka ---
  ['bnpb-arcgis', 'https://gis.bnpb.go.id/arcgis/rest/services?f=json', extractArcgis],
  [
    'inarisk-arcgis',
    'https://inarisk.bnpb.go.id/arcgis/rest/services?f=json',
    extractArcgis,
  ],
]

function encodeAnnotation(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

async function probe(url, extract) {
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
      body: (extract && extract(body)) || body.slice(0, 700),
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
for (const [id, url, extract] of TARGETS) {
  const r = await probe(url, extract)
  results.push([id, url, r])
  console.log(`${r.status.padEnd(24)} ${id}`)
}

// Annotation dibatasi jumlahnya oleh GitHub, jadi hasilnya dikelompokkan.
const CHUNK = 2
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
