-- charter-ledger: 용선 계약 · 정산 관리 스키마
-- 3개 테이블: 용선계약(charter_contracts), 정산원장(ledger_entries), 선박(vessels)

DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS charter_contracts;
DROP TABLE IF EXISTS vessels;

CREATE TABLE vessels (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(80) NOT NULL,
    imo_no        VARCHAR(20) UNIQUE,
    vessel_type   VARCHAR(40) NOT NULL,
    dwt           INTEGER
);

CREATE TABLE charter_contracts (
    id              SERIAL PRIMARY KEY,
    contract_no     VARCHAR(30) UNIQUE NOT NULL,
    vessel_id       INTEGER NOT NULL REFERENCES vessels(id),
    charterer       VARCHAR(80) NOT NULL,
    charter_type    VARCHAR(20) NOT NULL DEFAULT 'TIME',   -- TIME | VOYAGE | BAREBOAT
    daily_rate      NUMERIC(12, 2) NOT NULL,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | CLOSED | CANCELLED
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE ledger_entries (
    id              SERIAL PRIMARY KEY,
    contract_id     INTEGER NOT NULL REFERENCES charter_contracts(id) ON DELETE CASCADE,
    entry_type      VARCHAR(20) NOT NULL,  -- HIRE(용선료) | FUEL(연료비) | PORT(항비) | ADJUSTMENT(정산조정)
    side            VARCHAR(6)  NOT NULL,  -- DEBIT | CREDIT
    amount          NUMERIC(12, 2) NOT NULL,
    memo            VARCHAR(200),
    settled_at      DATE NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_contract ON ledger_entries(contract_id);
CREATE INDEX idx_contract_vessel ON charter_contracts(vessel_id);

-- ============================================================
-- 복식부기 회계 원장 (accounts / journal_entries / journal_lines)
-- 전표(journal_entries)마다 여러 분개(journal_lines)가 붙고,
-- 전표별 차변합=대변합을 DB 트리거로 강제한다(애플리케이션이 아니라 DB가 보증).
-- ============================================================

DROP TABLE IF EXISTS journal_lines;
DROP TABLE IF EXISTS journal_entries;
DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
    id            SERIAL PRIMARY KEY,
    code          VARCHAR(10) UNIQUE NOT NULL,
    name          VARCHAR(60) NOT NULL,
    account_type  VARCHAR(20) NOT NULL   -- ASSET | LIABILITY | EQUITY | REVENUE | EXPENSE
);

CREATE TABLE journal_entries (
    id              SERIAL PRIMARY KEY,
    entry_no        VARCHAR(30) UNIQUE NOT NULL,
    source          VARCHAR(20) NOT NULL DEFAULT 'MANUAL',  -- MANUAL | LEGACY_MIGRATION
    vessel_name     VARCHAR(80),           -- 레거시 마이그레이션 출처일 때만 채움(정규화된 값)
    contract_no     VARCHAR(30),
    entry_date      DATE NOT NULL,
    memo            VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE journal_lines (
    id                  SERIAL PRIMARY KEY,
    journal_entry_id    INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    account_id          INTEGER NOT NULL REFERENCES accounts(id),
    side                VARCHAR(6) NOT NULL,   -- DEBIT | CREDIT
    amount              NUMERIC(14, 2) NOT NULL CHECK (amount > 0)
);

CREATE INDEX idx_journal_lines_entry ON journal_lines(journal_entry_id);
CREATE INDEX idx_journal_lines_account ON journal_lines(account_id);
CREATE INDEX idx_journal_entries_contract ON journal_entries(contract_no);

-- 전표 하나(journal_entry_id 기준)의 차변합-대변합이 0이 아니면 커밋 자체를 막는다.
-- DEFERRABLE INITIALLY DEFERRED라 트랜잭션 안에서 차변/대변 줄을 순서와 무관하게 넣고
-- COMMIT 시점에 한 번만 검사한다(중간 상태에서 막히지 않음).
CREATE OR REPLACE FUNCTION check_journal_balance() RETURNS TRIGGER AS $$
DECLARE
    diff NUMERIC;
    eid INTEGER;
BEGIN
    eid := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
    SELECT COALESCE(SUM(CASE WHEN side = 'DEBIT' THEN amount ELSE -amount END), 0)
      INTO diff
      FROM journal_lines
     WHERE journal_entry_id = eid;
    IF diff <> 0 THEN
        RAISE EXCEPTION '전표 %: 차대 불일치 (차변-대변 = %)', eid, diff;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_journal_balance ON journal_lines;
CREATE CONSTRAINT TRIGGER trg_journal_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_journal_balance();

-- ============================================================
-- 레거시 정산 데이터 (legacy_settlements) — 의도적으로 지저분하게 설계한
-- 진단용 합성 데이터. 실제 회사 데이터가 아니다(README 참고).
--   - 선박명: 대소문자·공백·오타 변형이 섞여 있어 그대로는 GROUP BY로 집계 안 됨
--   - 금액: 문자열(콤마·통화표기 혼입)
--   - 날짜: 4가지 표기 형식 혼재 + 일부 파싱 불가 값
--   - 정산유형: 대소문자/약어 혼재
-- 인덱스가 전혀 없어 조회 성능 진단(EXPLAIN ANALYZE)의 대상이 된다.
-- ============================================================

DROP TABLE IF EXISTS legacy_migration_errors;
DROP TABLE IF EXISTS legacy_settlements;

CREATE TABLE legacy_settlements (
    row_id          SERIAL PRIMARY KEY,
    vessel_name     VARCHAR(80),
    contract_no     VARCHAR(30),
    settle_type     VARCHAR(20),
    amount_text     VARCHAR(30),
    settled_at_text VARCHAR(20),
    note            VARCHAR(200)
);

CREATE TABLE legacy_migration_errors (
    id          SERIAL PRIMARY KEY,
    row_id      INTEGER NOT NULL,
    reason      VARCHAR(200) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- 날짜 문자열을 4가지 알려진 포맷으로 순서대로 시도한다. to_date()는 형식이 안 맞아도
-- 조용히 이상한 날짜를 만들어낼 수 있어(예외를 안 던짐), to_char로 왕복 변환해 원래
-- 문자열과 일치하는지 재검증한다 — 일치하지 않으면 그 포맷이 아니라는 뜻이라 다음 포맷으로 넘어간다.
CREATE OR REPLACE FUNCTION try_parse_legacy_date(txt TEXT) RETURNS DATE AS $$
DECLARE
    fmts TEXT[] := ARRAY['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD-YYYY', 'YYYY.MM.DD'];
    f TEXT;
    result DATE;
BEGIN
    IF txt IS NULL OR trim(txt) = '' THEN
        RETURN NULL;
    END IF;
    FOREACH f IN ARRAY fmts LOOP
        BEGIN
            result := to_date(txt, f);
            IF to_char(result, f) = txt THEN
                RETURN result;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- 이 포맷 아님 — 다음 포맷 시도
        END;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 금액 문자열에서 통화기호·콤마·공백을 제거하고 숫자로 캐스팅한다.
-- 정제 후에도 숫자가 아니면(빈 문자열 등) NULL — legacy_migration_errors로 보낸다.
CREATE OR REPLACE FUNCTION try_parse_legacy_amount(txt TEXT) RETURNS NUMERIC AS $$
DECLARE
    cleaned TEXT;
    result NUMERIC;
BEGIN
    IF txt IS NULL THEN RETURN NULL; END IF;
    cleaned := regexp_replace(trim(txt), '[^0-9.\-]', '', 'g');
    IF cleaned = '' THEN RETURN NULL; END IF;
    BEGIN
        result := cleaned::NUMERIC;
        RETURN result;
    EXCEPTION WHEN OTHERS THEN
        RETURN NULL;
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 정산유형 표기(대소문자·약어 혼재)를 4개 정규 값으로 정규화. 인식 못 하면 NULL.
CREATE OR REPLACE FUNCTION normalize_settle_type(txt TEXT) RETURNS TEXT AS $$
BEGIN
    IF txt IS NULL THEN RETURN NULL; END IF;
    RETURN CASE
        WHEN lower(trim(txt)) LIKE 'hire%' THEN 'HIRE'
        WHEN lower(trim(txt)) LIKE 'fuel%' THEN 'FUEL'
        WHEN lower(trim(txt)) LIKE 'port%' THEN 'PORT'
        WHEN lower(trim(txt)) LIKE 'adj%'  THEN 'ADJUSTMENT'
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
