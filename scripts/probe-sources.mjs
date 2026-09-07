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

/** Nama field sebuah layer WFS, untuk tahu kenapa penyaringan ditolak. */
const extractSchemaFields = (body) => {
  const names = [...body.matchAll(/element name="([^"]+)"/g)].map((m) => m[1])
  return names.length ? `field: ${names.slice(0, 30).join(', ')}` : null
}

/** Metadata gunung dari katalog Smithsonian, untuk mengisi registri app. */
const extractVolcanoes = (body) => {
  try {
    const parsed = JSON.parse(body)
    return (parsed.features ?? [])
      .map((f) => {
        const p = f.properties ?? {}
        const [lon, lat] = f.geometry?.coordinates ?? []
        return `${p.Volcano_Number} ${p.Volcano_Name} | ${lat}, ${lon} | ${p.Elevation} m | ${p.Country}`
      })
      .join('\n  ')
  } catch {
    return null
  }
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

/**
 * Putaran keempat: memperbaiki kegagalan yang jelas bisa diperbaiki. ReliefWeb
 * menyebut v1 sudah dipensiunkan, IRIS tampaknya berpindah domain, dan daftar
 * layer GVP menunjukkan ada layer emisi yang belum diperiksa.
 */
/**
 * Putaran keenam: mencari sumber sah untuk dampak wilayah, titik kumpul, dan
 * jalur evakuasi — tiga hal yang sampai sekarang masih data karangan di app.
 */
/**
 * Putaran ketujuh: mencari sumber tingkat nasional, supaya layar tidak
 * bergantung sepenuhnya pada data daerah yang belum ada API-nya.
 */
/** Lingkaran kasar di sekitar titik, untuk meminta hitungan penduduk. */
function circleGeoJson(lat, lon, km, points = 16) {
  const coords = []
  for (let i = 0; i <= points; i += 1) {
    const angle = (i / points) * 2 * Math.PI
    const dLat = (km / 111.32) * Math.cos(angle)
    const dLon = ((km / 111.32) * Math.sin(angle)) / Math.cos((lat * Math.PI) / 180)
    coords.push([lon + dLon, lat + dLat])
  }
  return { type: 'Polygon', coordinates: [coords] }
}

/**
 * WorldPop menghitung secara asinkron: permintaan pertama mengembalikan taskid,
 * hasilnya diambil dari endpoint tugas. Alur itu perlu dibuktikan dulu sebelum
 * dipakai di pengambilan rutin.
 */
async function worldpopFlow() {
  const geo = encodeURIComponent(JSON.stringify(circleGeoJson(-6.1009, 105.4233, 10)))
  const start = await fetch(
    `https://api.worldpop.org/v1/services/stats?dataset=wpgppop&year=2020&geojson=${geo}&runasync=false`,
    { signal: AbortSignal.timeout(TIMEOUT_MS) },
  )
  const first = await start.json()
  if (first?.status === 'finished' || first?.data?.total_population !== undefined) {
    return `langsung selesai: ${JSON.stringify(first).slice(0, 400)}`
  }
  const taskid = first?.taskid
  if (!taskid) return `tanpa taskid: ${JSON.stringify(first).slice(0, 400)}`

  for (let i = 0; i < 8; i += 1) {
    await new Promise((r) => setTimeout(r, 2000))
    const res = await fetch(`https://api.worldpop.org/v1/tasks/${taskid}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const body = await res.json()
    if (body?.status !== 'created' && body?.status !== 'started') {
      return `taskid=${taskid} status=${body?.status} ${JSON.stringify(body).slice(0, 400)}`
    }
  }
  return `taskid=${taskid} belum selesai setelah 16 detik`
}

const TARGETS = [
  ['worldpop-stats', worldpopFlow],
  // Endpoint cuaca BMKG yang baru: tanpa parameter, pesan errornya menunjukkan
  // parameter apa yang sebenarnya diminta.
  ['bmkg-prakiraan', 'https://api.bmkg.go.id/publik/prakiraan-cuaca'],
  [
    'bmkg-prakiraan-adm',
    'https://api.bmkg.go.id/publik/prakiraan-cuaca?adm2=35.08',
  ],
]

function encodeAnnotation(text) {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

async function probe(url, extract) {
  const started = Date.now()
  try {
    // Sebagian sumber butuh lebih dari satu permintaan (kirim tugas, lalu
    // tunggu hasilnya). Target seperti itu ditulis sebagai fungsi.
    if (typeof url === 'function') {
      const body = await url()
      return { status: '200 (alur)', type: '-', cors: '-', ms: Date.now() - started, body, bytes: body.length }
    }
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
