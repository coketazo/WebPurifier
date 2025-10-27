import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
// Vite 설정: Chrome 확장 리소스를 위한 다중 엔트리 구성
export default defineConfig({
    plugins: [react()],
    publicDir: "public",
    build: {
        outDir: "dist",
        emptyOutDir: true,
        rollupOptions: {
            input: {
                popup: resolvePath("./popup.html"),
                options: resolvePath("./options.html"),
                background: resolvePath("./src/background/index.ts"),
                content: resolvePath("./src/content/index.ts")
            },
            output: {
                entryFileNames: (chunkInfo) => {
                    if (chunkInfo.name === "background") {
                        return "background.js";
                    }
                    if (chunkInfo.name === "content") {
                        return "content.js";
                    }
                    return "assets/[name].js";
                },
                chunkFileNames: "assets/[name].js",
                assetFileNames: "assets/[name][extname]"
            }
        }
    }
});
// 상대 경로를 절대 경로로 변환하는 헬퍼 함수
function resolvePath(relativePath) {
    // node:url의 fileURLToPath를 사용해 OS에 맞는 파일 경로로 변환한다
    return fileURLToPath(new URL(relativePath, import.meta.url));
}
