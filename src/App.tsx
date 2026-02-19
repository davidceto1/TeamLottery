import { useState, useCallback } from 'react'
import teamData from '../team.json'
import LotteryMachine from './components/LotteryMachine'
import DrawButton from './components/DrawButton'
import TeamList from './components/TeamList'
import Confetti from './components/Confetti'
import EditTeamModal from './components/EditTeamModal'

type DrawState = 'idle' | 'mixing' | 'opening' | 'winner'

function encodeTeam(members: string[]): string {
  return btoa(JSON.stringify(members))
}

function decodeTeam(hash: string): string[] | null {
  try {
    const param = hash.replace(/^#team=/, '')
    if (!param) return null
    return JSON.parse(atob(param))
  } catch {
    return null
  }
}

function App() {
  const [members, setMembers] = useState<string[]>(() => {
    const fromHash = decodeTeam(window.location.hash)
    if (fromHash) return fromHash

    const saved = localStorage.getItem('teamMembers')
    return saved ? JSON.parse(saved) : teamData.members
  })
  const [drawState, setDrawState] = useState<DrawState>('idle')
  const [winner, setWinner] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [drawRequested, setDrawRequested] = useState(false)

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
  }, [])

  const handleConfettiDone = useCallback(() => setShowConfetti(false), [])

  const handleSaveMembers = (updated: string[]) => {
    localStorage.setItem('teamMembers', JSON.stringify(updated))
    window.location.hash = 'team=' + encodeTeam(updated)
    setMembers(updated)
    setShowEditModal(false)
    setWinner(null)
    setDrawState('idle')
    setDrawRequested(false)
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
          const url = window.location.origin + window.location.pathname + '#team=' + encodeTeam(members)
          navigator.clipboard.writeText(url)
        }}
        disabled={isDrawing}
      >
        Copy Link
      </button>

      <TeamList members={members} winner={winner} />

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
