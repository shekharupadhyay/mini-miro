import { Routes, Route } from "react-router-dom";
import Join from "./pages/Join";
import Board from "./pages/Board";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Join />} />
      <Route path="/board/:boardId" element={<Board />} />
    </Routes>
  );
}