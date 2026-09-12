// 백엔드(Express+PostgreSQL) API 클라이언트.
// GitHub Pages는 정적 호스팅이라 백엔드를 띄울 수 없으므로, 빌드 시 VITE_DEMO=true면
// 인메모리 목 데이터로 동일한 화면을 그대로 보여줍니다(README 참고).
import * as store from "./mock/data.js";

const DEMO = import.meta.env.VITE_DEMO === "true";
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));

async function real(path, opts) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...opts,
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
}

// ---- 계약 ----
export async function listContracts(status) {
    if (DEMO) {
        await delay();
        return status ? store.contracts.filter((c) => c.status === status) : store.contracts;
    }
    return real(`/contracts${status ? `?status=${status}` : ""}`);
}

export async function createContract(data) {
    if (DEMO) {
        await delay();
        const vessel = store.vessels.find((v) => v.id === Number(data.vessel_id));
        const row = {
            id: store.nextContractIdGen(),
            vessel_name: vessel?.name, vessel_type: vessel?.vessel_type,
            status: "ACTIVE", ...data, vessel_id: Number(data.vessel_id),
            daily_rate: Number(data.daily_rate),
        };
        store.addContract(row);
        return row;
    }
    return real("/contracts", { method: "POST", body: JSON.stringify(data) });
}

export async function updateContract(id, data) {
    if (DEMO) {
        await delay();
        return store.replaceContract(Number(id), { ...data, daily_rate: Number(data.daily_rate) });
    }
    return real(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteContract(id) {
    if (DEMO) {
        await delay();
        store.removeContract(Number(id));
        return null;
    }
    return real(`/contracts/${id}`, { method: "DELETE" });
}

// ---- 선박 ----
export async function listVessels() {
    if (DEMO) { await delay(); return store.vessels; }
    return real("/vessels");
}

// ---- 정산 원장 ----
export async function listLedger(contractId) {
    if (DEMO) {
        await delay();
        return store.ledgerEntries.filter((e) => e.contract_id === Number(contractId));
    }
    return real(`/ledger?contract_id=${contractId}`);
}

export async function createLedgerEntry(data) {
    if (DEMO) {
        await delay();
        const contract = store.contracts.find((c) => c.id === Number(data.contract_id));
        const row = {
            id: store.nextLedgerIdGen(),
            contract_no: contract?.contract_no,
            ...data,
            contract_id: Number(data.contract_id),
            amount: Number(data.amount),
        };
        store.addLedgerEntry(row);
        return row;
    }
    return real("/ledger", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteLedgerEntry(id) {
    if (DEMO) {
        await delay();
        store.removeLedgerEntry(Number(id));
        return null;
    }
    return real(`/ledger/${id}`, { method: "DELETE" });
}

// ---- 리포트 (백엔드 SQL과 동일한 집계 로직을 클라이언트에서 재현) ----
export async function reportByContract() {
    if (DEMO) {
        await delay();
        return store.contracts.map((c) => {
            const entries = store.ledgerEntries.filter((e) => e.contract_id === c.id);
            const total_credit = entries.filter((e) => e.side === "CREDIT").reduce((s, e) => s + e.amount, 0);
            const total_debit = entries.filter((e) => e.side === "DEBIT").reduce((s, e) => s + e.amount, 0);
            return {
                id: c.id, contract_no: c.contract_no, charterer: c.charterer, vessel_name: c.vessel_name,
                total_credit, total_debit, net_amount: total_credit - total_debit, entry_count: entries.length,
            };
        }).sort((a, b) => b.net_amount - a.net_amount);
    }
    return real("/reports/by-contract");
}

export async function reportMonthly() {
    if (DEMO) {
        await delay();
        const map = new Map();
        store.ledgerEntries
            .filter((e) => e.entry_type === "HIRE" && e.side === "CREDIT")
            .forEach((e) => {
                const month = e.settled_at.slice(0, 7);
                map.set(month, (map.get(month) || 0) + e.amount);
            });
        return [...map.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, hire_revenue]) => ({ month, hire_revenue }));
    }
    return real("/reports/monthly");
}

export async function reportUnsettled() {
    if (DEMO) {
        await delay();
        const withEntries = new Set(store.ledgerEntries.map((e) => e.contract_id));
        return store.contracts.filter((c) => !withEntries.has(c.id));
    }
    return real("/reports/unsettled");
}

export const isDemo = DEMO;
