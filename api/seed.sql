-- charter-ledger 샘플 데이터

INSERT INTO vessels (name, imo_no, vessel_type, dwt) VALUES
    ('Hanul Star',   'IMO9123456', 'Bulk Carrier', 82000),
    ('Baekdu Ocean',  'IMO9234567', 'Container',    45000),
    ('Dongbaek Ace',  'IMO9345678', 'Tanker',       58000);

INSERT INTO charter_contracts (contract_no, vessel_id, charterer, charter_type, daily_rate, start_date, end_date, status) VALUES
    ('CC-2026-001', 1, 'Global Grain Trading',  'TIME',   14500.00, '2026-01-10', '2026-07-09', 'ACTIVE'),
    ('CC-2026-002', 2, 'Pacific Line Logistics', 'TIME',   9800.00, '2026-03-01', '2026-08-31', 'ACTIVE'),
    ('CC-2026-003', 3, 'Union Petrochem',        'VOYAGE', 21000.00, '2026-02-15', '2026-03-05', 'CLOSED'),
    ('CC-2025-014', 1, 'Global Grain Trading',   'TIME',   13200.00, '2025-06-01', '2025-12-31', 'CLOSED');

INSERT INTO ledger_entries (contract_id, entry_type, side, amount, memo, settled_at) VALUES
    (1, 'HIRE', 'CREDIT', 435000.00, '2026-01 용선료', '2026-01-31'),
    (1, 'FUEL', 'DEBIT',   58000.00, '2026-01 연료비',  '2026-01-31'),
    (1, 'PORT', 'DEBIT',   12000.00, '입항비',          '2026-01-31'),
    (1, 'HIRE', 'CREDIT', 449500.00, '2026-02 용선료', '2026-02-28'),
    (2, 'HIRE', 'CREDIT', 303800.00, '2026-03 용선료', '2026-03-31'),
    (2, 'FUEL', 'DEBIT',   41000.00, '2026-03 연료비',  '2026-03-31'),
    (3, 'HIRE', 'CREDIT', 420000.00, '항해용선 정산',  '2026-03-05'),
    (3, 'PORT', 'DEBIT',   15500.00, '출항비',          '2026-03-05'),
    (4, 'HIRE', 'CREDIT', 396000.00, '2025-12 용선료', '2025-12-31'),
    (4, 'ADJUSTMENT', 'DEBIT', 4000.00, '지연 손해배상 정산', '2026-01-05');

-- 복식부기 계정과목 (레거시 마이그레이션 결과도 이 계정으로 분개된다)
INSERT INTO accounts (code, name, account_type) VALUES
    ('1000', '현금',       'ASSET'),
    ('1100', '미수금',     'ASSET'),
    ('4000', '용선매출',   'REVENUE'),
    ('5000', '연료비',     'EXPENSE'),
    ('5100', '항비',       'EXPENSE'),
    ('5900', '정산조정',   'EXPENSE');
