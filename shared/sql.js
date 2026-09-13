// 기존 4개 모듈(계약·정산·리포트·선박)의 SQL을 그대로 옮겨온 곳.
// Express 라우트(api/routes/*.js)와 브라우저 데모(web/src/api.js, PGlite 실행)가
// 이 파일을 함께 import해서 완전히 동일한 SQL 문자열을 실행한다 — 데모가 SQL을
// JS로 다시 구현하지 않는다는 것을 코드 구조 자체로 보장한다.

// ---- 계약 (charter_contracts) ----

export function contractsList(status) {
    return {
        text: `SELECT cc.id, cc.contract_no, cc.charterer, cc.charter_type, cc.daily_rate,
                      cc.start_date, cc.end_date, cc.status, v.name AS vessel_name, v.vessel_type
               FROM charter_contracts cc
               JOIN vessels v ON v.id = cc.vessel_id
               ${status ? "WHERE cc.status = $1" : ""}
               ORDER BY cc.start_date DESC`,
        values: status ? [status] : [],
    };
}

export function contractById(id) {
    return {
        text: `SELECT cc.*, v.name AS vessel_name, v.vessel_type
               FROM charter_contracts cc
               JOIN vessels v ON v.id = cc.vessel_id
               WHERE cc.id = $1`,
        values: [id],
    };
}

export function contractInsert({ contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status }) {
    return {
        text: `INSERT INTO charter_contracts
                (contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status)
               VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, 'ACTIVE'))
               RETURNING *`,
        values: [contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status],
    };
}

export function contractUpdate(id, { charterer, charter_type, daily_rate, start_date, end_date, status }) {
    return {
        text: `UPDATE charter_contracts
               SET charterer = $1, charter_type = $2, daily_rate = $3,
                   start_date = $4, end_date = $5, status = $6
               WHERE id = $7
               RETURNING *`,
        values: [charterer, charter_type, daily_rate, start_date, end_date, status, id],
    };
}

export function contractDelete(id) {
    return { text: `DELETE FROM charter_contracts WHERE id = $1`, values: [id] };
}

// ---- 선박 (vessels) ----

export function vesselsList() {
    return { text: `SELECT * FROM vessels ORDER BY id`, values: [] };
}

// ---- 정산 원장 (ledger_entries) ----

export function ledgerList(contract_id) {
    return {
        text: `SELECT le.*, cc.contract_no
               FROM ledger_entries le
               JOIN charter_contracts cc ON cc.id = le.contract_id
               ${contract_id ? "WHERE le.contract_id = $1" : ""}
               ORDER BY le.settled_at DESC`,
        values: contract_id ? [contract_id] : [],
    };
}

export function ledgerInsert({ contract_id, entry_type, side, amount, memo, settled_at }) {
    return {
        text: `INSERT INTO ledger_entries (contract_id, entry_type, side, amount, memo, settled_at)
               VALUES ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
        values: [contract_id, entry_type, side, amount, memo, settled_at],
    };
}

export function ledgerDelete(id) {
    return { text: `DELETE FROM ledger_entries WHERE id = $1`, values: [id] };
}

// ---- 집계 리포트 ----

export function reportByContract() {
    return {
        text: `SELECT
                    cc.id, cc.contract_no, cc.charterer, v.name AS vessel_name,
                    COALESCE(SUM(CASE WHEN le.side = 'CREDIT' THEN le.amount ELSE 0 END), 0) AS total_credit,
                    COALESCE(SUM(CASE WHEN le.side = 'DEBIT'  THEN le.amount ELSE 0 END), 0) AS total_debit,
                    COALESCE(SUM(CASE WHEN le.side = 'CREDIT' THEN le.amount ELSE -le.amount END), 0) AS net_amount,
                    (SELECT COUNT(*) FROM ledger_entries e WHERE e.contract_id = cc.id) AS entry_count
               FROM charter_contracts cc
               JOIN vessels v ON v.id = cc.vessel_id
               LEFT JOIN ledger_entries le ON le.contract_id = cc.id
               GROUP BY cc.id, cc.contract_no, cc.charterer, v.name
               ORDER BY net_amount DESC`,
        values: [],
    };
}

export function reportMonthly() {
    return {
        text: `SELECT
                    to_char(date_trunc('month', settled_at), 'YYYY-MM') AS month,
                    SUM(amount) AS hire_revenue
               FROM ledger_entries
               WHERE entry_type = 'HIRE' AND side = 'CREDIT'
               GROUP BY date_trunc('month', settled_at)
               ORDER BY month`,
        values: [],
    };
}

export function reportUnsettled() {
    return {
        text: `SELECT cc.id, cc.contract_no, cc.charterer, cc.status, v.name AS vessel_name
               FROM charter_contracts cc
               JOIN vessels v ON v.id = cc.vessel_id
               WHERE NOT EXISTS (
                   SELECT 1 FROM ledger_entries le WHERE le.contract_id = cc.id
               )
               ORDER BY cc.start_date DESC`,
        values: [],
    };
}
