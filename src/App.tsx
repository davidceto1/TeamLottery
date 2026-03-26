import { useState, useCallback, useEffect } from 'react'
import teamData from '../team.json'
import LotteryMachine from './components/LotteryMachine'
import DrawButton from './components/DrawButton'
import TeamList from './components/TeamList'
import Confetti from './components/Confetti'
import EditTeamModal from './components/EditTeamModal'
import HistoryPanel from './components/HistoryPanel'

type DrawState = 'idle' | 'mixing' | 'opening' | 'winner'

function encodeTeam(members: string[]): string {
  return btoa(JSON.stringify(members))
}

function decodeTeam(hash: string): string[] | null {
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const team = params.get('team')
    if (!team) return null
    return JSON.parse(atob(team))
  } catch {
    return null
  }
}

function encodeHistory(history: string[]): string {
  return btoa(JSON.stringify(history))
}

function decodeHistory(hash: string): string[] | null {
  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''))
    const hist = params.get('history')
    if (!hist) return null
    return JSON.parse(atob(hist))
  } catch {
    return null
  }
}

function buildHash(members: string[], history: string[]): string {
  const parts = ['team=' + encodeTeam(members)]
  if (history.length > 0) {
    parts.push('history=' + encodeHistory(history))
  }
  return parts.join('&')
}

function App() {
  const [members, setMembers] = useState<string[]>(() => {
    const fromHash = decodeTeam(window.location.hash)
    if (fromHash) return fromHash

    const saved = localStorage.getItem('teamMembers')
    return saved ? JSON.parse(saved) : teamData.members
  })
  const [history, setHistory] = useState<string[]>(() => {
    const fromHash = decodeHistory(window.location.hash)
    if (fromHash) return fromHash

    const saved = localStorage.getItem('drawHistory')
    return saved ? JSON.parse(saved) : []
  })
  const [drawState, setDrawState] = useState<DrawState>('idle')
  const [winner, setWinner] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [drawRequested, setDrawRequested] = useState(false)

  // Keep URL hash in sync with state changes
  useEffect(() => {
    window.location.hash = buildHash(members, history)
  }, [members, history])

  const draw = useCallback(() => {
    if (drawState === 'mixing' || drawState === 'opening' || members.length === 0) return
    setDrawRequested(true)
  }, [drawState, members])

  const handleDrawStart = useCallback(() => {
    setDrawState('mixing')
    setWinner(null)
    setShowConfetti(false)
  }, [])

  const handleDrawComplete = useCallback((pickedWinner: string) => {
    setWinner(pickedWinner)
    setDrawState('winner')
    setShowConfetti(true)
    setDrawRequested(false)
    setHistory(prev => {
      const updated = [...prev, pickedWinner]
      localStorage.setItem('drawHistory', JSON.stringify(updated))
      return updated
    })
  }, [])

  const handleConfettiDone = useCallback(() => setShowConfetti(false), [])

  const handleSaveMembers = (updated: string[]) => {
    localStorage.setItem('teamMembers', JSON.stringify(updated))
    setMembers(updated)
    setShowEditModal(false)
    setWinner(null)
    setDrawState('idle')
    setDrawRequested(false)
  }

  const handleClearHistory = () => {
    setHistory([])
    localStorage.removeItem('drawHistory')
  }

  const isDrawing = drawState === 'mixing' || drawState === 'opening'

  return (
    <div className="app">
      <h1 className="title">Standup Spinner</h1>
      <p className="subtitle">Who's running the show today?</p>

      <LotteryMachine
        members={members}
        drawRequested={drawRequested}
        onDrawStart={handleDrawStart}
        onDrawComplete={handleDrawComplete}
      />

      <DrawButton
        onClick={draw}
        disabled={isDrawing}
        label="Draw"
      />

      <button
        className="edit-team-btn"
        onClick={() => setShowEditModal(true)}
        disabled={isDrawing}
      >
        Edit Team
      </button>

      <button
        className="edit-team-btn"
        onClick={() => {
          const url = window.location.origin + window.location.pathname + '#' + buildHash(members, history)
          navigator.clipboard.writeText(url)
        }}
        disabled={isDrawing}
      >
        Copy Link
      </button>

      <TeamList members={members} winner={winner} />

      <HistoryPanel history={history} members={members} onClear={handleClearHistory} />

      {showConfetti && <Confetti onDone={handleConfettiDone} />}
      {showEditModal && (
        <EditTeamModal
          members={members}
          onSave={handleSaveMembers}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  )
}

export default App
