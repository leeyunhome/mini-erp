import { Router } from "express";
import { pool } from "../db.js";

export const router = Router();

// 특정 계약의 정산 원장 (?contract_id=)
router.get("/", async (req, res, next) => {
    try {
        const { contract_id } = req.query;
        const where = contract_id ? "WHERE le.contract_id = $1" : "";
        const params = contract_id ? [contract_id] : [];
        const { rows } = await pool.query(
            `SELECT le.*, cc.contract_no
             FROM ledger_entries le
             JOIN charter_contracts cc ON cc.id = le.contract_id
             ${where}
             ORDER BY le.settled_at DESC`,
            params
        );
        res.json(rows);
    } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
    try {
        const { contract_id, entry_type, side, amount, memo, settled_at } = req.body;
        const { rows } = await pool.query(
            `INSERT INTO ledger_entries (contract_id, entry_type, side, amount, memo, settled_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [contract_id, entry_type, side, amount, memo, settled_at]
        );
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
    try {
        await pool.query("DELETE FROM ledger_entries WHERE id = $1", [req.params.id]);
        res.status(204).end();
    } catch (err) { next(err); }
});
