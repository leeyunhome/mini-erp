// 브라우저 내장 PostgreSQL(PGlite, WASM) 싱글턴.
// GitHub Pages는 정적 호스팅이라 Express+PostgreSQL 백엔드를 띄울 수 없다. 그렇다고
// 데이터를 JS 배열로 흉내내지 않고, 실제 Postgres 엔진(PGlite)을 브라우저에서 그대로
// 구동해 api/schema.sql·api/seed.sql을 원본 그대로 적용한다 — 데모도 진짜 SQL을 쓴다.
import { PGlite, types } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import schemaSql from "../../../api/schema.sql?raw";
import seedSql from "../../../api/seed.sql?raw";

// PGlite는 DATE 컬럼을 기본적으로 JS Date 객체로 파싱한다(로컬 타임존 이슈·React에
// 객체를 그대로 렌더 못 하는 문제의 원인). 이 옵션을 query()/exec()에 매번 넘기면
// node-postgres가 실제 Postgres에서 하는 것과 달리 원본 "YYYY-MM-DD" 문자열을 그대로 받는다.
// (주의: PGlite 생성자의 parsers 옵션은 이후 query() 호출에 자동 적용되지 않는다 — 실측 확인됨.
//  반드시 매 query()/exec() 호출마다 세 번째 인자로 넘겨야 한다.)
export const DATE_OPTS = { parsers: { [types.DATE]: (v) => v } };

let dbPromise = null;

async function bootstrap(db) {
    const existing = await db.query(`SELECT to_regclass('public.vessels') AS t`);
    if (!existing.rows[0].t) {
        await db.exec(schemaSql);
        await db.exec(seedSql);
    }
}

export function getDb() {
    if (!dbPromise) {
        dbPromise = (async () => {
            const db = new PGlite("idb://mini-erp", { extensions: { pg_trgm } });
            await db.waitReady;
            await bootstrap(db);
            return db;
        })();
    }
    return dbPromise;
}

// 데모 데이터를 완전히 초기 상태로 되돌린다(방문자가 CRUD로 어지럽힌 경우 등).
export async function resetDb() {
    const db = await getDb();
    await db.exec(schemaSql);
    await db.exec(seedSql);
    return db;
}
