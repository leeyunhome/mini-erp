-- 레거시 정산 데이터(legacy_settlements) → 정규화된 복식부기 원장(journal_entries/journal_lines)
-- 마이그레이션. legacyClear()로 이전 결과를 지운 뒤 재실행해도 안전하도록 설계했다.
--
-- 순서: ① pg_trgm 유사도로 선박명 오타·표기 변형을 하나의 정식 이름으로 묶는다
--       ② 금액·날짜·정산유형 중 하나라도 파싱 실패하는 행은 legacy_migration_errors로 분리
--       ③ 파싱에 전부 성공한 행만 전표(journal_entries)+분개(journal_lines)로 변환
-- 트랜잭션 전체가 하나의 exec() 호출로 실행되어, 중간에 실패하면 전부 롤백된다.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ① 선박명 정규화 매핑 — "가장 빈도가 높은 표기"를 정식 이름으로 채택한다.
-- 자기 자신도 후보에 포함되므로(유사도 1.0) 정상 표기 행은 항상 자신에게 매핑된다.
DROP TABLE IF EXISTS vessel_canon;
CREATE TABLE vessel_canon AS
WITH freq AS (
    SELECT trim(vessel_name) AS raw_name, count(*) AS n
    FROM legacy_settlements
    GROUP BY 1
),
pairs AS (
    SELECT a.raw_name AS raw_name, b.raw_name AS candidate, b.n AS candidate_n,
           similarity(lower(a.raw_name), lower(b.raw_name)) AS sim
    FROM freq a
    JOIN freq b ON similarity(lower(a.raw_name), lower(b.raw_name)) > 0.5
),
best AS (
    SELECT DISTINCT ON (raw_name) raw_name, candidate AS canonical_name
    FROM pairs
    ORDER BY raw_name, candidate_n DESC, sim DESC
)
SELECT raw_name, canonical_name FROM best;

CREATE INDEX ON vessel_canon(raw_name);

-- ② 파싱 실패 행을 사유와 함께 분리
INSERT INTO legacy_migration_errors (row_id, reason)
SELECT row_id,
       CASE
           WHEN try_parse_legacy_amount(amount_text) IS NULL THEN '금액 파싱 실패: ' || COALESCE(amount_text, '(NULL)')
           WHEN try_parse_legacy_date(settled_at_text) IS NULL THEN '날짜 파싱 실패: ' || COALESCE(settled_at_text, '(NULL)')
           ELSE '정산유형 인식 실패: ' || COALESCE(settle_type, '(NULL)')
       END AS reason
FROM legacy_settlements
WHERE try_parse_legacy_amount(amount_text) IS NULL
   OR try_parse_legacy_date(settled_at_text) IS NULL
   OR normalize_settle_type(settle_type) IS NULL;

-- ③ 유효 행만 전표로 변환. 전표 하나당 정산유형별로 정해진 두 계정에 분개 두 줄(차변+대변).
--    HIRE(용선료 발생)  : 차변 미수금(1100)  / 대변 용선매출(4000)
--    FUEL(연료비)       : 차변 연료비(5000)  / 대변 현금(1000)
--    PORT(항비)         : 차변 항비(5100)    / 대변 현금(1000)
--    ADJUSTMENT(정산조정): 차변 정산조정(5900)/ 대변 현금(1000)  — 조정 사유별 차대가 실제로는 갈릴 수 있으나
--                          이 데모는 비용 처리로 단순화했다(README에 명시).
DROP TABLE IF EXISTS valid_settlements;
CREATE TABLE valid_settlements AS
SELECT
    ls.row_id,
    vc.canonical_name AS vessel_name,
    ls.contract_no,
    normalize_settle_type(ls.settle_type) AS settle_type,
    try_parse_legacy_amount(ls.amount_text) AS amount,
    try_parse_legacy_date(ls.settled_at_text) AS entry_date
FROM legacy_settlements ls
JOIN vessel_canon vc ON vc.raw_name = trim(ls.vessel_name)
WHERE try_parse_legacy_amount(ls.amount_text) IS NOT NULL
  AND try_parse_legacy_date(ls.settled_at_text) IS NOT NULL
  AND normalize_settle_type(ls.settle_type) IS NOT NULL;

INSERT INTO journal_entries (entry_no, source, vessel_name, contract_no, entry_date, memo)
SELECT 'LEGACY-' || row_id, 'LEGACY_MIGRATION', vessel_name, contract_no, entry_date,
       settle_type || ' 정산 (레거시 마이그레이션)'
FROM valid_settlements;

-- 차변 라인 (전표당 1행, set-based)
INSERT INTO journal_lines (journal_entry_id, account_id, side, amount)
SELECT je.id,
       a.id,
       'DEBIT',
       vs.amount
FROM valid_settlements vs
JOIN journal_entries je ON je.entry_no = 'LEGACY-' || vs.row_id
JOIN accounts a ON a.code = CASE vs.settle_type
                                WHEN 'HIRE' THEN '1100'
                                WHEN 'FUEL' THEN '5000'
                                WHEN 'PORT' THEN '5100'
                                ELSE '5900'
                            END;

-- 대변 라인 (전표당 1행) — 차변과 항상 같은 금액이라 트리거가 통과한다.
INSERT INTO journal_lines (journal_entry_id, account_id, side, amount)
SELECT je.id,
       a.id,
       'CREDIT',
       vs.amount
FROM valid_settlements vs
JOIN journal_entries je ON je.entry_no = 'LEGACY-' || vs.row_id
JOIN accounts a ON a.code = CASE vs.settle_type
                                WHEN 'HIRE' THEN '4000'
                                ELSE '1000'
                            END;

DROP TABLE valid_settlements;
DROP TABLE vessel_canon;
