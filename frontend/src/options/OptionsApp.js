import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../lib/storage";
import { DEFAULT_API_BASE_URL } from "../types/storage";
// 옵션 페이지에서 API 기본 주소를 수정하는 컴포넌트
const OptionsApp = () => {
    const [form, setForm] = useState({ apiBaseUrl: DEFAULT_API_BASE_URL });
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    // 초기 렌더링 시 저장된 API 주소를 불러온다
    useEffect(() => {
        (async () => {
            const config = await loadConfig();
            setForm({ apiBaseUrl: config.apiBaseUrl || DEFAULT_API_BASE_URL });
        })();
    }, []);
    const handleChange = (event) => {
        setForm({ apiBaseUrl: event.target.value });
    };
    // 주소 저장 버튼을 눌렀을 때 실행
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        setStatus(null);
        if (!form.apiBaseUrl.startsWith("http")) {
            setError("http:// 또는 https:// 로 시작하는 주소를 입력해주세요.");
            return;
        }
        try {
            const current = await loadConfig();
            await saveConfig({
                ...current,
                apiBaseUrl: form.apiBaseUrl.replace(/\/$/, ""),
                categories: current.categories ?? []
            });
            setStatus("API 기본 주소가 저장되었습니다.");
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.");
        }
    };
    // 기본값으로 되돌리기 버튼 처리
    const handleReset = async () => {
        setForm({ apiBaseUrl: DEFAULT_API_BASE_URL });
        const current = await loadConfig();
        await saveConfig({
            ...current,
            apiBaseUrl: DEFAULT_API_BASE_URL
        });
        setError(null);
        setStatus("API 기본 주소가 초기화되었습니다.");
    };
    return (_jsxs("div", { className: "options-root", children: [_jsx("h1", { children: "WebPurifier \uC635\uC158" }), _jsx("p", { className: "description", children: "\uBC31\uC5D4\uB4DC \uBC30\uD3EC \uC8FC\uC18C\uAC00 \uBCC0\uACBD\uB418\uBA74 \uC5EC\uAE30\uC5D0\uC11C \uC218\uC815\uD574\uC8FC\uC138\uC694." }), status && _jsx("div", { className: "message success", children: status }), error && _jsx("div", { className: "message error", children: error }), _jsxs("form", { onSubmit: handleSubmit, className: "options-form", children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { children: "API \uAE30\uBCF8 \uC8FC\uC18C" }), _jsx("input", { value: form.apiBaseUrl, onChange: handleChange })] }), _jsxs("div", { className: "button-row", children: [_jsx("button", { type: "submit", className: "primary", children: "\uC800\uC7A5" }), _jsx("button", { type: "button", className: "secondary", onClick: handleReset, children: "\uAE30\uBCF8\uAC12\uC73C\uB85C" })] })] })] }));
};
export default OptionsApp;
