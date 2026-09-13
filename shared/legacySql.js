// 레거시 진단·마이그레이션·회계(시산표) SQL. Express(api/routes/legacy.js,
// accounting.js)와 브라우저 데모(web/src/db/legacyRun.js)가 함께 가져다 쓴다.
// 실제 EEXPLAIN ANALYZE·트리거·정제 로직은 스키마(schema.sql)와 마이그레이션
// 스크립트(legacy_migrate.sql)에 있고, 여기는 그걸 호출하는 얇은 SQL 모음이다.

export const DEMO_CONTRACT_NO = "LC-2019-0000"; // 결정론적 생성기 기준 항상 존재

export function legacyClear() {
    return {
        text: `TRUNCATE legacy_settlements, legacy_migration_errors RESTART IDENTITY;
               DELETE FROM journal_entries WHERE source = 'LEGACY_MIGRATION';`,
        values: [],
    };
}

// PGlite/pg 모두 다중 행 INSERT를 하나의 파라미터 배열로 받는다.
export function legacyInsertBatch(rows) {
    const cols = ["vessel_name", "contract_no", "settle_type", "amount_text", "settled_at_text"];
    const values = [];
    const tuples = rows.map((r, i) => {
        const base = i * cols.length;
        cols.forEach((c) => values.push(r[c]));
        return `(${cols.map((_, j) => `$${base + j + 1}`).join(",")})`;
    });
    return {
        text: `INSERT INTO legacy_settlements (${cols.join(",")}) VALUES ${tuples.join(",")}`,
        values,
    };
}

export function diagRowCount() {
    return { text: `SELECT count(*)::int AS n FROM legacy_settlements`, values: [] };
}

export function diagDistinctVesselNames() {
    return { text: `SELECT count(DISTINCT vessel_name)::int AS n FROM legacy_settlements`, values: [] };
}

export function diagDistinctSettleTypes() {
    return { text: `SELECT array_agg(DISTINCT settle_type ORDER BY settle_type) AS types FROM legacy_settlements`, values: [] };
}

export function diagAmountFailures() {
    return {
        text: `SELECT count(*)::int AS n FROM legacy_settlements WHERE try_parse_legacy_amount(amount_text) IS NULL`,
        values: [],
    };
}

export function diagDateFailures() {
    return {
        text: `SELECT count(*)::int AS n FROM legacy_settlements WHERE try_parse_legacy_date(settled_at_text) IS NULL`,
        values: [],
    };
}

export function diagTypeFailures() {
    return {
        text: `SELECT count(*)::int AS n FROM legacy_settlements WHERE normalize_settle_type(settle_type) IS NULL`,
        values: [],
    };
}

// 콤마·통화기호 등을 걷어내고 파싱에 성공한 값만 모아 FLOAT8/NUMERIC 합계를 비교한다
// (이 데이터셋 자체에서 재현한 반올림 오차 — 별도 합성 예시가 아니다).
export function diagFloatVsNumeric() {
    return {
        text: `SELECT
                    sum(v::float8)         AS float_sum,
                    sum(v)                 AS numeric_sum,
                    count(*)::int          AS n
               FROM (
                   SELECT try_parse_legacy_amount(amount_text) AS v
                   FROM legacy_settlements
                   WHERE try_parse_legacy_amount(amount_text) IS NOT NULL
               ) t`,
        values: [],
    };
}

export function diagExplainContractLookup(contractNo = DEMO_CONTRACT_NO) {
    return {
        text: `EXPLAIN (ANALYZE, FORMAT TEXT) SELECT * FROM legacy_settlements WHERE contract_no = $1`,
        values: [contractNo],
    };
}

export function createLegacyIndex() {
    return { text: `CREATE INDEX IF NOT EXISTS idx_legacy_contract ON legacy_settlements(contract_no);`, values: [] };
}

export function dropLegacyIndex() {
    return { text: `DROP INDEX IF EXISTS idx_legacy_contract;`, values: [] };
}

// ---- 마이그레이션 이후 검증 ----

export function verifyCounts() {
    return {
        text: `SELECT
                    (SELECT count(*) FROM legacy_settlements)::int AS legacy_total,
                    (SELECT count(*) FROM legacy_migration_errors)::int AS rejected,
                    (SELECT count(*) FROM journal_entries WHERE source = 'LEGACY_MIGRATION')::int AS migrated_entries,
                    (SELECT count(*) FROM journal_lines jl JOIN journal_entries je ON je.id = jl.journal_entry_id
                        WHERE je.source = 'LEGACY_MIGRATION')::int AS migrated_lines`,
        values: [],
    };
}

export function verifyVesselDedup() {
    return {
        text: `SELECT
                    (SELECT count(DISTINCT vessel_name) FROM legacy_settlements)::int AS raw_variants,
                    (SELECT count(DISTINCT vessel_name) FROM journal_entries WHERE source = 'LEGACY_MIGRATION')::int AS canonical_vessels`,
        values: [],
    };
}

export function verifyBalanceZero() {
    return {
        text: `SELECT COALESCE(SUM(CASE WHEN side = 'DEBIT' THEN amount ELSE -amount END), 0) AS grand_diff
               FROM journal_lines`,
        values: [],
    };
}

export function verifyAmountReconciliation() {
    return {
        text: `SELECT
                    (SELECT COALESCE(SUM(try_parse_legacy_amount(amount_text)), 0)
                       FROM legacy_settlements
                      WHERE try_parse_legacy_amount(amount_text) IS NOT NULL
                        AND try_parse_legacy_date(settled_at_text) IS NOT NULL
                        AND normalize_settle_type(settle_type) IS NOT NULL) AS legacy_valid_sum,
                    (SELECT COALESCE(SUM(jl.amount), 0)
                       FROM journal_lines jl JOIN journal_entries je ON je.id = jl.journal_entry_id
                      WHERE je.source = 'LEGACY_MIGRATION' AND jl.side = 'DEBIT') AS migrated_debit_sum`,
        values: [],
    };
}

export function sampleMigrationErrors(limit = 8) {
    return {
        text: `SELECT row_id, reason FROM legacy_migration_errors ORDER BY id LIMIT $1`,
        values: [limit],
    };
}

// ---- 회계 (시산표) ----

export function trialBalance() {
    return {
        text: `SELECT a.code, a.name, a.account_type,
                    COALESCE(SUM(CASE WHEN jl.side = 'DEBIT'  THEN jl.amount ELSE 0 END), 0) AS debit_total,
                    COALESCE(SUM(CASE WHEN jl.side = 'CREDIT' THEN jl.amount ELSE 0 END), 0) AS credit_total
               FROM accounts a
               LEFT JOIN journal_lines jl ON jl.account_id = a.id
               GROUP BY a.id, a.code, a.name, a.account_type
               ORDER BY a.code`,
        values: [],
    };
}

export function trialBalanceGrandTotal() {
    return {
        text: `SELECT
                    COALESCE(SUM(CASE WHEN side = 'DEBIT'  THEN amount ELSE 0 END), 0) AS debit_total,
                    COALESCE(SUM(CASE WHEN side = 'CREDIT' THEN amount ELSE 0 END), 0) AS credit_total
               FROM journal_lines`,
        values: [],
    };
}

export function journalEntryCount() {
    return { text: `SELECT count(*)::int AS n FROM journal_entries`, values: [] };
}
