// 백엔드(Express+PostgreSQL) API 클라이언트.
// GitHub Pages는 정적 호스팅이라 Express+PostgreSQL 백엔드를 띄울 수 없다. VITE_DEMO=true면
// JS로 흉내낸 목 데이터가 아니라, 브라우저에 내장된 실제 PostgreSQL(PGlite)에 백엔드와
// 완전히 동일한 SQL(shared/sql.js)을 그대로 실행한다 — api/routes/*.js가 실행하는 쿼리와
// 텍스트 단위로 같다.
import { getDb, DATE_OPTS } from "./db/pglite.js";
import * as Q from "../../shared/sql.js";

const DEMO = import.meta.env.VITE_DEMO === "true";
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

async function real(path, opts) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...opts,
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    if (res.status === 204) return null;
    return res.json();
}

async function demo(queryObj) {
    const db = await getDb();
    const { rows } = await db.query(queryObj.text, queryObj.values, DATE_OPTS);
    return rows;
}

// ---- 계약 ----
export async function listContracts(status) {
    if (DEMO) return demo(Q.contractsList(status));
    return real(`/contracts${status ? `?status=${status}` : ""}`);
}

export async function createContract(data) {
    if (DEMO) {
        const rows = await demo(Q.contractInsert({ ...data, vessel_id: Number(data.vessel_id), daily_rate: Number(data.daily_rate) }));
        return rows[0];
    }
    return real("/contracts", { method: "POST", body: JSON.stringify(data) });
}

export async function updateContract(id, data) {
    if (DEMO) {
        const rows = await demo(Q.contractUpdate(id, { ...data, daily_rate: Number(data.daily_rate) }));
        return rows[0];
    }
    return real(`/contracts/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export async function deleteContract(id) {
    if (DEMO) { await demo(Q.contractDelete(id)); return null; }
    return real(`/contracts/${id}`, { method: "DELETE" });
}

// ---- 선박 ----
export async function listVessels() {
    if (DEMO) return demo(Q.vesselsList());
    return real("/vessels");
}

// ---- 정산 원장 ----
export async function listLedger(contractId) {
    if (DEMO) return demo(Q.ledgerList(contractId));
    return real(`/ledger?contract_id=${contractId}`);
}

export async function createLedgerEntry(data) {
    if (DEMO) {
        const rows = await demo(Q.ledgerInsert({ ...data, contract_id: Number(data.contract_id), amount: Number(data.amount) }));
        return rows[0];
    }
    return real("/ledger", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteLedgerEntry(id) {
    if (DEMO) { await demo(Q.ledgerDelete(id)); return null; }
    return real(`/ledger/${id}`, { method: "DELETE" });
}

// ---- 리포트 (백엔드와 완전히 같은 SQL을 그대로 실행 — 집계 로직 재구현 없음) ----
export async function reportByContract() {
    if (DEMO) return demo(Q.reportByContract());
    return real("/reports/by-contract");
}

export async function reportMonthly() {
    if (DEMO) return demo(Q.reportMonthly());
    return real("/reports/monthly");
}

export async function reportUnsettled() {
    if (DEMO) return demo(Q.reportUnsettled());
    return real("/reports/unsettled");
}

export const isDemo = DEMO;
