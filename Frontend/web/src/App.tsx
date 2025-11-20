import { BrowserRouter, Routes, Route } from "react-router-dom";

//import "./styles/App.css";

// import các trang (pages)
import LoginPage from "./pages/LoginPage.tsx";
import DashBoard from "./pages/DashBoard.tsx";
import PatientProfile from "./pages/PatientProfile.tsx";
import ThresholdAlert from "./pages/ThresholdAlert.tsx";
import NotFound from "./pages/NotFound.tsx";

import MainLayout from "./components/layout/MainLayout.tsx";

function App() {
  return (
    <BrowserRouter>
      {/* Routes chỉ được chứa Route con trực tiếp */}
      <Routes>
        {/* --- NHÓM 1: Trang KHÔNG có Sidebar (Login) --- */}
        <Route path="/Login" element={<LoginPage />} />

        {/* --- NHÓM 2: Trang CÓ Sidebar (Dùng Layout) --- */}
        {/* Route này đóng vai trò là Wrapper, không có path riêng */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<DashBoard />} />
          <Route path="/patient-profile" element={<PatientProfile />} />
          <Route path="/threshold-alerts" element={<ThresholdAlert />} />
          {/* Route cho trang không tìm thấy */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
