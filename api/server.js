import express from "express";
import cors from "cors";
import { router as contractsRouter } from "./routes/contracts.js";
import { router as ledgerRouter } from "./routes/ledger.js";
import { router as reportsRouter } from "./routes/reports.js";
import { router as vesselsRouter } from "./routes/vessels.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/contracts", contractsRouter);
app.use("/api/ledger", ledgerRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/vessels", vesselsRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`charter-ledger api listening on :${PORT}`));
