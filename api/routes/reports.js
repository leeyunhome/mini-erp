import { Router } from "express";
import { pool } from "../db.js";

export const router = Router();

// 1) 계약별 정산 집계 — JOIN + GROUP BY, 서브쿼리로 미결 건수 계산
router.get("/by-contract", async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                cc.id, cc.contract_no, cc.charterer, v.name AS vessel_name,
                COALESCE(SUM(CASE WHEN le.side = 'CREDIT' THEN le.amount ELSE 0 END), 0) AS total_credit,
                COALESCE(SUM(CASE WHEN le.side = 'DEBIT'  THEN le.amount ELSE 0 END), 0) AS total_debit,
                COALESCE(SUM(CASE WHEN le.side = 'CREDIT' THEN le.amount ELSE -le.amount END), 0) AS net_amount,
                (SELECT COUNT(*) FROM ledger_entries e WHERE e.contract_id = cc.id) AS entry_count
            FROM charter_contracts cc
            JOIN vessels v ON v.id = cc.vessel_id
            LEFT JOIN ledger_entries le ON le.contract_id = cc.id
            GROUP BY cc.id, cc.contract_no, cc.charterer, v.name
            ORDER BY net_amount DESC
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// 2) 월별 매출(용선료 CREDIT) 집계 — date_trunc + GROUP BY
router.get("/monthly", async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT
                to_char(date_trunc('month', settled_at), 'YYYY-MM') AS month,
                SUM(amount) AS hire_revenue
            FROM ledger_entries
            WHERE entry_type = 'HIRE' AND side = 'CREDIT'
            GROUP BY date_trunc('month', settled_at)
            ORDER BY month
        `);
        res.json(rows);
    } catch (err) { next(err); }
});

// 3) 정산 원장이 하나도 없는(미정산) 계약 — NOT EXISTS 서브쿼리
router.get("/unsettled", async (req, res, next) => {
    try {
        const { rows } = await pool.query(`
            SELECT cc.id, cc.contract_no, cc.charterer, cc.status, v.name AS vessel_name
            FROM charter_contracts cc
            JOIN vessels v ON v.id = cc.vessel_id
            WHERE NOT EXISTS (
                SELECT 1 FROM ledger_entries le WHERE le.contract_id = cc.id
            )
            ORDER BY cc.start_date DESC
        `);
        res.json(rows);
    } catch (err) { next(err); }
});
