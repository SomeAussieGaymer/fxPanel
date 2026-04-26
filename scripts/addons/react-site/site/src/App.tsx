import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { HomePage } from "./pages/Home";
import { ForumsPage } from "./pages/Forums";
import { ApplicationsPage } from "./pages/Applications";
import { StorePage } from "./pages/Store";
import { RulesPage } from "./pages/Rules";
import { StaffPage } from "./pages/Staff";

export default function App() {
  return (
    <BrowserRouter>
      <div className="bg-slate-950 text-white min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/forums" element={<ForumsPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/store" element={<StorePage />} />
            <Route path="/rules" element={<RulesPage />} />
            <Route path="/staff" element={<StaffPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
