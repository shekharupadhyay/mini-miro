import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE;

export async function fetchShapes(boardId) {
  const res = await axios.get(`${API_BASE}/api/boards/${boardId}/shapes`);
  return res.data;
}

export async function createShape(boardId, payload) {
  const res = await axios.post(`${API_BASE}/api/boards/${boardId}/shapes`, payload);
  return res.data;
}

export async function updateShape(shapeId, payload) {
  const res = await axios.patch(`${API_BASE}/api/shapes/${shapeId}`, payload);
  return res.data;
}

export async function deleteShape(shapeId) {
  const res = await axios.delete(`${API_BASE}/api/shapes/${shapeId}`);
  return res.data;
}