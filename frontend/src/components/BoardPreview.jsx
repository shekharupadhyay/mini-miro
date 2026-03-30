import { useState, useEffect, useRef } from "react";

const API = import.meta.env.VITE_API_BASE;

const NOTE_FILL = {
  yellow: "#fef08a", orange: "#fed7aa", red: "#fecaca",
  blue: "#bfdbfe",  green:  "#bbf7d0", pink: "#fbcfe8",
  purple: "#e9d5ff", gray: "#e5e7eb",
};

const SHAPE_HEX = {
  black: "#1a1a1a", red: "#ef4444", orange: "#fb923c", yellow: "#eab308",
  green:  "#22c55e", blue: "#3b82f6", purple: "#a855f7", pink: "#ec4899",
};

function getFill(hex, fillMode) {
  if (fillMode === "solid") return hex + "cc";
  if (fillMode === "semi")  return hex + "44";
  return "none";
}

function MiniShape({ s }) {
  const w   = s.w ?? 120, h = s.h ?? 120;
  const cx  = s.x + w / 2, cy = s.y + h / 2;
  const hex = SHAPE_HEX[s.color ?? "black"] ?? "#1a1a1a";
  const fill = getFill(hex, s.fillMode ?? "none");
  const t = s.rotation ? `rotate(${s.rotation} ${cx} ${cy})` : undefined;

  if (s.shape === "circle") {
    return <ellipse cx={cx} cy={cy} rx={w/2-1} ry={h/2-1} fill={fill} stroke={hex} strokeWidth="2" transform={t} />;
  }
  if (s.shape === "triangle") {
    return <polygon points={`${cx},${s.y+2} ${s.x+w-2},${s.y+h-2} ${s.x+2},${s.y+h-2}`}
                    fill={fill} stroke={hex} strokeWidth="2" strokeLinejoin="round" transform={t} />;
  }
  if (s.shape === "line" && s.points?.length >= 2) {
    const polyStr = s.points.map(p => `${p.x},${p.y}`).join(" ");
    return <polyline points={polyStr} fill="none" stroke={hex} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />;
  }
  if (s.shape === "line") {
    return <line x1={s.x+2} y1={s.y+2} x2={s.x+w-2} y2={s.y+2}
                 stroke={hex} strokeWidth="2.5" strokeLinecap="round" transform={t} />;
  }
  return <rect x={s.x+1} y={s.y+1} width={w-2} height={h-2} rx="6"
               fill={fill} stroke={hex} strokeWidth="2" transform={t} />;
}

function MiniCanvas({ notes, shapes }) {
  const rects = [
    ...notes.map(n => ({ x: n.x, y: n.y, r: n.x + (n.w ?? 180), b: n.y + (n.h ?? 110) })),
    ...shapes.flatMap(s => {
      if (s.shape === "line" && s.points?.length >= 2) {
        const xs = s.points.map(p => p.x), ys = s.points.map(p => p.y);
        return [{ x: Math.min(...xs), y: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) }];
      }
      return [{ x: s.x, y: s.y, r: s.x + (s.w ?? 120), b: s.y + (s.h ?? 120) }];
    }),
  ];

  const pad  = 24;
  const minX = Math.min(...rects.map(r => r.x)) - pad;
  const minY = Math.min(...rects.map(r => r.y)) - pad;
  const maxX = Math.max(...rects.map(r => r.r)) + pad;
  const maxY = Math.max(...rects.map(r => r.b)) + pad;

  return (
    <svg
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%" }}
    >
      {notes.map(n => {
        const w = n.w ?? 180, h = n.h ?? 110;
        const cx = n.x + w / 2, cy = n.y + h / 2;
        const t = n.rotation ? `rotate(${n.rotation} ${cx} ${cy})` : undefined;
        return (
          <rect key={n._id} x={n.x} y={n.y} width={w} height={h}
                fill={NOTE_FILL[n.color] ?? "#fef08a"} opacity="0.92" transform={t} />
        );
      })}
      {shapes.map(s => <MiniShape key={s._id} s={s} />)}
    </svg>
  );
}

/**
 * Lazy-loaded board thumbnail. Fetches notes + shapes once the card
 * becomes visible (IntersectionObserver), then renders a mini SVG canvas.
 */
export default function BoardPreview({ boardId }) {
  const [data, setData] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      obs.disconnect();
      Promise.all([
        fetch(`${API}/api/boards/${encodeURIComponent(boardId)}/notes`).then(r => r.json()).catch(() => []),
        fetch(`${API}/api/boards/${encodeURIComponent(boardId)}/shapes`).then(r => r.json()).catch(() => []),
      ]).then(([notes, shapes]) => setData({ notes, shapes }));
    }, { threshold: 0.05 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [boardId]);

  const empty = data && data.notes.length === 0 && data.shapes.length === 0;

  return (
    <div ref={ref} className="db-card-thumb">
      {data === null && <div className="db-thumb-shimmer" />}
      {empty && (
        <div className="db-thumb-empty">
          <svg width="36" height="36" viewBox="0 0 20 20" fill="none"
               stroke="rgba(1,0,41,0.12)" strokeWidth="1.4" strokeLinecap="round">
            <rect x="2" y="2" width="7" height="7" rx="1"/>
            <rect x="11" y="2" width="7" height="7" rx="1"/>
            <rect x="2" y="11" width="7" height="7" rx="1"/>
            <rect x="11" y="11" width="7" height="7" rx="1"/>
          </svg>
          <span>Empty board</span>
        </div>
      )}
      {data && !empty && <MiniCanvas notes={data.notes} shapes={data.shapes} />}
    </div>
  );
}
