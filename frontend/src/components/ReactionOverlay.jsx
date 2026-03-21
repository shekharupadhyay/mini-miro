import { avatarColor } from "../utils/avatar";
import "./reaction.css";

export default function ReactionOverlay({ reactions }) {
  return (
    <div className="reaction-overlay">
      {reactions.map((r) => (
        <div
          key={r.id}
          className="reaction-bubble"
          style={{ left: r.x, bottom: 24 }}
        >
          <span className="reaction-emoji">{r.emoji}</span>
          <span className="reaction-name" style={{ background: avatarColor(r.username) }}>
            {r.username}
          </span>
        </div>
      ))}
    </div>
  );
}
