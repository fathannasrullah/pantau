import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertStrip } from './components/AlertStrip'
import { AppFooter } from './components/AppFooter'
import { BottomSheet, type SheetMetrics } from './components/BottomSheet'
import { DataStateBanner } from './components/DataStateBanner'
import { DemoPanel } from './components/DemoPanel'
import { FloatingHeader } from './components/FloatingHeader'
import { MapControls } from './components/MapControls'
import { SheetNav, type TabId } from './components/SheetNav'
import { VolcanoMap } from './components/VolcanoMap'
import { NotificationSheet } from './components/sheets/NotificationSheet'
import { VolcanoSheet } from './components/sheets/VolcanoSheet'
import { ReportSheet } from './components/sheets/ReportSheet'
import { AreaTab } from './components/tabs/AreaTab'
import { AviationTab } from './components/tabs/AviationTab'
import { FeedTab } from './components/tabs/FeedTab'
import { GuideTab } from './components/tabs/GuideTab'
import { StatusTab } from './components/tabs/StatusTab'
import { resolveAviationStatus } from './data/aviation'
import { useAlertWatcher } from './hooks/useAlertWatcher'
import { useDemo } from './hooks/useDemo'
import { useGeolocation } from './hooks/useGeolocation'
import { useLiveQuakes } from './hooks/useLiveQuakes'
import { useVolcanoSelection } from './hooks/useVolcanoSelection'
import { useNotifications } from './hooks/useNotifications'
import { useTheme } from './hooks/useTheme'
import { useVolcanoFeed } from './hooks/useVolcanoFeed'
import { DATA_STATE_COLORS, DATA_STATE_DIM } from './theme'
import type { MapLayer } from './types'

/**
 * Tebakan awal tinggi kepala mengapung, hanya dipakai untuk gambar pertama
 * sebelum tumpukan atas benar-benar terukur.
 */
const HEADER_PX = 66
/** Jarak lega antara tumpukan atas dan kendali peta di bawahnya. */
const CHROME_GAP = 8

/** Ringkasan satu baris di layar Status, apa adanya sesuai keadaan izin. */
function notifSummary(n: ReturnType<typeof useNotifications>): string {
  if (n.permission === 'unsupported') return 'Tidak didukung peramban ini'
  if (n.permission === 'denied') return 'Diblokir di setelan peramban'
  if (n.permission !== 'granted') return 'Belum diizinkan — ketuk untuk mengatur'
  const on = [
    n.rules.level ? 'peringatan abu' : null,
    n.rules.ash ? 'kualitas udara' : null,
    n.rules.quake ? 'gempa baru' : null,
  ].filter(Boolean)
  return on.length ? `Aktif: ${on.join(', ')}` : 'Aktif, tapi semua aturan dimatikan'
}

