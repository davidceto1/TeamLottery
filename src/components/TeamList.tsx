interface TeamListProps {
  members: string[]
  winner: string | null
}

function TeamList({ members, winner }: TeamListProps) {
  return (
    <div className="team-list">
      {members.map((name) => (
        <span
          key={name}
          className={`team-chip ${name === winner ? 'picked' : ''}`}
        >
          {name}
        </span>
      ))}
    </div>
  )
}

export default TeamList
