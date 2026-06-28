import { Navigate, Route, Routes } from "react-router-dom";
import PosonCurtain from "./components/PosonCurtain";
import AdminApp from "./pages/admin/AdminApp";
import PublicApp from "./pages/PublicApp";

export default function App() {
  return (
    <Routes>
      {/* Public root → Poson Poya "Stay Tuned" page that opens like a curtain
          into the real Pilgrim Route Guide. */}
      <Route
        path="/"
        element={
          <PosonCurtain>
            <PublicApp />
          </PosonCurtain>
        }
      />
      {/* Admin panel remains fully accessible */}
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
