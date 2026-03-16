import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export async function createRoom(name, adminName) {
  const res = await axios.post(`${API_BASE}/api/rooms`, { name, adminName });
  return res.data;
}

export async function checkRoomExists(name) {
  const res = await axios.get(`${API_BASE}/api/rooms/${encodeURIComponent(name)}/exists`);
  return res.data.exists;
}

export async function getRoom(name) {
  const res = await axios.get(`${API_BASE}/api/rooms/${encodeURIComponent(name)}`);
  return res.data;
}
