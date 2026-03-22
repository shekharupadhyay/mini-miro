import { useEffect, useRef, useState } from "react";

const EMOJIS = ["👍", "❤️", "🔥", "😂", "😮", "👏", "🎉", "👋"];

/**
 * Emoji reaction picker button + dropdown.
 * `onReact(emoji)` is called when the user picks an emoji.
 */
export default function ReactionPicker({ myAvatarEl, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  const buttonRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!pickerOpen) return;
    function onDown(e) {
      if (pickerRef.current?.contains(e.target)) return;
      if (buttonRef.current?.contains(e.target)) return;
      setPickerOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pickerOpen]);

  function handlePickEmoji(emoji) {
    const rect = myAvatarEl?.current?.getBoundingClientRect() ?? null;
    onReact?.(emoji, rect);
  }

  return (
    <div className="reaction-picker-wrap">
      <button
        ref={buttonRef}
        className={`board-icon-btn${pickerOpen ? " active" : ""}`}
        onClick={() => setPickerOpen((o) => !o)}
        title="React"
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.6"/>
          <path d="M7 11.5s1 1.5 3 1.5 3-1.5 3-1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="7.5" cy="8.5" r="1" fill="currentColor"/>
          <circle cx="12.5" cy="8.5" r="1" fill="currentColor"/>
        </svg>
      </button>

      {pickerOpen && (
        <div ref={pickerRef} className="reaction-picker">
          {EMOJIS.map((e) => (
            <button
              key={e}
              className="reaction-pick-btn"
              onClick={() => handlePickEmoji(e)}
              title={e}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
