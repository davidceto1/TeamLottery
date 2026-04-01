import { useState, useCallback, useEffect } from 'react'
import teamData from '../team.json'
import { supabase } from './supabaseClient'
import LotteryMachine from './components/LotteryMachine'
import DrawButton from './components/DrawButton'
import TeamList from './components/TeamList'
import Confetti from './components/Confetti'
import EditTeamModal from './components/EditTeamModal'
import HistoryPanel from './components/HistoryPanel'

type DrawState = 'idle' | 'mixing' | 'opening' | 'winner'

// Generate a short random room ID
function generateRoomId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let id = ''
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)]
  return id
}

// Read room ID from URL query string: ?room=abc123
function getRoomIdFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search)
  return params.get('room')
}

function setRoomIdInUrl(roomId: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('room', roomId)
  url.hash = ''
  window.history.replaceState({}, '', url.toString())
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(getRoomIdFromUrl)
  const [members, setMembers] = useState<string[]>(teamData.members)
  const [history, setHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [drawState, setDrawState] = useState<DrawState>('idle')
  const [winner, setWinner] = useState<string | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [drawRequested, setDrawRequested] = useState(false)

  // Load or create room on mount
  useEffect(() => {
    async function init() {
      const urlRoomId = getRoomIdFromUrl()

      if (urlRoomId) {
        // Try to load existing room
        const { data: room } = await supabase
          .from('rooms')
          .select('members')
          .eq('id', urlRoomId)
          .single()

        if (room) {
          setRoomId(urlRoomId)
          setMembers(room.members as string[])

          // Load draw history
          const { data: draws } = await supabase
            .from('draws')
            .select('winner')
            .eq('room_id', urlRoomId)
            .order('drawn_at', { ascending: true })

          if (draws) setHistory(draws.map(d => d.winner))
          setLoading(false)
          return
        }
      }

      // No room in URL or room not found — create a new one
      const newId = generateRoomId()
      const defaultMembers = teamData.members

      await supabase.from('rooms').insert({ id: newId, members: defaultMembers })

      setRoomId(newId)
      setMembers(defaultMembers)
      setRoomIdInUrl(newId)
      setLoading(false)
    }

    init()
  }, [])

  // Real-time subscription for draws (other users' draws appear live)
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`draws:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'draws', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setHistory(prev => [...prev, payload.new.winner as string])
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'draws', filter: `room_id=eq.${roomId}` },
        () => {
          // History was cleared — refetch
          setHistory([])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

  // Real-time subscription for room member changes
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setMembers(payload.new.members as string[])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId])

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

    // Persist to Supabase (real-time subscription will update history)
    if (roomId) {
      supabase.from('draws').insert({ room_id: roomId, winner: pickedWinner }).then()
    }
  }, [roomId])

  const handleConfettiDone = useCallback(() => setShowConfetti(false), [])

  const handleSaveMembers = async (updated: string[]) => {
    if (roomId) {
      await supabase.from('rooms').update({ members: updated }).eq('id', roomId)
    }
    setMembers(updated)
    setShowEditModal(false)
    setWinner(null)
    setDrawState('idle')
    setDrawRequested(false)
  }

  const handleClearHistory = async () => {
    if (roomId) {
      await supabase.from('draws').delete().eq('room_id', roomId)
    }
    setHistory([])
  }

  const handleCopyLink = () => {
    if (!roomId) return
    const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`
    navigator.clipboard.writeText(url)
  }

  const isDrawing = drawState === 'mixing' || drawState === 'opening'

  if (loading) {
    return (
      <div className="app">
        <h1 className="title">Standup Spinner</h1>
        <p className="subtitle">Setting up your room...</p>
      </div>
    )
  }

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
        onClick={handleCopyLink}
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
