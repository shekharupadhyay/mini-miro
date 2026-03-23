import { useState } from "react";

export default function DeleteConfirmButton({ onDelete }) {
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting,      setDeleting]      = useState(false);

  async function commitDelete() {
    setDeleting(true);
    try {
      await onDelete();
    } catch {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  if (deleteConfirm) {
    return (
      <div className="board-delete-confirm">
        <span className="board-delete-confirm-text">Delete board?</span>
        <button className="board-delete-yes" onClick={commitDelete} disabled={deleting}>
          {deleting ? "…" : "Delete"}
        </button>
        <button className="board-delete-no" onClick={() => setDeleteConfirm(false)} disabled={deleting}>
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      className="board-icon-btn board-delete-btn"
      onClick={() => setDeleteConfirm(true)}
      title="Delete board"
    >
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6h14M8 6V4h4v2M5 6l1 11h8l1-11"/>
      </svg>
    </button>
  );
}
