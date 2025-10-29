import { BrowserRouter, Routes, Route } from "react-router-dom";

//import "./styles/App.css";

// import các trang (pages)
import LoginPage from "./pages/LoginPage.tsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/Login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
