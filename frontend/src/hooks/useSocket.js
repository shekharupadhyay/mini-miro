import { useEffect, useState } from "react";
import { io as socketIO } from "socket.io-client";

export function useSocket(boardId, username, setNotes, setShapes, socketRef, onReactionRef, onBoardEventRef) {
  const [socket, setSocket] = useState(null);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const s = socketIO(import.meta.env.VITE_API_BASE, {
      withCredentials: true,
      transports: ["websocket"],
    });
    socketRef.current = s;
    setSocket(s);

    s.on("connect", () => {
      s.emit("join-board", { boardId, username });
    });

    s.on("presence", (list) => setMembers(list));

    s.on("note:created", (note) => {
      setNotes((prev) =>
        prev.find((n) => n._id === note._id) ? prev : [...prev, note]
      );
    });
    s.on("note:updated", ({ _id, ...patch }) => {
      setNotes((prev) =>
        prev.map((n) => (n._id === _id ? { ...n, ...patch } : n))
      );
    });
    s.on("note:deleted", ({ _id }) => {
      setNotes((prev) => prev.filter((n) => n._id !== _id));
    });

    s.on("shape:created", (shape) => {
      setShapes((prev) =>
        prev.find((s) => s._id === shape._id) ? prev : [...prev, shape]
      );
    });
    s.on("shape:updated", ({ _id, ...patch }) => {
      setShapes((prev) =>
        prev.map((s) => (s._id === _id ? { ...s, ...patch } : s))
      );
    });
    s.on("shape:deleted", ({ _id }) => {
      setShapes((prev) => prev.filter((s) => s._id !== _id));
    });

    s.on("reaction", (data) => onReactionRef?.current?.(data));

    s.on("board:renamed", (data) => onBoardEventRef?.current?.({ type: "renamed", ...data }));
    s.on("board:deleted", ()     => onBoardEventRef?.current?.({ type: "deleted" }));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [boardId, username]); // eslint-disable-line

  return { socket, members };
}