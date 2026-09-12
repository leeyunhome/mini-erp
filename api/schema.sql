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
