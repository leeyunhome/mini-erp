import { Router } from "express";
import { pool } from "../db.js";
import * as LQ from "../../shared/legacySql.js";

export const router = Router();

router.get("/trial-balance", async (req, res, next) => {
    try {
        const [rows, grand] = await Promise.all([
            pool.query(LQ.trialBalance()),
            pool.query(LQ.trialBalanceGrandTotal()),
        ]);
        res.json({ accounts: rows.rows, grandTotal: grand.rows[0] });
    } catch (err) { next(err); }
});
