import { useState } from 'react'
import { AlertStrip } from './components/AlertStrip'
import { AppHeader } from './components/AppHeader'
import { BottomNav, type TabId } from './components/BottomNav'
import { DataStateBanner } from './components/DataStateBanner'
import { DemoPanel } from './components/DemoPanel'
import { SourceList } from './components/SourceList'
import { NotificationSheet } from './components/sheets/NotificationSheet'
import { ReportSheet } from './components/sheets/ReportSheet'
import { FeedTab } from './components/tabs/FeedTab'
import { GuideTab } from './components/tabs/GuideTab'
import { MapTab } from './components/tabs/MapTab'
import { SeismicTab } from './components/tabs/SeismicTab'
import { StatusTab } from './components/tabs/StatusTab'
import { DEFAULT_RULE_STATE } from './data/notificationRules'
import { useDemo } from './hooks/useDemo'
import { useVolcanoFeed } from './hooks/useVolcanoFeed'
import { DATA_STATE_COLORS, DATA_STATE_DIM, LEVEL_COLORS } from './theme'
import type { MapLayer, NotificationRuleId } from './types'

export default function App() {
  const { demo, updateDemo } = useDemo()
  const { snapshot, level, dataState, refresh } = useVolcanoFeed(demo)

  const [tab, setTab] = useState<TabId>('status')
  const [locationOn, setLocationOn] = useState(true)
  const [layer, setLayer] = useState<MapLayer['id']>('radius')
  const [selectedHour, setSelectedHour] = useState(17)
  const [notifOpen, setNotifOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [rules, setRules] = useState(DEFAULT_RULE_STATE)

  const levelColors = LEVEL_COLORS[level.id]
  const dataColors = DATA_STATE_COLORS[dataState.id]

  const shellStyle = {
    '--lv': levelColors.color,
    '--lv-line': levelColors.line,
    '--lv-wash': levelColors.wash,
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
        />
        <DataStateBanner dataState={dataState} onRetry={refresh} />
        <AlertStrip level={level} />

        <main className="content">
          {tab === 'status' && (
            <StatusTab
              snapshot={snapshot}
              level={level}
              dataState={dataState}
              locationOn={locationOn}
              showTransport={demo.showTransport}
              notifSummary={
                rules.level
                  ? 'Aktif: perubahan level dan perintah evakuasi'
                  : 'Hanya perintah evakuasi'
              }
              onToggleLocation={() => setLocationOn((on) => !on)}
              onGoGuide={() => changeTab('panduan')}
              onGoMap={() => changeTab('peta')}
              onOpenNotifications={() => setNotifOpen(true)}
            />
          )}

          {tab === 'peta' && (
            <MapTab
              snapshot={snapshot}
              level={level}
              dataState={dataState}
              layer={layer}
              onLayerChange={setLayer}
            />
          )}

          {tab === 'seismik' && (
            <SeismicTab
              snapshot={snapshot}
              dataState={dataState}
              selectedHour={selectedHour}
              onSelectHour={setSelectedHour}
            />
          )}

          {tab === 'laporan' && (
            <FeedTab snapshot={snapshot} onOpenReport={() => setReportOpen(true)} />
          )}

          {tab === 'panduan' && <GuideTab snapshot={snapshot} level={level} />}

          <SourceList snapshot={snapshot} />
        </main>

        <BottomNav tab={tab} onChange={changeTab} />

        {notifOpen && (
          <NotificationSheet
            rules={rules}
            onToggle={toggleRule}
            onClose={() => setNotifOpen(false)}
          />
        )}

        {reportOpen && (
          <ReportSheet
            position={snapshot.position}
            onClose={() => setReportOpen(false)}
          />
        )}

        <DemoPanel demo={demo} onChange={updateDemo} />
      </div>
    </div>
  )
}
