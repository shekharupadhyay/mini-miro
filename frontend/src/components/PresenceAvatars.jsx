import { useRef } from "react";
import { avatarColor, initials } from "../utils/avatar";

/**
 * Row of avatar circles for other members currently on the board.
 * `avatarEls` is a ref object { [name]: domElement } that BoardTopbar keeps
 * so reactions can be positioned near the right avatar.
 */
export default function PresenceAvatars({ members, username, avatarEls }) {
  const others = members.filter((name) => name !== username);
  if (!others.length) return null;

  return (
    <div className="board-presence">
      {others.slice(0, 3).map((name, i) => (
        <div
          key={name + i}
          ref={(el) => { if (el) avatarEls.current[name] = el; }}
          className="board-avatar"
          title={name}
          style={{ background: avatarColor(name), zIndex: others.length - i }}
        >
          {initials(name)}
        </div>
      ))}
      {others.length > 3 && (
        <div className="board-avatar board-avatar-overflow">
          +{others.length - 3}
        </div>
      )}
    </div>
  );
}
