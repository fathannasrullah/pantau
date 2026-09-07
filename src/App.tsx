import { useMemo, useState } from 'react'
import { AlertStrip } from './components/AlertStrip'
import { AppHeader } from './components/AppHeader'
import { BottomNav, type TabId } from './components/BottomNav'
import { DataStateBanner } from './components/DataStateBanner'
import { DemoPanel } from './components/DemoPanel'
import { NotificationSheet } from './components/sheets/NotificationSheet'
import { VolcanoSheet } from './components/sheets/VolcanoSheet'
import { ReportSheet } from './components/sheets/ReportSheet'
import { AviationTab } from './components/tabs/AviationTab'
import { FeedTab } from './components/tabs/FeedTab'
import { GuideTab } from './components/tabs/GuideTab'
import { MapTab } from './components/tabs/MapTab'
import { StatusTab } from './components/tabs/StatusTab'
import { resolveAviationStatus } from './data/aviation'
import { DEFAULT_RULE_STATE } from './data/notificationRules'
import { useDemo } from './hooks/useDemo'
import { useGeolocation } from './hooks/useGeolocation'
import { useLiveQuakes } from './hooks/useLiveQuakes'
import { useVolcanoSelection } from './hooks/useVolcanoSelection'
import { useVolcanoFeed } from './hooks/useVolcanoFeed'
import { DATA_STATE_COLORS, DATA_STATE_DIM } from './theme'
import type { MapLayer, NotificationRuleId } from './types'

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
  const [rules, setRules] = useState(DEFAULT_RULE_STATE)

  /**
   * Aksen seluruh layar mengikuti keadaan peringatan abu — satu-satunya
   * penilaian bahaya di app ini yang benar-benar datang dari sumber resmi.
   * Sebelumnya warnanya diambil dari level PVMBG yang masih data contoh.
   */
  const aviation = useMemo(
    () => resolveAviationStatus(snapshot.ashAdvisories, volcano.name),
    [snapshot.ashAdvisories, volcano.name],
  )

  const dataColors = DATA_STATE_COLORS[dataState.id]

  const shellStyle = {
    '--lv': aviation.colors.color,
    '--lv-line': aviation.colors.line,
    '--lv-wash': aviation.colors.wash,
    '--ds': dataColors.color,
    '--ds-line': dataColors.line,
    '--ds-wash': dataColors.wash,
    '--dim': DATA_STATE_DIM[dataState.id],
  } as React.CSSProperties

  const changeTab = (next: TabId) => {
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  const toggleRule = (id: NotificationRuleId) =>
    setRules((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="page">
      <div className="shell" style={shellStyle}>
        <AppHeader
          volcano={snapshot.volcano}
          dataState={dataState}
          onRefresh={refresh}
          onPickVolcano={() => setVolcanoOpen(true)}
        />
        <DataStateBanner dataState={dataState} onRetry={refresh} />
        <AlertStrip status={aviation} />

        <main className="content">
          {tab === 'status' && (
            <StatusTab
              snapshot={snapshot}
              level={level}
              dataState={dataState}
              aviation={aviation}
              geo={geo}
              liveQuakes={liveQuakes}
              selectedHour={selectedHour}
              notifSummary={
                rules.level
                  ? 'Aktif: peringatan abu dan perintah evakuasi'
                  : 'Hanya perintah evakuasi'
              }
              onSelectHour={setSelectedHour}
              onGoGuide={() => changeTab('panduan')}
              onGoMap={() => changeTab('peta')}
              onGoAviation={() => changeTab('udara')}
              onOpenNotifications={() => setNotifOpen(true)}
            />
          )}

          {tab === 'peta' && (
            <MapTab
              snapshot={snapshot}
              level={level}
              dataState={dataState}
              layer={layer}
              accent={aviation.colors.color}
              geo={geo}
              liveQuakes={liveQuakes}
              onLayerChange={setLayer}
            />
          )}

          {tab === 'udara' && (
            <AviationTab
              snapshot={snapshot}
              status={aviation}
              dataState={dataState}
              showTransport={demo.showTransport}
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
        </main>

        <BottomNav tab={tab} onChange={changeTab} />

        {volcanoOpen && (
          <VolcanoSheet
            activeId={volcanoId}
            onSelect={(id) => {
              selectVolcano(id)
              setVolcanoOpen(false)
              setTab('status')
              window.scrollTo({ top: 0 })
            }}
            onClose={() => setVolcanoOpen(false)}
          />
        )}

        {notifOpen && (
          <NotificationSheet
            rules={rules}
            onToggle={toggleRule}
            onClose={() => setNotifOpen(false)}
          />
        )}

        {reportOpen && (
          <ReportSheet fix={geo.fix} onClose={() => setReportOpen(false)} />
        )}

        <DemoPanel demo={demo} onChange={updateDemo} />
      </div>
    </div>
  )
}
