# mini-erp

**해운 용선(Charter)·정산 관리 미니 ERP 토이 프로젝트 — React + Node.js/Express + PostgreSQL**

선박 용선계약을 등록하고, 계약별 정산(용선료·연료비·항비 등) 내역을 원장 형태로 기록하며,
계약별/월별 집계와 미정산 계약을 리포트로 확인하는 업무 시스템을 축소 재현한 개인 학습
프로젝트입니다. 여기에 더해, 레거시 데이터 진단·마이그레이션 파이프라인과 DB가 정합성을
강제하는 복식부기 원장을 추가로 구현했습니다.

🔗 **라이브 데모**: https://leeyunhome.github.io/mini-erp/ (브라우저에서 실제 PostgreSQL이 동작합니다 — 아래 참고)

---

## 이 프로젝트를 만든 이유

React/Java/PostgreSQL 스택을 요구하는 채용 공고(해운업 사내 시스템 개발)에 지원하면서,
해당 스택으로 실제 도메인과 비슷한 문제를 풀어보는 학습용 결과물이 필요해 만들었습니다.
**실무 경력이 아니라 개인 학습 프로젝트**이며, React 프런트엔드와 PostgreSQL 설계·튜닝
능력을 보여주는 것이 목적입니다. 백엔드는 실제 보유 경험과 일치하는 Node.js/Express로
구현했고, 회사가 요구하는 Java(Spring)는 별도로 빠르게 학습해 합류 후 적응할 계획입니다.

이 공고는 "레거시 화면/DB 구조 파악 및 개선 제안", "복잡한 조인/쿼리 튜닝 경험",
"재무 및 회계 시스템 개발"을 구체적으로 요구합니다. 기본 CRUD·리포트만으로는 이 세
요건을 보여줄 수 없다고 판단해, 아래 두 모듈을 추가했습니다.

## 모듈 구성

| 모듈 | 내용 |
|---|---|
| **용선계약 관리** | 계약 등록/수정/삭제, 선박·용선주·용선형태(TIME/VOYAGE/BAREBOAT)·일일 용선료·기간·상태 관리, 상태별 필터 |
| **정산(원장) 관리** | 계약별 정산 항목(용선료/연료비/항비/조정) 추가·삭제, 차변(DEBIT)/대변(CREDIT) 구분, 계약별 합계 실시간 계산 |
| **집계 리포트** | 계약별 정산 순액 집계(JOIN + GROUP BY), 월별 용선료 매출 추이(date_trunc), 미정산 계약 조회(NOT EXISTS 서브쿼리) |
| **레거시 진단 & 마이그레이션** | 의도적으로 지저분하게 설계한 합성 정산 데이터 20,000행을 오염도 진단 → 조회 성능 튜닝(EXPLAIN ANALYZE) → 복식부기 원장으로 마이그레이션 |
| **시산표(회계)** | 복식부기 원장(계정과목·전표·분개) 기반 계정별 차변/대변 집계. 전표 하나의 차변합≠대변합이면 DB 트리거가 커밋 자체를 거부 |

## 브라우저 데모가 실제 PostgreSQL을 실행합니다

GitHub Pages는 정적 호스팅이라 Express+PostgreSQL 백엔드를 띄울 수 없습니다. 처음에는
이 문제를 JS 배열로 SQL을 흉내내는 방식(mock)으로 우회했는데, 이러면 정작 이 공고가
요구하는 "SQL·DB 역량"을 데모가 증명하지 못한다는 문제가 있었습니다.

