import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Contracts from "./pages/Contracts.jsx";
import Ledger from "./pages/Ledger.jsx";
import Reports from "./pages/Reports.jsx";
import { isDemo } from "./api.js";

export default function App() {
    return (
        <div className="app">
            <header className="topbar">
                <div className="brand">charter-ledger</div>
                <nav>
                    <NavLink to="/contracts" className={({ isActive }) => (isActive ? "active" : "")}>용선계약</NavLink>
                    <NavLink to="/ledger" className={({ isActive }) => (isActive ? "active" : "")}>정산 원장</NavLink>
                    <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>집계 리포트</NavLink>
                </nav>
                {isDemo && <span className="demo-badge">DEMO (인메모리 목 데이터)</span>}
            </header>
            <main>
                <Routes>
                    <Route path="/" element={<Navigate to="/contracts" replace />} />
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/reports" element={<Reports />} />
                </Routes>
            </main>
        </div>
    );
}
