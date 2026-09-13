import { Router } from "express";
import { pool } from "../db.js";
import * as Q from "../../shared/sql.js";

export const router = Router();

router.get("/by-contract", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.reportByContract());
        res.json(rows);
    } catch (err) { next(err); }
});

router.get("/monthly", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.reportMonthly());
        res.json(rows);
    } catch (err) { next(err); }
});

router.get("/unsettled", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.reportUnsettled());
        res.json(rows);
    } catch (err) { next(err); }
});
