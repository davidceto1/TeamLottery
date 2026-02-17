import { useState, useCallback } from 'react'
import teamData from '../team.json'
import LotteryBall from './components/LotteryBall'
import DrawButton from './components/DrawButton'
import TeamList from './components/TeamList'
import Confetti from './components/Confetti'
import EditTeamModal from './components/EditTeamModal'

type DrawState = 'idle' | 'spinning' | 'winner'

function App() {
  const [members, setMembers] = useState<string[]>(teamData.members)
  const [displayName, setDisplayName] = useState('Press Draw!')
  const [drawState, setDrawState] = useState<DrawState>('idle')
  const [winner, setWinner] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)

  const draw = useCallback(() => {
    if (drawState === 'spinning' || members.length === 0) return

    setDrawState('spinning')
    setWinner(null)
    setShowConfetti(false)

    let flicks = 0
    const totalFlicks = 20 + Math.floor(Math.random() * 15)
    let delay = 50

    function flick() {
      const rand = members[Math.floor(Math.random() * members.length)]
      setDisplayName(rand)
      flicks++

      if (flicks < totalFlicks) {
        delay += flicks * 2.5
        setTimeout(flick, delay)
      } else {
        const picked = members[Math.floor(Math.random() * members.length)]
        setDisplayName(picked)
        setWinner(picked)
        setDrawState('winner')
        setShowConfetti(true)
      }
    }

    flick()
  }, [drawState, members])

  const handleSaveMembers = (updated: string[]) => {
    setMembers(updated)
    setShowEditModal(false)
    setWinner(null)
    setDrawState('idle')
    setDisplayName('Press Draw!')
  }

  return (
    <div className="app">
      <h1 className="title">Standup Spinner</h1>
      <p className="subtitle">Who's running the show today?</p>

      <LotteryBall name={displayName} state={drawState} />
      <DrawButton onClick={draw} disabled={drawState === 'spinning'} />

      <button
        className="edit-team-btn"
        onClick={() => setShowEditModal(true)}
        disabled={drawState === 'spinning'}
      >
        Edit Team
      </button>

      <TeamList members={members} winner={winner} />

      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
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
