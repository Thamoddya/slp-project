import { Routes, Route, Navigate } from "react-router-dom";
import PublicApp from "./pages/PublicApp";
import AdminApp from "./pages/admin/AdminApp";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
