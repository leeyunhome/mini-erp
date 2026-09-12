// GitHub Pages 정적 배포용 인메모리 목 데이터.
// api.js가 백엔드 대신 이 스토어를 읽고 씁니다(새로고침하면 초기화).

export const vessels = [
    { id: 1, name: "Hanul Star", imo_no: "IMO9123456", vessel_type: "Bulk Carrier", dwt: 82000 },
    { id: 2, name: "Baekdu Ocean", imo_no: "IMO9234567", vessel_type: "Container", dwt: 45000 },
    { id: 3, name: "Dongbaek Ace", imo_no: "IMO9345678", vessel_type: "Tanker", dwt: 58000 },
];

export const contracts = [
    { id: 1, contract_no: "CC-2026-001", vessel_id: 1, vessel_name: "Hanul Star", vessel_type: "Bulk Carrier", charterer: "Global Grain Trading", charter_type: "TIME", daily_rate: 14500, start_date: "2026-01-10", end_date: "2026-07-09", status: "ACTIVE" },
    { id: 2, contract_no: "CC-2026-002", vessel_id: 2, vessel_name: "Baekdu Ocean", vessel_type: "Container", charterer: "Pacific Line Logistics", charter_type: "TIME", daily_rate: 9800, start_date: "2026-03-01", end_date: "2026-08-31", status: "ACTIVE" },
    { id: 3, contract_no: "CC-2026-003", vessel_id: 3, vessel_name: "Dongbaek Ace", vessel_type: "Tanker", charterer: "Union Petrochem", charter_type: "VOYAGE", daily_rate: 21000, start_date: "2026-02-15", end_date: "2026-03-05", status: "CLOSED" },
    { id: 4, contract_no: "CC-2025-014", vessel_id: 1, vessel_name: "Hanul Star", vessel_type: "Bulk Carrier", charterer: "Global Grain Trading", charter_type: "TIME", daily_rate: 13200, start_date: "2025-06-01", end_date: "2025-12-31", status: "CLOSED" },
];

export const ledgerEntries = [
    { id: 1, contract_id: 1, contract_no: "CC-2026-001", entry_type: "HIRE", side: "CREDIT", amount: 435000, memo: "2026-01 용선료", settled_at: "2026-01-31" },
    { id: 2, contract_id: 1, contract_no: "CC-2026-001", entry_type: "FUEL", side: "DEBIT", amount: 58000, memo: "2026-01 연료비", settled_at: "2026-01-31" },
    { id: 3, contract_id: 1, contract_no: "CC-2026-001", entry_type: "PORT", side: "DEBIT", amount: 12000, memo: "입항비", settled_at: "2026-01-31" },
    { id: 4, contract_id: 1, contract_no: "CC-2026-001", entry_type: "HIRE", side: "CREDIT", amount: 449500, memo: "2026-02 용선료", settled_at: "2026-02-28" },
    { id: 5, contract_id: 2, contract_no: "CC-2026-002", entry_type: "HIRE", side: "CREDIT", amount: 303800, memo: "2026-03 용선료", settled_at: "2026-03-31" },
    { id: 6, contract_id: 2, contract_no: "CC-2026-002", entry_type: "FUEL", side: "DEBIT", amount: 41000, memo: "2026-03 연료비", settled_at: "2026-03-31" },
    { id: 7, contract_id: 3, contract_no: "CC-2026-003", entry_type: "HIRE", side: "CREDIT", amount: 420000, memo: "항해용선 정산", settled_at: "2026-03-05" },
    { id: 8, contract_id: 3, contract_no: "CC-2026-003", entry_type: "PORT", side: "DEBIT", amount: 15500, memo: "출항비", settled_at: "2026-03-05" },
    { id: 9, contract_id: 4, contract_no: "CC-2025-014", entry_type: "HIRE", side: "CREDIT", amount: 396000, memo: "2025-12 용선료", settled_at: "2025-12-31" },
    { id: 10, contract_id: 4, contract_no: "CC-2025-014", entry_type: "ADJUSTMENT", side: "DEBIT", amount: 4000, memo: "지연 손해배상 정산", settled_at: "2026-01-05" },
];

let nextContractId = contracts.length + 1;
let nextLedgerId = ledgerEntries.length + 1;

export function nextContractIdGen() { return nextContractId++; }
export function nextLedgerIdGen() { return nextLedgerId++; }

export function addContract(row) { contracts.unshift(row); }
export function replaceContract(id, patch) {
    const idx = contracts.findIndex((c) => c.id === id);
    if (idx >= 0) contracts[idx] = { ...contracts[idx], ...patch };
    return contracts[idx];
}
export function removeContract(id) {
    const idx = contracts.findIndex((c) => c.id === id);
    if (idx >= 0) contracts.splice(idx, 1);
}

export function addLedgerEntry(row) { ledgerEntries.unshift(row); }
export function removeLedgerEntry(id) {
    const idx = ledgerEntries.findIndex((e) => e.id === id);
    if (idx >= 0) ledgerEntries.splice(idx, 1);
}
