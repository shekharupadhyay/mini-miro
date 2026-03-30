import Modal from "./Modal";

export default function DeleteNoteModal({ open, onClose, onConfirm }) {
  return (
    <Modal open={open} title="Delete note?" onClose={onClose}>
      <div className="modal-delete-icon">🗑️</div>
      <div className="modal-delete-message">
        This note will be permanently removed from the board. This action cannot be undone.
      </div>
      <div className="modal-actions">
        <button className="modal-btn modal-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button className="modal-btn modal-btn-danger" onClick={onConfirm}>
          Delete note
        </button>
      </div>
    </Modal>
  );
}