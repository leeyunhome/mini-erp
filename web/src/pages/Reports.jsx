import { useEffect, useState } from "react";
import { reportByContract, reportMonthly, reportUnsettled } from "../api.js";

export default function Reports() {
    const [byContract, setByContract] = useState([]);
    const [monthly, setMonthly] = useState([]);
    const [unsettled, setUnsettled] = useState([]);

    useEffect(() => {
        reportByContract().then(setByContract);
        reportMonthly().then(setMonthly);
        reportUnsettled().then(setUnsettled);
    }, []);

    const maxRevenue = Math.max(1, ...monthly.map((m) => Number(m.hire_revenue)));

    return (
        <section>
            <h1>집계 리포트</h1>

            <div className="card">
                <h2>계약별 정산 집계</h2>
                <p className="hint">SQL: charter_contracts ⋈ vessels ⋈ ledger_entries, GROUP BY + 상관 서브쿼리(정산 건수)</p>
                <table>
                    <thead><tr><th>계약번호</th><th>선박</th><th>용선주</th><th>CREDIT</th><th>DEBIT</th><th>순정산액</th><th>건수</th></tr></thead>
                    <tbody>
                        {byContract.map((r) => (
                            <tr key={r.id}>
                                <td>{r.contract_no}</td>
                                <td>{r.vessel_name}</td>
                                <td>{r.charterer}</td>
                                <td>${Number(r.total_credit).toLocaleString()}</td>
                                <td>${Number(r.total_debit).toLocaleString()}</td>
                                <td><strong>${Number(r.net_amount).toLocaleString()}</strong></td>
                                <td>{r.entry_count}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="card">
                <h2>월별 용선료 매출</h2>
                <p className="hint">SQL: date_trunc('month', settled_at) GROUP BY</p>
                <div className="bar-chart">
                    {monthly.map((m) => (
                        <div className="bar-row" key={m.month}>
                            <span className="bar-label">{m.month}</span>
                            <div className="bar-track">
                                <div className="bar-fill" style={{ width: `${(Number(m.hire_revenue) / maxRevenue) * 100}%` }} />
                            </div>
                            <span className="bar-value">${Number(m.hire_revenue).toLocaleString()}</span>
                        </div>
                    ))}
                    {monthly.length === 0 && <p>데이터가 없습니다.</p>}
                </div>
            </div>

            <div className="card">
                <h2>미정산 계약</h2>
                <p className="hint">SQL: NOT EXISTS 서브쿼리 (ledger_entries에 정산 내역이 없는 계약)</p>
                <table>
                    <thead><tr><th>계약번호</th><th>선박</th><th>용선주</th><th>상태</th></tr></thead>
                    <tbody>
                        {unsettled.map((r) => (
                            <tr key={r.id}><td>{r.contract_no}</td><td>{r.vessel_name}</td><td>{r.charterer}</td><td>{r.status}</td></tr>
                        ))}
                        {unsettled.length === 0 && <tr><td colSpan={4}>미정산 계약이 없습니다.</td></tr>}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
