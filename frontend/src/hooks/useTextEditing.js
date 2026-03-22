import { useState, useRef, useEffect } from "react";

/**
 * Manages contenteditable text editing state for Note-style elements.
 * Controlled via the `isEditing` prop (parent decides when editing is active).
 */
export function useTextEditing({ text, isEditing, id, onSaveEdit, onUpdate, onStopEdit }) {
  const [draftText, setDraftText] = useState(text);
  const textareaRef = useRef(null);

  // Reset draft when editing ends or text changes externally
  useEffect(() => {
    if (!isEditing) setDraftText(text);
  }, [text, isEditing]);

  // Focus + select all when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const el = textareaRef.current;
      el.textContent = draftText;
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [isEditing]); // eslint-disable-line

  async function saveEdit() {
    const trimmed = draftText.trim();
    if (onSaveEdit) await onSaveEdit(id, trimmed);
    else onUpdate?.(id, { text: trimmed });
  }

  function cancelEdit() {
    setDraftText(text);
    onStopEdit?.();
  }

  return { draftText, setDraftText, textareaRef, saveEdit, cancelEdit };
}