export default function App() {
  const { demo, updateDemo } = useDemo()
  const { volcano, volcanoId, selectVolcano } = useVolcanoSelection()
  const { snapshot, level, dataState, refresh } = useVolcanoFeed(volcano, demo)

  const geo = useGeolocation()
  const liveQuakes = useLiveQuakes(volcano)

  const [tab, setTab] = useState<TabId>('status')
  const [layer, setLayer] = useState<MapLayer['id']>('radius')
  const [selectedHour, setSelectedHour] = useState(17)
  const [notifOpen, setNotifOpen] = useState(false)
  const [volcanoOpen, setVolcanoOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [snap, setSnap] = useState(0)
  const [focus, setFocus] = useState<'gunung' | 'saya'>('gunung')
  const [sheet, setSheet] = useState<SheetMetrics>({
    height: 0,
    wide: false,
    panelWidth: 0,
  })
  const notifications = useNotifications()
  const theme = useTheme()
  const bannersRef = useRef<HTMLDivElement | null>(null)
  const [chromeTop, setChromeTop] = useState(HEADER_PX)

  /**
   * Tinggi tumpukan atas diukur, bukan ditebak dari angka tetap.
   * Isinya berubah-ubah — banner kondisi data bisa ada atau tidak, pita
   * peringatan abu bisa satu atau tiga baris tergantung lebar layar — dan
   * tebakan tetap sempat membuat keterangan warna peta tertimbun pita
   * peringatan.
   */
  useEffect(() => {
    const el = bannersRef.current
    if (!el) return
    const measure = () => {
      const next = Math.round(el.getBoundingClientRect().bottom) + CHROME_GAP
      setChromeTop((prev) => (prev === next ? prev : next))
    }
    measure()
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  /**
   * Aksen seluruh layar mengikuti keadaan peringatan abu — satu-satunya
   * penilaian bahaya di app ini yang benar-benar datang dari sumber resmi.
   */
  const aviation = useMemo(
    () => resolveAviationStatus(snapshot.ashAdvisories, volcano.name),
    [snapshot.ashAdvisories, volcano.name],
  )

  useAlertWatcher({
    snapshot,
    aviation,
    notifications,
    paused: demo.dataState !== null || demo.level !== null,
  })

  const dataColors = DATA_STATE_COLORS[dataState.id]

  const shellStyle = {
    '--lv': aviation.colors.color,
    '--lv-line': aviation.colors.line,
    '--lv-wash': aviation.colors.wash,
    '--ds': dataColors.color,
    '--ds-line': dataColors.line,
    '--ds-wash': dataColors.wash,
    '--dim': DATA_STATE_DIM[dataState.id],
    // Kendali peta duduk tepat di atas lembar geser, ikut bergerak bersamanya.
    '--sheet-h': `${sheet.height}px`,
    '--panel-w': `${sheet.panelWidth}px`,
    // Ruang yang dipakai kepala dan banner, supaya kendali bawaan peta —
    // skala, pemilih peta dasar, keterangan warna — tidak duduk di baliknya.
    '--chrome-top': `${chromeTop}px`,
  } as React.CSSProperties

  // Berpindah tab ikut membuka lembar: memilih bagian lalu hanya melihat
  // judulnya saja bukan yang dimaksud orang.
  const changeTab = useCallback((next: TabId) => {
    setTab(next)
    setSnap((s) => Math.max(s, 1))
  }, [])

  const openFull = useCallback((next: TabId) => {
    setTab(next)
    setSnap(2)
  }, [])

  const onMetrics = useCallback((m: SheetMetrics) => setSheet(m), [])

  const chrome = useMemo(
    () => ({
      top: chromeTop,
      left: sheet.panelWidth,
      bottom: sheet.height,
    }),
    [chromeTop, sheet.panelWidth, sheet.height],
  )

  return (
    <div className="app" style={shellStyle}>
      <div className="app__map">
        <VolcanoMap
          volcano={snapshot.volcano}
          radiusKm={level.radiusKm}
          layer={layer}
          accent={aviation.colors.color}
          geo={geo}
          ashHeadingDeg={snapshot.ashfall.ashHeadingDeg}
          windSpeedKmh={snapshot.ashfall.windSpeedKmh}
          advisories={snapshot.ashAdvisories}
          population={snapshot.population}
          bmkgEpicentres={snapshot.bmkgEpicentres}
          usgsQuakes={liveQuakes.quakes}
          chrome={chrome}
          focus={focus}
          tema={theme.tema}
        />
      </div>

      <FloatingHeader
        volcano={snapshot.volcano}
        dataState={dataState}
        onRefresh={refresh}
        onPickVolcano={() => setVolcanoOpen(true)}
        tema={theme.tema}
        onToggleTheme={theme.toggle}
      />

      <div className="app__banners" ref={bannersRef}>
        <DataStateBanner dataState={dataState} onRetry={refresh} />
        <AlertStrip status={aviation} />
      </div>

      <MapControls
        layers={snapshot.mapLayers}
        layer={layer}
        onLayerChange={setLayer}
        focus={focus}
        onToggleFocus={() =>
          setFocus((f) => (f === 'gunung' ? 'saya' : 'gunung'))
        }
        canFocusUser={geo.fix !== null}
      />

      <BottomSheet
        onMetrics={onMetrics}
        snap={snap}
        onSnapChange={setSnap}
        scrollKey={tab}
        header={<SheetNav tab={tab} onChange={changeTab} />}
      >
        {tab === 'status' && (
          <StatusTab
            snapshot={snapshot}
            level={level}
            dataState={dataState}
            aviation={aviation}
            geo={geo}
            liveQuakes={liveQuakes}
            selectedHour={selectedHour}
            notifSummary={notifSummary(notifications)}
            onSelectHour={setSelectedHour}
            onGoGuide={() => openFull('panduan')}
            onGoMap={() => setSnap(0)}
            onGoAviation={() => openFull('udara')}
            onOpenNotifications={() => setNotifOpen(true)}
          />
        )}

        {tab === 'wilayah' && (
          <AreaTab
            snapshot={snapshot}
            level={level}
            dataState={dataState}
            layer={layer}
            showTransport={demo.showTransport}
          />
        )}

        {tab === 'udara' && (
          <AviationTab
            snapshot={snapshot}
            status={aviation}
            dataState={dataState}
            showTransport={false}
          />
        )}

        {tab === 'laporan' && (
          <FeedTab
            snapshot={snapshot}
            onOpenReport={() => setReportOpen(true)}
          />
        )}

        {tab === 'panduan' && (
          <GuideTab snapshot={snapshot} aviation={aviation} />
        )}

        <AppFooter />
      </BottomSheet>

      {volcanoOpen && (
        <VolcanoSheet
          activeId={volcanoId}
          onSelect={(id) => {
            selectVolcano(id)
            setVolcanoOpen(false)
            setTab('status')
            setFocus('gunung')
          }}
          onClose={() => setVolcanoOpen(false)}
        />
      )}

      {notifOpen && (
        <NotificationSheet
          notifications={notifications}
          onClose={() => setNotifOpen(false)}
        />
      )}

      {reportOpen && (
        <ReportSheet fix={geo.fix} onClose={() => setReportOpen(false)} />
      )}

      <DemoPanel demo={demo} onChange={updateDemo} />
    </div>
  )
}
