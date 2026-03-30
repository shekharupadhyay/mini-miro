import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export async function fetchNotes(boardId) {
  const res = await axios.get(`${API_BASE}/api/boards/${boardId}/notes`);
  return res.data;
}

export async function createNote(boardId, payload) {
  const res = await axios.post(`${API_BASE}/api/boards/${boardId}/notes`, payload);
  return res.data;
}

export async function updateNotePosition(noteId, x, y) {
  const res = await axios.put(`${API_BASE}/api/notes/${noteId}`, { x, y });
  return res.data;
}

export async function updateNote(noteId, payload) {
  const res = await axios.patch(`${API_BASE}/api/notes/${noteId}`, payload);
  return res.data;
}

export async function deleteNote(noteId) {
  const res = await axios.delete(`${API_BASE}/api/notes/${noteId}`);
  return res.data;
}