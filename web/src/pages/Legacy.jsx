import { useState } from "react";
import { Link } from "react-router-dom";
import * as legacy from "../db/legacyRun.js";

const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 8 });

export default function Legacy() {
    const [busy, setBusy] = useState("");
    const [seeded, setSeeded] = useState(null);
    const [diag, setDiag] = useState(null);
    const [planBefore, setPlanBefore] = useState("");
    const [planAfter, setPlanAfter] = useState("");
    const [migrated, setMigrated] = useState(false);
    const [verifyRes, setVerifyRes] = useState(null);

    async function step(name, fn) {
        setBusy(name);
        try { await fn(); } finally { setBusy(""); }
    }

    const doSeed = () => step("seed", async () => {
        const n = await legacy.seed();
        setSeeded(n);
        setDiag(null); setPlanBefore(""); setPlanAfter(""); setMigrated(false); setVerifyRes(null);
    });

    const doDiagnose = () => step("diagnose", async () => setDiag(await legacy.diagnose()));

    const doExplainBefore = () => step("explain-before", async () => setPlanBefore(await legacy.explain()));

    const doTune = () => step("tune", async () => {
        await legacy.createIndex();
        setPlanAfter(await legacy.explain());
    });

    const doMigrate = () => step("migrate", async () => {
        await legacy.migrate();
        setMigrated(true);
        setVerifyRes(await legacy.verify());
    });

    return (
        <section>
            <h1>레거시 진단 &amp; 마이그레이션</h1>
            <p className="hint">
                실제 회사 데이터가 아니라, 레거시 DB 진단·정제 역량을 보여주기 위해 의도적으로
                지저분하게 설계한 합성 데이터입니다(고정 시드라 항상 같은 결과가 나옵니다).
                아래 4단계를 순서대로 실행해보세요 — 전부 브라우저 안에서 실제 PostgreSQL(PGlite)이 처리합니다.
            </p>

            <div className="card">
                <h2>1. 레거시 정산 데이터 적재</h2>
                <p className="hint">선박명 오타·대소문자 혼재, 금액 문자열(콤마·통화기호), 날짜 4개 형식 혼재, 인덱스 없음 — 20,000행</p>
                <button onClick={doSeed} disabled={!!busy}>{busy === "seed" ? "생성 중…" : "20,000행 생성"}</button>
                {seeded != null && <p className="hint" style={{ marginTop: 10 }}>적재 완료: {seeded.toLocaleString()}행</p>}
            </div>

            {seeded != null && (
                <div className="card">
                    <h2>2. 오염도 진단</h2>
                    <button onClick={doDiagnose} disabled={!!busy}>{busy === "diagnose" ? "진단 중…" : "진단 실행"}</button>
                    {diag && (
                        <div className="summary-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
                            <div className="stat"><span>총 행 수</span><strong>{diag.rowCount.toLocaleString()}</strong></div>
                            <div className="stat"><span>선박명 표기 종류(실제 10척)</span><strong>{diag.distinctVesselNames}</strong></div>
                            <div className="stat"><span>정산유형 표기 종류</span><strong>{diag.distinctSettleTypes.length}</strong></div>
                            <div className="stat"><span>금액 파싱 실패</span><strong>{diag.amountFailures}</strong></div>
                            <div className="stat"><span>날짜 파싱 실패</span><strong>{diag.dateFailures}</strong></div>
                            <div className="stat"><span>유형 인식 실패</span><strong>{diag.typeFailures}</strong></div>
                        </div>
                    )}
                    {diag && (
                        <p className="hint" style={{ marginTop: 12 }}>
                            FLOAT8로 합산: <strong>{fmt(diag.floatVsNumeric.float_sum)}</strong> vs
                            {" "}NUMERIC으로 합산: <strong>{fmt(diag.floatVsNumeric.numeric_sum)}</strong>
                            {" "}({diag.floatVsNumeric.n.toLocaleString()}건) — 회계 금액에 FLOAT을 쓰면 안 되는 이유가 이 데이터에서 그대로 재현됩니다.
                        </p>
                    )}
                </div>
            )}

            {diag && (
                <div className="card">
                    <h2>3. 조회 성능 튜닝 (EXPLAIN ANALYZE)</h2>
                    <p className="hint">계약번호로 정산 내역을 찾는 조회 — 인덱스가 없어 매번 전체 테이블을 훑습니다.</p>
                    <div className="row-actions" style={{ marginBottom: 10 }}>
                        <button onClick={doExplainBefore} disabled={!!busy}>{busy === "explain-before" ? "실행 중…" : "인덱스 없이 조회"}</button>
                        <button onClick={doTune} disabled={!!busy || !planBefore}>{busy === "tune" ? "적용 중…" : "인덱스 생성 후 재조회"}</button>
                    </div>
                    {planBefore && <pre className="plan-box">{planBefore}</pre>}
                    {planAfter && <pre className="plan-box">{planAfter}</pre>}
                </div>
            )}

            {planAfter && (
                <div className="card">
                    <h2>4. 복식부기 원장으로 마이그레이션</h2>
                    <p className="hint">
                        pg_trgm 유사도로 선박명 오타를 정식 이름으로 묶고, 금액·날짜·유형이 전부 파싱되는
                        행만 전표(차변+대변 쌍)로 변환합니다. 차대가 어긋나는 전표는 DB 트리거가 커밋 자체를 거부합니다.
                    </p>
                    <button onClick={doMigrate} disabled={!!busy}>{busy === "migrate" ? "마이그레이션 중…" : "마이그레이션 실행"}</button>

                    {verifyRes && (
                        <>
                            <div className="summary-row" style={{ marginTop: 14, flexWrap: "wrap" }}>
                                <div className="stat"><span>레거시 총 행</span><strong>{verifyRes.counts.legacy_total.toLocaleString()}</strong></div>
                                <div className="stat"><span>거부(파싱 실패)</span><strong>{verifyRes.counts.rejected.toLocaleString()}</strong></div>
                                <div className="stat"><span>전표로 변환</span><strong>{verifyRes.counts.migrated_entries.toLocaleString()}</strong></div>
                                <div className="stat"><span>분개 행(전표×2)</span><strong>{verifyRes.counts.migrated_lines.toLocaleString()}</strong></div>
                            </div>
                            <div className="summary-row" style={{ marginTop: 10, flexWrap: "wrap" }}>
                                <div className="stat">
                                    <span>선박명 중복제거</span>
                                    <strong>{verifyRes.dedup.raw_variants}종 표기 → {verifyRes.dedup.canonical_vessels}척</strong>
                                </div>
                                <div className="stat">
                                    <span>차대 그랜드토탈 차이</span>
                                    <strong style={{ color: Number(verifyRes.balance.grand_diff) === 0 ? "#166534" : "#991b1b" }}>
                                        {verifyRes.balance.grand_diff} {Number(verifyRes.balance.grand_diff) === 0 ? "(정확히 0)" : ""}
                                    </strong>
                                </div>
                                <div className="stat">
                                    <span>금액 정합성(레거시 유효합 = 마이그레이션 차변합)</span>
                                    <strong>
                                        {verifyRes.reconciliation.legacy_valid_sum === verifyRes.reconciliation.migrated_debit_sum ? "일치" : "불일치"}
                                        {" "}({verifyRes.reconciliation.migrated_debit_sum})
                                    </strong>
                                </div>
                            </div>
                            {verifyRes.sampleErrors.length > 0 && (
                                <>
                                    <p className="hint" style={{ marginTop: 12 }}>거부된 행 예시 (legacy_migration_errors)</p>
                                    <table>
                                        <thead><tr><th>row_id</th><th>사유</th></tr></thead>
                                        <tbody>
                                            {verifyRes.sampleErrors.map((e) => (
                                                <tr key={e.row_id}><td>{e.row_id}</td><td>{e.reason}</td></tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </>
                            )}
                            <p className="hint" style={{ marginTop: 12 }}>
                                결과는 <Link to="/accounting">시산표</Link> 탭에서 계정별로 확인할 수 있습니다.
                            </p>
                        </>
                    )}
                </div>
            )}
        </section>
    );
}
