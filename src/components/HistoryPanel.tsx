interface HistoryPanelProps {
  history: string[]
  members: string[]
  onClear: () => void
}

function HistoryPanel({ history, members, onClear }: HistoryPanelProps) {
  if (members.length === 0) return null

  // Count frequency of each member in history
  const counts: Record<string, number> = {}
  for (const name of members) counts[name] = 0
  for (const name of history) {
    if (name in counts) counts[name]++
  }

  const totalDraws = history.length
  const maxCount = Math.max(...Object.values(counts))
  const minCount = Math.min(...Object.values(counts))

  // Sort by count descending for display
  const sorted = [...members].sort((a, b) => counts[b] - counts[a])

  // Determine hot/cold: top tier = hot, bottom tier = cold
  // If all equal, nobody is hot or cold
  const allEqual = maxCount === minCount

  function getHeatClass(count: number): string {
    if (allEqual || totalDraws === 0) return ''
    if (count === maxCount) return 'hot'
    if (count === minCount) return 'cold'
    return ''
  }

  function getBarWidth(count: number): string {
    if (maxCount === 0) return '0%'
    return `${(count / maxCount) * 100}%`
  }

  return (
    <div className="history-panel">
      <div className="history-header">
        <h3 className="history-title">Draw History</h3>
        <span className="history-count">{totalDraws} draw{totalDraws !== 1 ? 's' : ''}</span>
      </div>

      {totalDraws === 0 ? (
        <p className="history-empty">No draws yet. Hit Draw to start!</p>
      ) : (
        <>
          <div className="history-legend">
            <span className="legend-hot">HOT</span>
            <span className="legend-cold">COLD</span>
          </div>

          <div className="history-bars">
            {sorted.map((name) => {
              const heat = getHeatClass(counts[name])
              return (
                <div key={name} className={`history-row ${heat}`}>
                  <span className="history-name">{name}</span>
                  <div className="history-bar-track">
                    <div
                      className={`history-bar-fill ${heat}`}
                      style={{ width: getBarWidth(counts[name]) }}
                    />
                  </div>
                  <span className="history-freq">{counts[name]}</span>
                </div>
              )
            })}
          </div>

          <div className="history-recent">
            <span className="history-recent-label">Recent:</span>
            <div className="history-recent-list">
              {history.slice(-10).reverse().map((name, i) => (
                <span key={i} className="history-recent-chip">{name}</span>
              ))}
            </div>
          </div>

          <button className="history-clear-btn" onClick={onClear}>
            Clear History
          </button>
        </>
      )}
    </div>
  )
}

export default HistoryPanel
