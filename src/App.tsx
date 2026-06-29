import { Navigate, Route, Routes } from "react-router-dom";
import AdminApp from "./pages/admin/AdminApp";
import PublicApp from "./pages/PublicApp";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicApp />} />
      <Route path="/admin/*" element={<AdminApp />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
