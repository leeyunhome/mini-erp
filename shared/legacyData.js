// 레거시 진단 데모용 합성 정산 데이터 생성기.
// 실제 회사 데이터가 아니다 — "레거시 DB 진단·정제" 역량을 보여주기 위해 의도적으로
// 지저분하게 설계한 시나리오다(README 참고). 고정 시드(mulberry32)라 항상 같은 데이터가
// 나오고, Node(api/legacy 시딩 스크립트)와 브라우저(PGlite 데모) 양쪽에서 이 파일 하나를
// 그대로 가져다 쓴다 — 데이터 생성 로직도 두 번 구현하지 않는다.

export const SEED = 42;
export const ROW_COUNT = 20000;

export function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// 실제로 존재하는 선사가 아닌, 이 데모만을 위한 가상 선단.
const FLEET = [
    "Sea Falcon", "Nordic Pearl", "Blue Horizon", "Ocean Comet", "Silver Tide",
    "Amber Voyager", "Coral Drift", "Northern Star", "Golden Meridian", "Crimson Wave",
];

const SETTLE_TYPES = ["HIRE", "FUEL", "PORT", "ADJUSTMENT"];
const TYPE_VARIANTS = {
    HIRE: ["HIRE", "hire", "Hire", " HIRE"],
    FUEL: ["FUEL", "fuel", "Fuel"],
    PORT: ["PORT", "port", "Port "],
    ADJUSTMENT: ["ADJUSTMENT", "Adj", "adj", "ADJ"],
};
const UNKNOWN_TYPE_JUNK = ["MISC", "OTHER", "", "TBD"];

function dirtyVesselName(rnd, canonical) {
    const r = rnd();
    if (r < 0.70) return canonical;                                   // 정상 표기
    if (r < 0.85) return canonical.toLowerCase();                     // 대소문자 변형
    if (r < 0.92) return `  ${canonical}  `;                          // 공백 오염
    if (r < 0.97) {
        // 철자 변형 — 문자 하나를 지운다 (pg_trgm 유사도로 복구 가능한 수준)
        const i = 1 + Math.floor(rnd() * (canonical.length - 2));
        return canonical.slice(0, i) + canonical.slice(i + 1);
    }
    return `${canonical} (Charter)`;                                   // 접미사 오염
}

function formatDate(rnd, y, m, d) {
    const pad = (n) => String(n).padStart(2, "0");
    const variant = Math.floor(rnd() * 4);
    if (variant === 0) return `${y}-${pad(m)}-${pad(d)}`;
    if (variant === 1) return `${y}/${pad(m)}/${pad(d)}`;
    if (variant === 2) return `${pad(m)}-${pad(d)}-${y}`;
    return `${y}.${pad(m)}.${pad(d)}`;
}

function dirtyAmount(rnd, value) {
    const r = rnd();
    const fixed = value.toFixed(2);
    if (r < 0.90) return fixed;                                        // 정상
    if (r < 0.94) return Number(fixed).toLocaleString("en-US");         // 콤마 포함 "1,234.50"
    if (r < 0.97) return `USD ${fixed}`;                                // 통화 표기 혼입 (정제 후 복구 가능)
    if (r < 0.99) return `  ${fixed} `;                                 // 공백
    return ["", "TBD", "-", "pending"][Math.floor(rnd() * 4)];          // 진짜 파싱 불가 (버려짐)
}

/**
 * 결정론적 합성 레거시 정산 데이터를 생성한다.
 * @returns {{ rows: Array<{vessel_name:string, contract_no:string, settle_type:string, amount_text:string, settled_at_text:string, note:string}>, fleetSize: number }}
 */
export function generateLegacyRows(count = ROW_COUNT, seed = SEED) {
    const rnd = mulberry32(seed);
    // 선박당 계약 3~5개, 계약번호는 레거시 체계(LC-연도-일련번호)
    const contractsByVessel = FLEET.map((_, vi) => {
        const n = 3 + Math.floor(rnd() * 3);
        return Array.from({ length: n }, (__, ci) => `LC-${2019 + (vi % 6)}-${String(vi * 10 + ci).padStart(4, "0")}`);
    });

    const rows = [];
    for (let i = 0; i < count; i++) {
        const vi = Math.floor(rnd() * FLEET.length);
        const canonical = FLEET[vi];
        const contract_no = contractsByVessel[vi][Math.floor(rnd() * contractsByVessel[vi].length)];

        const typeUnknown = rnd() < 0.01;
        const baseType = SETTLE_TYPES[Math.floor(rnd() * SETTLE_TYPES.length)];
        const settle_type = typeUnknown
            ? UNKNOWN_TYPE_JUNK[Math.floor(rnd() * UNKNOWN_TYPE_JUNK.length)]
            : TYPE_VARIANTS[baseType][Math.floor(rnd() * TYPE_VARIANTS[baseType].length)];

        const amountBase = baseType === "HIRE" ? 8000 + rnd() * 40000
            : baseType === "FUEL" ? 2000 + rnd() * 15000
            : baseType === "PORT" ? 500 + rnd() * 5000
            : 200 + rnd() * 3000;

        const y = 2019 + Math.floor(rnd() * 7);
        const m = 1 + Math.floor(rnd() * 12);
        const d = 1 + Math.floor(rnd() * 28);
        const dateGarbage = rnd() < 0.01;

        rows.push({
            vessel_name: dirtyVesselName(rnd, canonical),
            contract_no,
            settle_type,
            amount_text: dirtyAmount(rnd, amountBase),
            settled_at_text: dateGarbage ? ["N/A", "", "unknown", "2026/13/40"][Math.floor(rnd() * 4)] : formatDate(rnd, y, m, d),
            note: "",
        });
    }
    return { rows, fleetSize: FLEET.length };
}
