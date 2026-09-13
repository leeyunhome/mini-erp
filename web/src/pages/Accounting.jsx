import { useEffect, useState } from "react";
import { trialBalance } from "../db/accountingRun.js";

export default function Accounting() {
    const [data, setData] = useState(null);

    useEffect(() => { trialBalance().then(setData); }, []);

    if (!data) return <section><h1>시산표</h1><p className="hint">불러오는 중…</p></section>;

    const { accounts, grandTotal } = data;
    const balanced = Number(grandTotal.debit_total) === Number(grandTotal.credit_total);

    return (
        <section>
            <h1>시산표 (Trial Balance)</h1>
            <p className="hint">
                모든 전표는 계정과목(accounts)·복식부기 원장(journal_entries/journal_lines)에 저장되며,
                전표별 차변합=대변합은 DB 트리거로 강제됩니다. 수동 입력 전표와 "레거시 진단" 탭에서
                마이그레이션한 전표가 이 표 하나에 함께 집계됩니다.
            </p>

            <div className="card">
                <h2>계정별 잔액</h2>
                <table>
                    <thead><tr><th>코드</th><th>계정과목</th><th>구분</th><th>차변</th><th>대변</th></tr></thead>
                    <tbody>
                        {accounts.map((a) => (
                            <tr key={a.code}>
                                <td>{a.code}</td>
                                <td>{a.name}</td>
                                <td>{a.account_type}</td>
                                <td>{Number(a.debit_total).toLocaleString()}</td>
                                <td>{Number(a.credit_total).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="summary-row">
                <div className="stat"><span>차변 합계</span><strong>{Number(grandTotal.debit_total).toLocaleString()}</strong></div>
                <div className="stat"><span>대변 합계</span><strong>{Number(grandTotal.credit_total).toLocaleString()}</strong></div>
                <div className="stat">
                    <span>정합성</span>
                    <strong style={{ color: balanced ? "#166534" : "#991b1b" }}>{balanced ? "일치 (복식부기 성립)" : "불일치"}</strong>
                </div>
            </div>
        </section>
    );
}
