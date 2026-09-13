import { NavLink, Routes, Route, Navigate } from "react-router-dom";
import Contracts from "./pages/Contracts.jsx";
import Ledger from "./pages/Ledger.jsx";
import Reports from "./pages/Reports.jsx";
import Legacy from "./pages/Legacy.jsx";
import Accounting from "./pages/Accounting.jsx";
import { isDemo } from "./api.js";

export default function App() {
    return (
        <div className="app">
            <header className="topbar">
                <div className="brand">mini-erp</div>
                <nav>
                    <NavLink to="/contracts" className={({ isActive }) => (isActive ? "active" : "")}>용선계약</NavLink>
                    <NavLink to="/ledger" className={({ isActive }) => (isActive ? "active" : "")}>정산 원장</NavLink>
                    <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>집계 리포트</NavLink>
                    <NavLink to="/legacy" className={({ isActive }) => (isActive ? "active" : "")}>레거시 진단</NavLink>
                    <NavLink to="/accounting" className={({ isActive }) => (isActive ? "active" : "")}>시산표</NavLink>
                </nav>
                {isDemo && <span className="demo-badge">DEMO (브라우저 내장 PostgreSQL · PGlite)</span>}
            </header>
            <main>
                <Routes>
                    <Route path="/" element={<Navigate to="/contracts" replace />} />
                    <Route path="/contracts" element={<Contracts />} />
                    <Route path="/ledger" element={<Ledger />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/legacy" element={<Legacy />} />
                    <Route path="/accounting" element={<Accounting />} />
                </Routes>
            </main>
        </div>
    );
}
