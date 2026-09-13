// Legacy.jsx가 쓰는 브라우저 실행 계층. api/routes/legacy.js와 완전히 같은 SQL
// (shared/legacySql.js, api/legacy_migrate.sql)을 그대로 실행한다.
import { getDb } from "./pglite.js";
import * as LQ from "../../../shared/legacySql.js";
import { generateLegacyRows } from "../../../shared/legacyData.js";
import migrateSql from "../../../api/legacy_migrate.sql?raw";

async function run(q) {
    const db = await getDb();
    const { rows } = await db.query(q.text, q.values);
    return rows;
}

export async function seed() {
    const db = await getDb();
    await db.exec(LQ.legacyClear().text); // 다중 스테이트먼트라 exec() — query()는 단일 명령만 허용
    const { rows } = generateLegacyRows();
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
        const chunk = rows.slice(i, i + BATCH);
        const q = LQ.legacyInsertBatch(chunk);
        await db.query(q.text, q.values);
    }
    return rows.length;
}

export async function diagnose() {
    const [rowCount, vesselNames, settleTypes, amountFail, dateFail, typeFail, fv] = await Promise.all([
        run(LQ.diagRowCount()),
        run(LQ.diagDistinctVesselNames()),
        run(LQ.diagDistinctSettleTypes()),
        run(LQ.diagAmountFailures()),
        run(LQ.diagDateFailures()),
        run(LQ.diagTypeFailures()),
        run(LQ.diagFloatVsNumeric()),
    ]);
    return {
        rowCount: rowCount[0].n,
        distinctVesselNames: vesselNames[0].n,
        distinctSettleTypes: settleTypes[0].types,
        amountFailures: amountFail[0].n,
        dateFailures: dateFail[0].n,
        typeFailures: typeFail[0].n,
        floatVsNumeric: fv[0],
    };
}

export async function explain() {
    const rows = await run(LQ.diagExplainContractLookup());
    return rows.map((r) => r["QUERY PLAN"]).join("\n");
}

export async function createIndex() {
    const db = await getDb();
    await db.query(LQ.createLegacyIndex().text);
}

export async function dropIndex() {
    const db = await getDb();
    await db.query(LQ.dropLegacyIndex().text);
}

export async function migrate() {
    const db = await getDb();
    await db.exec(migrateSql); // 다중 스테이트먼트 스크립트 — exec()로 실행, 실패 시 전체 롤백
}

export async function verify() {
    const [counts, dedup, balance, recon, errors] = await Promise.all([
        run(LQ.verifyCounts()),
        run(LQ.verifyVesselDedup()),
        run(LQ.verifyBalanceZero()),
        run(LQ.verifyAmountReconciliation()),
        run(LQ.sampleMigrationErrors()),
    ]);
    return {
        counts: counts[0],
        dedup: dedup[0],
        balance: balance[0],
        reconciliation: recon[0],
        sampleErrors: errors,
    };
}
