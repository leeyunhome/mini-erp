import { getDb } from "./pglite.js";
import * as LQ from "../../../shared/legacySql.js";

export async function trialBalance() {
    const db = await getDb();
    const [accounts, grand] = await Promise.all([
        db.query(LQ.trialBalance().text),
        db.query(LQ.trialBalanceGrandTotal().text),
    ]);
    return { accounts: accounts.rows, grandTotal: grand.rows[0] };
}
