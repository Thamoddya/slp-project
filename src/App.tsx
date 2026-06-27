import { Navigate, Route, Routes } from "react-router-dom";
import PosonWaiting from "./pages/PosonWaiting";
import AdminApp from "./pages/admin/AdminApp";

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
