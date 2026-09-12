import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
    const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
    const seed = fs.readFileSync(path.join(__dirname, "..", "seed.sql"), "utf8");
    await pool.query(schema);
    await pool.query(seed);
    console.log("schema + seed applied");
    await pool.end();
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
