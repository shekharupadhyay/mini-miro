export default function LineDrawPreview({ drawingLine }) {
  if (!drawingLine) return null;

  return (
    <svg style={{
      position: "absolute", left: 0, top: 0,
      width: "100%", height: "100%",
      pointerEvents: "none", zIndex: 50,
    }}>
      <line
        x1={drawingLine.p1.x} y1={drawingLine.p1.y}
        x2={drawingLine.p2.x} y2={drawingLine.p2.y}
        stroke="#010029" strokeWidth="2" strokeDasharray="7 4"
        opacity="0.7" strokeLinecap="round"
      />
      <circle cx={drawingLine.p1.x} cy={drawingLine.p1.y} r="5"
        fill="white" stroke="#010029" strokeWidth="2" />
      <circle cx={drawingLine.p2.x} cy={drawingLine.p2.y} r="5"
        fill="white" stroke="#010029" strokeWidth="2" />
    </svg>
  );
}
