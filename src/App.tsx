import { Navigate, Route, Routes } from "react-router-dom";
import AdminApp from "./pages/admin/AdminApp";
import PosonWaiting from "./pages/PosonWaiting";

export default function App() {
  return (
    <Routes>
      {/* Public root → Poson Poya "Stay Tuned" page */}
      <Route path="/" element={<PosonWaiting />} />
      {/* Admin panel remains fully accessible */}
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
