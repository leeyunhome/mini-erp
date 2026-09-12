import { Router } from "express";
import { pool } from "../db.js";

export const router = Router();

router.get("/", async (req, res, next) => {
    try {
        const { rows } = await pool.query("SELECT * FROM vessels ORDER BY id");
        res.json(rows);
    } catch (err) { next(err); }
});
