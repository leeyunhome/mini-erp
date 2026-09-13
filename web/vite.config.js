import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command }) => ({
    plugins: [react()],
    base: command === "build" ? "/mini-erp/" : "/",
    // shared/·api/의 SQL·JS를 ?raw로 그대로 가져다 쓰므로(단일 소스 유지),
    // 프로젝트 루트(web/) 밖인 mini-erp/ 상위 폴더 접근을 허용해야 한다.
    server: { fs: { allow: [".."] } },
    // PGlite는 WASM+데이터 자산을 자체 경로로 로드한다 — 사전 번들링하면 그 경로가 깨진다.
    optimizeDeps: { exclude: ["@electric-sql/pglite"] },
}));
