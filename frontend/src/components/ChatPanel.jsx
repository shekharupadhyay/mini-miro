import { useEffect, useRef, useState } from "react";
import { avatarColor, initials } from "../utils/avatar";
import "./ChatPanel.css";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ socket, username, isOpen, onToggle, onUnread }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isOpenRef = useRef(isOpen);

  // Track isOpen for the unread counter
  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) setUnread(0);
  }, [isOpen]);

  // Listen for chat messages
  useEffect(() => {
    if (!socket) return;

    function onMsg(msg) {
      setMessages(prev => [...prev, msg]);
      if (!isOpenRef.current && msg.username !== username) {
        setUnread(u => u + 1);
        onUnread?.();
      }
    }

    socket.on("chat:message", onMsg);
    return () => socket.off("chat:message", onMsg);
  }, [socket, username]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed || !socket) return;
    socket.emit("chat:message", { text: trimmed });
    setText("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  if (!isOpen) return null;

  return (
    <div className="chat-sidebar">
      <div className="chat-header">
        <span className="chat-header-title">💬 Room Chat</span>
        <button className="chat-close-btn" onClick={onToggle} title="Close chat">✕</button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <span className="chat-empty-icon">💬</span>
            <span>No messages yet — say hello!</span>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.username === username;
          return (
            <div key={msg.id} className={`chat-msg ${isMe ? "me" : "other"}`}>
              {!isMe && (
                <div className="chat-msg-avatar" style={{ background: avatarColor(msg.username) }}>
                  {initials(msg.username)}
                </div>
              )}
              <div className="chat-msg-body">
                {!isMe && <span className="chat-msg-name">{msg.username}</span>}
                <div className="chat-msg-bubble">{msg.text}</div>
                <span className="chat-msg-time">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-input-bar">
        <input
          ref={inputRef}
          className="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message…"
          maxLength={500}
        />
        <button className="chat-send-btn" onClick={send} disabled={!text.trim()}>
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path d="M2.94 5.34a1 1 0 0 1 1.33-.47l12.12 5.73a1 1 0 0 1 0 1.8L4.27 18.13a1 1 0 0 1-1.38-1.1l1.18-4.73h5.43a.75.75 0 0 0 0-1.5H4.07L2.89 6.07a1 1 0 0 1 .05-.73Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
