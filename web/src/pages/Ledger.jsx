import { useEffect, useState } from "react";
import { listContracts, listLedger, createLedgerEntry, deleteLedgerEntry } from "../api.js";

const EMPTY = { entry_type: "HIRE", side: "CREDIT", amount: "", memo: "", settled_at: "" };

export default function Ledger() {
    const [contracts, setContracts] = useState([]);
    const [contractId, setContractId] = useState("");
    const [entries, setEntries] = useState([]);
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listContracts().then((c) => {
            setContracts(c);
            if (c.length && !contractId) setContractId(String(c[0].id));
        });
    }, []);

    async function load(cid) {
        if (!cid) return;
        setLoading(true);
        setEntries(await listLedger(cid));
        setLoading(false);
    }

    useEffect(() => { load(contractId); }, [contractId]);

    async function submit(e) {
        e.preventDefault();
        await createLedgerEntry({ ...form, contract_id: contractId });
        setForm(EMPTY);
        await load(contractId);
    }

    async function remove(id) {
        await deleteLedgerEntry(id);
        await load(contractId);
    }

    const totalCredit = entries.filter((e) => e.side === "CREDIT").reduce((s, e) => s + Number(e.amount), 0);
    const totalDebit = entries.filter((e) => e.side === "DEBIT").reduce((s, e) => s + Number(e.amount), 0);

    return (
        <section>
            <h1>정산 원장</h1>

            <div className="toolbar">
                <label>계약 선택:
                    <select value={contractId} onChange={(e) => setContractId(e.target.value)}>
                        {contracts.map((c) => <option key={c.id} value={c.id}>{c.contract_no} — {c.charterer}</option>)}
                    </select>
                </label>
            </div>

            <form className="card form-grid" onSubmit={submit}>
                <h2>정산 항목 추가</h2>
                <label>항목 유형
                    <select value={form.entry_type} onChange={(e) => setForm({ ...form, entry_type: e.target.value })}>
                        <option value="HIRE">용선료(HIRE)</option>
                        <option value="FUEL">연료비(FUEL)</option>
                        <option value="PORT">항비(PORT)</option>
                        <option value="ADJUSTMENT">정산조정(ADJUSTMENT)</option>
                    </select>
                </label>
                <label>차/대변
                    <select value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
                        <option value="CREDIT">CREDIT (수입)</option>
                        <option value="DEBIT">DEBIT (비용)</option>
                    </select>
                </label>
                <label>금액(USD)
                    <input required type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </label>
                <label>정산일
                    <input required type="date" value={form.settled_at} onChange={(e) => setForm({ ...form, settled_at: e.target.value })} />
                </label>
                <label className="span-2">메모
                    <input value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
                </label>
                <div className="form-actions">
                    <button type="submit" disabled={!contractId}>추가</button>
                </div>
            </form>

            <div className="summary-row">
                <div className="stat"><span>CREDIT 합계</span><strong>${totalCredit.toLocaleString()}</strong></div>
                <div className="stat"><span>DEBIT 합계</span><strong>${totalDebit.toLocaleString()}</strong></div>
                <div className="stat"><span>순정산액</span><strong>${(totalCredit - totalDebit).toLocaleString()}</strong></div>
            </div>

            {loading ? <p>불러오는 중…</p> : (
                <table className="card">
                    <thead><tr><th>유형</th><th>차/대변</th><th>금액</th><th>메모</th><th>정산일</th><th></th></tr></thead>
                    <tbody>
                        {entries.map((e) => (
                            <tr key={e.id}>
                                <td>{e.entry_type}</td>
                                <td><span className={`badge badge-${e.side}`}>{e.side}</span></td>
                                <td>${Number(e.amount).toLocaleString()}</td>
                                <td>{e.memo}</td>
                                <td>{e.settled_at}</td>
                                <td className="row-actions"><button onClick={() => remove(e.id)}>삭제</button></td>
                            </tr>
                        ))}
                        {entries.length === 0 && <tr><td colSpan={6}>정산 내역이 없습니다.</td></tr>}
                    </tbody>
                </table>
            )}
        </section>
    );
}
