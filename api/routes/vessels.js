import { Router } from "express";
import { pool } from "../db.js";
import * as Q from "../../shared/sql.js";

export const router = Router();

router.get("/", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.vesselsList());
        res.json(rows);
    } catch (err) { next(err); }
});
