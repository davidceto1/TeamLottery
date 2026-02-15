interface LotteryBallProps {
  name: string
  state: 'idle' | 'spinning' | 'winner'
}

function LotteryBall({ name, state }: LotteryBallProps) {
  const className = ['ball', state === 'spinning' ? 'spinning' : '', state === 'winner' ? 'winner' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div className="ball-container">
      <div className={className}>{name}</div>
    </div>
  )
}

export default LotteryBall
