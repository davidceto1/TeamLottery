interface DrawButtonProps {
  onClick: () => void
  disabled: boolean
  label?: string
}

function DrawButton({ onClick, disabled, label = 'Draw' }: DrawButtonProps) {
  return (
    <button className="draw-btn" onClick={onClick} disabled={disabled}>
      {label}
    </button>
  )
}

export default DrawButton