그래서 [PGlite](https://pglite.dev)(WASM으로 컴파일된 실제 PostgreSQL)로 교체했습니다.
`web/src/db/pglite.js`가 브라우저 안에서 PostgreSQL 인스턴스를 띄우고, `api/schema.sql`·
`api/seed.sql`을 **원본 파일 그대로**(`?raw` import) 적용합니다. 프런트엔드의 쿼리도
`shared/sql.js`에 정의해 Express 라우트(`api/routes/*.js`)와 브라우저 데모가 **완전히
같은 SQL 문자열**을 실행합니다 — 데모용으로 로직을 다시 구현하지 않았습니다.

```
listContracts()  ─┬─ (로컬, 백엔드 연결)  Express → pool.query(Q.contractsList())  → 실제 PostgreSQL
                   └─ (GitHub Pages 데모)  PGlite  → db.query(Q.contractsList())    → 브라우저 내 PostgreSQL(WASM)
```

같은 이유로 계정 데이터를 다룰 때 흔한 함정도 하나 고쳤습니다: `node-postgres`/PGlite는
DATE 컬럼을 기본적으로 JS `Date` 객체로 파싱하는데, 이걸 그대로 두면 로컬 타임존에 따라
날짜가 하루 밀리거나(JSON 직렬화 시), React가 객체를 자식으로 렌더링하지 못해 에러가
납니다. `api/db.js`(`pg.types.setTypeParser`)와 `web/src/db/pglite.js`(`DATE_OPTS`) 양쪽에
같은 목적의 파서 재정의를 넣어 원본 `"YYYY-MM-DD"` 문자열을 그대로 받도록 했습니다.

## 레거시 진단 → 마이그레이션 파이프라인

"레거시 진단" 탭은 실제 회사 데이터가 아니라, 이 역량을 보여주기 위해 **의도적으로
지저분하게 설계한 합성 데이터**(고정 시드, `shared/legacyData.js`)입니다. 20,000행을
생성해 실제로 진단·마이그레이션·검증까지 실행한 결과(재현 가능한 고정 시드 기준):

| 단계 | 내용 | 결과 |
|---|---|---|
| 오염도 진단 | 선박명 표기(대소문자·공백·오타), 정산유형 표기(약어·대소문자) | 선박 10척이 **140종 표기**로, 정산유형이 **18종 표기**로 흩어져 있음 |
| | 금액 파싱(콤마·통화기호 혼입), 날짜 파싱(4개 형식 혼재) | 파싱 실패 — 금액 218건 · 날짜 206건 · 유형 194건 (합집합 615건 거부) |
| | 회계 금액에 FLOAT을 쓰면 안 되는 이유 | 유효 금액 19,782건을 FLOAT8로 합산하면 `210,331,256.70000008`, NUMERIC으로 합산하면 정확히 `210,331,256.70` — 같은 데이터에서 재현 |
| 조회 성능 튜닝 | 계약번호로 정산 내역 조회, `EXPLAIN (ANALYZE)` | 인덱스 없음: Seq Scan, cost 235.85, 2.9ms → 인덱스 생성 후: Bitmap Index Scan, cost 180.11, 0.6ms |
| 마이그레이션 | pg_trgm 유사도(threshold 0.5)로 선박명 오타를 정식 이름으로 클러스터링 → 금액·날짜·유형이 전부 파싱되는 행만 복식부기 전표로 변환 | 선박명 **140종 표기 → 10척**으로 중복 제거, 20,000행 중 **19,385건 전표화**(38,770 분개), 615건은 사유와 함께 `legacy_migration_errors`로 격리 |
| 정합성 검증 | 레거시 유효 금액 합계 vs 마이그레이션된 전표 차변 합계 | 정확히 일치 (`206,147,383.20`) — 반올림 오차 없음 |
| | 전표 전체 차변합 − 대변합 | 정확히 `0.00` |

선박명 정규화는 `pg_trgm`의 `similarity()`로 구현했습니다. "가장 빈도가 높은 표기"를
정식 이름으로 채택하는 방식이며, 임계값 0.5는 실제 10척 선단 이름과 그 오타 변형(문자
1개 삭제)으로 사전 검증했습니다 — 오타 변형끼리는 유사도 0.615~0.786으로 전부 임계값을
넘고, 서로 다른 선박 이름끼리는 최대 0.125로 전부 임계값 아래라 오분류 위험이 없습니다.

## 복식부기 원장 — DB가 정합성을 강제

`accounts`(계정과목) / `journal_entries`(전표) / `journal_lines`(분개) 3테이블 구조이며,
전표 하나의 차변 합계와 대변 합계가 일치하는지를 **애플리케이션 코드가 아니라 DB
트리거**가 검사합니다.

```sql
CREATE CONSTRAINT TRIGGER trg_journal_balance
    AFTER INSERT OR UPDATE OR DELETE ON journal_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
```

`DEFERRABLE INITIALLY DEFERRED`라 트랜잭션 안에서 차변 줄과 대변 줄을 순서와 무관하게
넣고, 트랜잭션이 끝나는 시점에 한 번만 검사합니다 — 차변만 넣고 대변을 아직 안 넣은
중간 상태에서 걸리지 않습니다. 실제로 불균형 전표(차변 100 / 대변 99)를 넣어보면
`전표 4: 차대 불일치 (차변-대변 = 1.00)` 예외와 함께 트랜잭션 전체가 롤백됩니다 — 위
표의 레거시 마이그레이션(전표 19,385건을 두 번의 set-based INSERT...SELECT로 생성)도
이 트리거를 통과해야 커밋됩니다.

## 기술 스택

- **프런트엔드**: React 18 (Vite), React Router — 순수 컴포넌트 상태 관리(별도 상태 라이브러리 없이 useState/useEffect)
- **백엔드**: Node.js + Express, REST API (`/api/contracts`, `/api/ledger`, `/api/reports`, `/api/vessels`, `/api/legacy`, `/api/accounting`)
- **DB**: PostgreSQL — `node-postgres(pg)`(로컬)·PGlite(브라우저 데모) 양쪽에서 `shared/sql.js`·`shared/legacySql.js`의 같은 쿼리를 실행
- **SQL 설계**: JOIN·GROUP BY·상관 서브쿼리·`NOT EXISTS`, `pg_trgm` 유사도 매칭, plpgsql 함수(날짜/금액 파서, 잔액 검사 트리거), `DEFERRABLE CONSTRAINT TRIGGER`, `EXPLAIN ANALYZE` 기반 인덱스 튜닝

## 구조

```
mini-erp/
├─ shared/                    # Express·브라우저 데모가 함께 쓰는 SQL·데이터 생성 로직 (단일 소스)
│  ├─ sql.js                  # 계약/정산/리포트 쿼리
│  ├─ legacySql.js            # 레거시 진단·마이그레이션·시산표 쿼리
│  └─ legacyData.js           # 합성 레거시 데이터 생성기(고정 시드)
├─ api/                       # Express + PostgreSQL 백엔드
│  ├─ schema.sql              # 테이블 정의(계약·원장·복식부기·레거시)
│  ├─ seed.sql                # 샘플 데이터
│  ├─ legacy_migrate.sql      # 레거시 → 복식부기 마이그레이션 스크립트
│  ├─ db.js                   # pg Pool 설정 + DATE 타입 파서 재정의
│  ├─ server.js               # Express 앱 진입점
│  └─ routes/                 # contracts / ledger / reports / vessels / legacy / accounting
├─ web/                       # React(Vite) 프런트엔드
│  └─ src/
│     ├─ api.js                    # 백엔드 REST 클라이언트 ↔ PGlite 데모 전환
│     ├─ db/pglite.js              # 브라우저 내장 PostgreSQL(PGlite) 부트스트랩
│     ├─ db/legacyRun.js           # 레거시 진단 탭 실행 로직
│     ├─ db/accountingRun.js       # 시산표 조회
│     └─ pages/                    # Contracts / Ledger / Reports / Legacy / Accounting
└─ docker-compose.yml         # 로컬 PostgreSQL 실행용
```

## 로컬 실행 (실제 백엔드 + PostgreSQL)

```bash
# 1) PostgreSQL 기동
docker compose up -d

# 2) 백엔드
cd api
npm install
npm run db:init   # schema.sql + seed.sql 적용
npm run dev       # http://localhost:4000

# 3) 프런트엔드 (다른 터미널)
cd web
npm install
npm run dev        # http://localhost:5173, 백엔드(4000)로 REST 호출
```

레거시 진단·마이그레이션은 로컬 백엔드에서도 동일하게 동작합니다 —
`POST /api/legacy/seed` → `GET /api/legacy/diagnose` → `POST /api/legacy/migrate` →
`GET /api/legacy/verify` (브라우저 데모의 "레거시 진단" 탭과 완전히 같은 SQL).

## GitHub Pages 데모 모드

`web/.env.production`의 `VITE_DEMO=true`가 설정되면 `src/api.js`가 REST 호출 대신
브라우저에 내장된 PGlite(PostgreSQL WASM)를 사용합니다. 최초 방문 시 PostgreSQL
엔진(WASM+데이터, gzip 약 3.7MB)을 내려받아 스키마를 적용하므로 첫 로드에 수 초가
걸립니다. 데이터는 IndexedDB에 저장되어 새로고침 후에도 유지됩니다.
`.github/workflows/deploy.yml`이 `web/` 변경 시 자동으로 빌드·배포합니다.

## 라이선스

MIT License — [LICENSE](LICENSE) 참고.
