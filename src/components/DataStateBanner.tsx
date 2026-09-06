import type { DataStateView } from '../data/dataState'

interface Props {
  dataState: DataStateView
  onRetry: () => void
}

export function DataStateBanner({ dataState, onRetry }: Props) {
  if (!dataState.banner) return null
  return (
    <div className="banner" role="status">
      <div className="banner__dot" aria-hidden="true" />
      <div className="banner__body">
        <div className="banner__title">{dataState.banner.title}</div>
        <div className="banner__note">{dataState.banner.note}</div>
      </div>
      <button type="button" className="banner__retry" onClick={onRetry}>
        Coba lagi
      </button>
    </div>
  )
}
