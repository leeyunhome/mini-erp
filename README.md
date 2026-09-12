# mini-erp

**해운 용선(Charter)·정산 관리 미니 ERP 토이 프로젝트 — React + Node.js/Express + PostgreSQL**

선박 용선계약을 등록하고, 계약별 정산(용선료·연료비·항비 등) 내역을 원장 형태로 기록하며,
계약별/월별 집계와 미정산 계약을 리포트로 확인하는 3모듈짜리 사내 업무 시스템을
축소 재현한 개인 학습 프로젝트입니다.

🔗 **라이브 데모(정적, 인메모리 목 데이터)**: https://leeyunhome.github.io/mini-erp/

---

## 이 프로젝트를 만든 이유

React/Java/PostgreSQL 스택을 요구하는 채용 공고(해운업 사내 시스템 개발)에 지원하면서,
해당 스택으로 실제 도메인과 비슷한 문제를 풀어보는 학습용 결과물이 필요해 만들었습니다.
**실무 경력이 아니라 개인 학습 프로젝트**이며, React 프런트엔드와 SQL(JOIN·서브쿼리·집계)
설계 능력을 보여주는 것이 목적입니다. 백엔드는 실제 보유 경험과 일치하는 Node.js/Express로
구현했고, 회사가 요구하는 Java(Spring)는 별도로 빠르게 학습해 합류 후 적응할 계획입니다.

## 모듈 구성

| 모듈 | 내용 |
|---|---|
| **용선계약 관리** | 계약 등록/수정/삭제, 선박·용선주·용선형태(TIME/VOYAGE/BAREBOAT)·일일 용선료·기간·상태 관리, 상태별 필터 |
| **정산(원장) 관리** | 계약별 정산 항목(용선료/연료비/항비/조정) 추가·삭제, 차변(DEBIT)/대변(CREDIT) 구분, 계약별 합계 실시간 계산 |
| **집계 리포트** | 계약별 정산 순액 집계(JOIN + GROUP BY), 월별 용선료 매출 추이(date_trunc), 미정산 계약 조회(NOT EXISTS 서브쿼리) |

## 기술 스택

- **프런트엔드**: React 18 (Vite), React Router — 순수 컴포넌트 상태 관리(별도 상태 라이브러리 없이 useState/useEffect)
- **백엔드**: Node.js + Express, REST API (`/api/contracts`, `/api/ledger`, `/api/reports`, `/api/vessels`)
- **DB**: PostgreSQL — `node-postgres(pg)`로 연결, `schema.sql`에 테이블/인덱스, `seed.sql`에 샘플 데이터
- **SQL 설계**: 3테이블(vessels·charter_contracts·ledger_entries) JOIN, `GROUP BY` 집계, 상관 서브쿼리, `NOT EXISTS` 서브쿼리

## 구조

```
mini-erp/
├─ api/                  # Express + PostgreSQL 백엔드
│  ├─ schema.sql         # 테이블 정의
│  ├─ seed.sql           # 샘플 데이터
│  ├─ db.js              # pg Pool 설정
│  ├─ server.js          # Express 앱 진입점
│  └─ routes/            # contracts / ledger / reports / vessels
├─ web/                  # React(Vite) 프런트엔드
│  └─ src/
│     ├─ api.js          # 백엔드 REST 클라이언트 (데모 빌드에서는 목 데이터로 자동 전환)
│     ├─ mock/data.js    # GitHub Pages 정적 배포용 인메모리 목 데이터
│     └─ pages/          # Contracts / Ledger / Reports
└─ docker-compose.yml    # 로컬 PostgreSQL 실행용
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

## GitHub Pages 데모 모드

GitHub Pages는 정적 호스팅이라 Express/PostgreSQL 백엔드를 띄울 수 없습니다.
`web/.env.production`의 `VITE_DEMO=true`가 설정되면 `src/api.js`가 REST 호출 대신
`src/mock/data.js`의 인메모리 데이터를 읽고 씁니다(새로고침 시 초기화). 화면·조작 흐름은
실제 백엔드 연동 버전과 동일하며, 리포트 집계 로직도 백엔드 SQL과 동일하게 클라이언트에서
재현했습니다. `.github/workflows/deploy.yml`이 `web/` 변경 시 자동으로 빌드·배포합니다.

## 라이선스

MIT License — [LICENSE](LICENSE) 참고.
