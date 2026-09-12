import { useEffect, useState } from "react";
import { listContracts, createContract, updateContract, deleteContract, listVessels } from "../api.js";

const EMPTY = { vessel_id: "", charterer: "", charter_type: "TIME", daily_rate: "", start_date: "", end_date: "", status: "ACTIVE" };

export default function Contracts() {
    const [contracts, setContracts] = useState([]);
    const [vessels, setVessels] = useState([]);
    const [statusFilter, setStatusFilter] = useState("");
    const [form, setForm] = useState(EMPTY);
    const [editingId, setEditingId] = useState(null);
    const [loading, setLoading] = useState(true);

    async function load() {
        setLoading(true);
        const [c, v] = await Promise.all([listContracts(statusFilter || undefined), listVessels()]);
        setContracts(c);
        setVessels(v);
        setLoading(false);
    }

    useEffect(() => { load(); }, [statusFilter]);

    function startEdit(c) {
        setEditingId(c.id);
        setForm({
            vessel_id: c.vessel_id, charterer: c.charterer, charter_type: c.charter_type,
            daily_rate: c.daily_rate, start_date: c.start_date, end_date: c.end_date, status: c.status,
        });
    }

    async function submit(e) {
        e.preventDefault();
        if (editingId) {
            await updateContract(editingId, form);
        } else {
            const contract_no = `CC-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, "0")}`;
            await createContract({ ...form, contract_no });
        }
        setForm(EMPTY);
        setEditingId(null);
        await load();
    }

    async function remove(id) {
        if (!confirm("이 계약을 삭제할까요?")) return;
        await deleteContract(id);
        await load();
    }

    return (
        <section>
            <h1>용선계약 관리</h1>

            <div className="toolbar">
                <label>
                    상태 필터:
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                        <option value="">전체</option>
                        <option value="ACTIVE">진행중</option>
                        <option value="CLOSED">종료</option>
                        <option value="CANCELLED">취소</option>
                    </select>
                </label>
            </div>

            <form className="card form-grid" onSubmit={submit}>
                <h2>{editingId ? `계약 수정 (#${editingId})` : "신규 계약 등록"}</h2>
                <label>선박
                    <select required value={form.vessel_id} onChange={(e) => setForm({ ...form, vessel_id: e.target.value })}>
                        <option value="" disabled>선택</option>
                        {vessels.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.vessel_type})</option>)}
                    </select>
                </label>
                <label>용선주
                    <input required value={form.charterer} onChange={(e) => setForm({ ...form, charterer: e.target.value })} />
                </label>
                <label>용선 형태
                    <select value={form.charter_type} onChange={(e) => setForm({ ...form, charter_type: e.target.value })}>
                        <option value="TIME">정기용선(TIME)</option>
                        <option value="VOYAGE">항해용선(VOYAGE)</option>
                        <option value="BAREBOAT">나용선(BAREBOAT)</option>
                    </select>
                </label>
                <label>일일 용선료(USD)
                    <input required type="number" step="0.01" value={form.daily_rate}
                        onChange={(e) => setForm({ ...form, daily_rate: e.target.value })} />
                </label>
                <label>시작일
                    <input required type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </label>
                <label>종료일
                    <input required type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </label>
                <label>상태
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                        <option value="ACTIVE">진행중</option>
                        <option value="CLOSED">종료</option>
                        <option value="CANCELLED">취소</option>
                    </select>
                </label>
                <div className="form-actions">
                    <button type="submit">{editingId ? "수정 저장" : "등록"}</button>
                    {editingId && <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }}>취소</button>}
                </div>
            </form>

            {loading ? <p>불러오는 중…</p> : (
                <table className="card">
                    <thead>
                        <tr>
                            <th>계약번호</th><th>선박</th><th>용선주</th><th>형태</th>
                            <th>일일용선료</th><th>기간</th><th>상태</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {contracts.map((c) => (
                            <tr key={c.id}>
                                <td>{c.contract_no}</td>
                                <td>{c.vessel_name}</td>
                                <td>{c.charterer}</td>
                                <td>{c.charter_type}</td>
                                <td>${Number(c.daily_rate).toLocaleString()}</td>
                                <td>{c.start_date} ~ {c.end_date}</td>
                                <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                                <td className="row-actions">
                                    <button onClick={() => startEdit(c)}>수정</button>
                                    <button onClick={() => remove(c.id)}>삭제</button>
                                </td>
                            </tr>
                        ))}
                        {contracts.length === 0 && <tr><td colSpan={8}>계약이 없습니다.</td></tr>}
                    </tbody>
                </table>
            )}
        </section>
    );
}
