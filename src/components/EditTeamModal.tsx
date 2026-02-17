import { useState } from 'react'

interface EditTeamModalProps {
  members: string[]
  onSave: (members: string[]) => void
  onClose: () => void
}

function EditTeamModal({ members, onSave, onClose }: EditTeamModalProps) {
  const [draft, setDraft] = useState<string[]>([...members])
  const [newName, setNewName] = useState('')

  const addMember = () => {
    const trimmed = newName.trim()
    if (trimmed && !draft.includes(trimmed)) {
      setDraft([...draft, trimmed])
      setNewName('')
    }
  }

  const removeMember = (index: number) => {
    setDraft(draft.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMember()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">Edit Team</h2>

        <div className="modal-members">
          {draft.map((name, i) => (
            <div key={i} className="modal-member">
              <span>{name}</span>
              <button
                className="remove-btn"
                onClick={() => removeMember(i)}
                aria-label={`Remove ${name}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="modal-add-row">
          <input
            type="text"
            className="modal-input"
            placeholder="New member name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="add-btn"
            onClick={addMember}
            disabled={!newName.trim() || draft.includes(newName.trim())}
          >
            Add
          </button>
        </div>

        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-btn"
            onClick={() => onSave(draft)}
            disabled={draft.length === 0}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export default EditTeamModal
