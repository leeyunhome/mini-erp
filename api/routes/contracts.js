import { Router } from "express";
import { pool } from "../db.js";

export const router = Router();

// 목록 — 선박명 JOIN
router.get("/", async (req, res, next) => {
    try {
        const { status } = req.query;
        const where = status ? "WHERE cc.status = $1" : "";
        const params = status ? [status] : [];
        const { rows } = await pool.query(
            `SELECT cc.id, cc.contract_no, cc.charterer, cc.charter_type, cc.daily_rate,
                    cc.start_date, cc.end_date, cc.status, v.name AS vessel_name, v.vessel_type
             FROM charter_contracts cc
             JOIN vessels v ON v.id = cc.vessel_id
             ${where}
             ORDER BY cc.start_date DESC`,
            params
        );
        res.json(rows);
    } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
    try {
        const { rows } = await pool.query(
            `SELECT cc.*, v.name AS vessel_name, v.vessel_type
             FROM charter_contracts cc
             JOIN vessels v ON v.id = cc.vessel_id
             WHERE cc.id = $1`,
            [req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: "not found" });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
    try {
        const { contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO charter_contracts
                (contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'ACTIVE'))
             RETURNING *`,
            [contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status]
        );
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
    try {
        const { charterer, charter_type, daily_rate, start_date, end_date, status } = req.body;
        const { rows } = await pool.query(
            `UPDATE charter_contracts
             SET charterer = $1, charter_type = $2, daily_rate = $3,
                 start_date = $4, end_date = $5, status = $6
             WHERE id = $7
             RETURNING *`,
            [charterer, charter_type, daily_rate, start_date, end_date, status, req.params.id]
        );
        if (!rows[0]) return res.status(404).json({ error: "not found" });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
    try {
        await pool.query("DELETE FROM charter_contracts WHERE id = $1", [req.params.id]);
        res.status(204).end();
    } catch (err) { next(err); }
});
