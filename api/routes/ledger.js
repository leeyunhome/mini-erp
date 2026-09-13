import { Router } from "express";
import { pool } from "../db.js";
import * as Q from "../../shared/sql.js";

export const router = Router();

router.get("/", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.ledgerList(req.query.contract_id));
        res.json(rows);
    } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.ledgerInsert(req.body));
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
    try {
        await pool.query(Q.ledgerDelete(req.params.id));
        res.status(204).end();
    } catch (err) { next(err); }
});
