import { Router } from "express";
import { pool } from "../db.js";
import * as Q from "../../shared/sql.js";

export const router = Router();

router.get("/", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.contractsList(req.query.status));
        res.json(rows);
    } catch (err) { next(err); }
});

router.get("/:id", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.contractById(req.params.id));
        if (!rows[0]) return res.status(404).json({ error: "not found" });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.post("/", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.contractInsert(req.body));
        res.status(201).json(rows[0]);
    } catch (err) { next(err); }
});

router.put("/:id", async (req, res, next) => {
    try {
        const { rows } = await pool.query(Q.contractUpdate(req.params.id, req.body));
        if (!rows[0]) return res.status(404).json({ error: "not found" });
        res.json(rows[0]);
    } catch (err) { next(err); }
});

router.delete("/:id", async (req, res, next) => {
    try {
        await pool.query(Q.contractDelete(req.params.id));
        res.status(204).end();
    } catch (err) { next(err); }
});
