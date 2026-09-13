import pg from "pg";

const { Pool, types } = pg;

// node-postgres는 DATE 컬럼(OID 1082)을 기본적으로 JS Date 객체로 파싱한다. JSON
// 직렬화 시 로컬 타임존에 따라 날짜가 하루 밀리는 고전적인 버그의 원인이라, 원본
// "YYYY-MM-DD" 문자열을 그대로 반환하도록 전역으로 재정의한다(브라우저 데모의
// web/src/db/pglite.js DATE_OPTS와 동일한 목적).
types.setTypeParser(1082, (val) => val);

export const pool = new Pool({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD || "postgres",
    database: process.env.PGDATABASE || "mini_erp",
});
