export default function MultiSelectToolbar({ multiSelected, onDelete }) {
  if (!multiSelected || multiSelected.noteIds.length + multiSelected.shapeIds.length === 0) return null;

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 60,
        display: "flex", alignItems: "center", gap: 8,
        background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
        padding: "5px 10px", boxShadow: "0 2px 8px rgba(0,0,0,0.12)", pointerEvents: "all",
      }}
    >
      <span style={{ fontSize: 13, color: "#555" }}>
        {multiSelected.noteIds.length + multiSelected.shapeIds.length} selected
      </span>
      <button
        style={{
          fontSize: 13, padding: "3px 10px", borderRadius: 6,
          border: "1px solid #fca5a5", background: "#fee2e2", color: "#dc2626", cursor: "pointer",
        }}
        onClick={onDelete}
      >
        🗑 Delete
      </button>
    </div>
  );
}
