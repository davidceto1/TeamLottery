interface DrawButtonProps {
  onClick: () => void
  disabled: boolean
}

function DrawButton({ onClick, disabled }: DrawButtonProps) {
  return (
    <button className="draw-btn" onClick={onClick} disabled={disabled}>
      Draw
    </button>
  )
}

export default DrawButton
