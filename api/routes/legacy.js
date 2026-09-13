// 레거시 진단·마이그레이션 API. 브라우저 데모(web/src/db/legacyRun.js)와 정확히 같은
// SQL(shared/legacySql.js, api/legacy_migrate.sql)을 실행한다 — 로직을 두 번 만들지 않는다.
import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";
import * as LQ from "../../shared/legacySql.js";
import { generateLegacyRows } from "../../shared/legacyData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrateSql = fs.readFileSync(path.join(__dirname, "..", "legacy_migrate.sql"), "utf8");

export const router = Router();

router.post("/seed", async (req, res, next) => {
    try {
        await pool.query(LQ.legacyClear().text); // 다중 스테이트먼트 — 단순 프로토콜로 실행
        const { rows } = generateLegacyRows();
        const BATCH = 500;
        for (let i = 0; i < rows.length; i += BATCH) {
            const chunk = rows.slice(i, i + BATCH);
            const q = LQ.legacyInsertBatch(chunk);
            await pool.query(q);
        }
        res.json({ inserted: rows.length });
    } catch (err) { next(err); }
});

router.get("/diagnose", async (req, res, next) => {
    try {
        const [rowCount, vesselNames, settleTypes, amountFail, dateFail, typeFail, floatVsNumeric] = await Promise.all([
            pool.query(LQ.diagRowCount()),
            pool.query(LQ.diagDistinctVesselNames()),
            pool.query(LQ.diagDistinctSettleTypes()),
            pool.query(LQ.diagAmountFailures()),
            pool.query(LQ.diagDateFailures()),
            pool.query(LQ.diagTypeFailures()),
            pool.query(LQ.diagFloatVsNumeric()),
        ]);
        res.json({
            rowCount: rowCount.rows[0].n,
            distinctVesselNames: vesselNames.rows[0].n,
            distinctSettleTypes: settleTypes.rows[0].types,
            amountFailures: amountFail.rows[0].n,
            dateFailures: dateFail.rows[0].n,
            typeFailures: typeFail.rows[0].n,
            floatVsNumeric: floatVsNumeric.rows[0],
        });
    } catch (err) { next(err); }
});

router.get("/explain", async (req, res, next) => {
    try {
        const { rows } = await pool.query(LQ.diagExplainContractLookup());
        res.json({ plan: rows.map((r) => r["QUERY PLAN"]).join("\n") });
    } catch (err) { next(err); }
});

router.post("/index", async (req, res, next) => {
    try {
        await pool.query(LQ.createLegacyIndex());
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.delete("/index", async (req, res, next) => {
    try {
        await pool.query(LQ.dropLegacyIndex());
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.post("/migrate", async (req, res, next) => {
    try {
        await pool.query(migrateSql); // 다중 스테이트먼트 스크립트 — 단순 프로토콜, 암묵적 트랜잭션
        res.json({ ok: true });
    } catch (err) { next(err); }
});

router.get("/verify", async (req, res, next) => {
    try {
        const [counts, dedup, balance, recon, errors] = await Promise.all([
            pool.query(LQ.verifyCounts()),
            pool.query(LQ.verifyVesselDedup()),
            pool.query(LQ.verifyBalanceZero()),
            pool.query(LQ.verifyAmountReconciliation()),
            pool.query(LQ.sampleMigrationErrors()),
        ]);
        res.json({
            counts: counts.rows[0],
            dedup: dedup.rows[0],
            balance: balance.rows[0],
            reconciliation: recon.rows[0],
            sampleErrors: errors.rows,
        });
    } catch (err) { next(err); }
});
