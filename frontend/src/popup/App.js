import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { login, signup, createCategory, listCategories } from "../lib/api";
import { loadConfig, saveConfig, updateConfig } from "../lib/storage";
const initialForm = { username: "", password: "" };
// 브라우저 팝업에서 인증, 토글, 카테고리 관리를 담당하는 메인 컴포넌트
const PopupApp = () => {
    const [config, setConfig] = useState(null);
    const [form, setForm] = useState(initialForm);
    const [mode, setMode] = useState("login");
    const [loading, setLoading] = useState(false);
    const [categoryForm, setCategoryForm] = useState({
        name: "",
        keywords: "",
        description: ""
    });
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState(null);
    const [info, setInfo] = useState(null);
    // 확장 팝업이 열릴 때 저장된 설정과 카테고리를 불러온다
    useEffect(() => {
        (async () => {
            const loaded = await loadConfig();
            setConfig(loaded);
            setCategories(loaded.categories ?? []);
        })();
    }, []);
    const isAuthenticated = useMemo(() => Boolean(config?.token && config?.user), [config]);
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };
    const handleCategoryInputChange = (event) => {
        const { name, value } = event.target;
        setCategoryForm((prev) => ({ ...prev, [name]: value }));
    };
    const resetMessages = () => {
        setError(null);
        setInfo(null);
    };
    // 로그인/회원가입 제출 처리
    const handleAuthSubmit = async (event) => {
        event.preventDefault();
        resetMessages();
        if (!form.username || !form.password) {
            setError("아이디와 비밀번호를 모두 입력해주세요.");
            return;
        }
        setLoading(true);
        try {
            if (mode === "signup") {
                const payload = {
                    username: form.username,
                    password: form.password
                };
                const response = await signup(payload);
                await saveConfig({
                    apiBaseUrl: config?.apiBaseUrl ?? "http://localhost:8000",
                    isEnabled: true,
                    token: response.access_token,
                    user: { id: response.id, username: response.username },
                    categories: []
                });
                setInfo("회원가입에 성공했어요. 바로 로그인 상태로 전환되었습니다.");
            }
            else {
                const payload = {
                    username: form.username,
                    password: form.password
                };
                const response = await login(payload);
                await updateConfig((prev) => ({
                    ...prev,
                    isEnabled: true,
                    token: response.access_token,
                    user: { id: response.id, username: response.username },
                    categories: prev.categories ?? []
                }));
                setInfo("로그인에 성공했어요.");
            }
            const fresh = await loadConfig();
            setConfig(fresh);
            setCategories([]);
            setForm(initialForm);
            await refreshCategories();
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "요청 처리 중 오류가 발생했습니다.");
        }
        finally {
            setLoading(false);
        }
    };
    // 필터링 기능 on/off 토글 처리
    const handleToggle = async (event) => {
        const next = event.target.checked;
        const updated = await updateConfig((prev) => ({
            ...prev,
            isEnabled: next
        }));
        setConfig(updated);
        setInfo(next ? "필터링이 활성화되었습니다." : "필터링이 비활성화되었습니다.");
        if (!next) {
            setCategories(updated.categories ?? []);
        }
        else if (updated.token) {
            await refreshCategories();
        }
    };
    // 백엔드에서 최신 카테고리 목록을 조회
    const refreshCategories = async () => {
        const current = await loadConfig();
        setConfig(current);
        if (!current.token) {
            return;
        }
        setCategoryLoading(true);
        resetMessages();
        try {
            const list = await listCategories(current);
            setCategories(list);
            await updateConfig((prev) => ({
                ...prev,
                categories: list
            }));
            if (list.length === 0) {
                setInfo("등록된 카테고리가 없습니다. 아래에서 추가해보세요.");
            }
        }
        catch (err) {
            setError(err instanceof Error
                ? err.message
                : "카테고리 목록을 불러오는 중 문제가 발생했습니다.");
        }
        finally {
            setCategoryLoading(false);
        }
    };
    // 신규 카테고리 등록 처리
    const handleCategorySubmit = async (event) => {
        event.preventDefault();
        resetMessages();
        if (!categoryForm.name || !categoryForm.keywords) {
            setError("카테고리 이름과 키워드를 입력해주세요.");
            return;
        }
        const payload = {
            name: categoryForm.name.trim(),
            keywords: categoryForm.keywords
                .split(",")
                .map((keyword) => keyword.trim())
                .filter(Boolean),
            description: categoryForm.description.trim() || undefined
        };
        if (payload.keywords.length === 0) {
            setError("최소 한 개 이상의 키워드를 입력해주세요.");
            return;
        }
        setCategoryLoading(true);
        try {
            const created = await createCategory(payload, config ?? undefined);
            const updatedCategories = [...categories, created];
            setCategories(updatedCategories);
            await updateConfig((prev) => ({
                ...prev,
                categories: updatedCategories
            }));
            setCategoryForm({ name: "", keywords: "", description: "" });
            setInfo(`'${created.name}' 카테고리가 생성되었습니다.`);
        }
        catch (err) {
            setError(err instanceof Error
                ? err.message
                : "카테고리를 생성하는 중 문제가 발생했습니다.");
        }
        finally {
            setCategoryLoading(false);
        }
    };
    // 로그아웃 시 토큰과 사용자 정보를 제거
    const handleLogout = async () => {
        resetMessages();
        const updated = await updateConfig((prev) => ({
            apiBaseUrl: prev.apiBaseUrl,
            isEnabled: false,
            token: undefined,
            user: undefined,
            categories: []
        }));
        setConfig(updated);
        setCategories([]);
        setInfo("로그아웃되었습니다.");
    };
    return (_jsxs("div", { className: "popup-root", children: [_jsxs("header", { className: "popup-header", children: [_jsx("h1", { children: "WebPurifier" }), isAuthenticated && config?.user && (_jsxs("p", { className: "welcome", children: ["\uC548\uB155\uD558\uC138\uC694, ", config.user.username, "\uB2D8"] }))] }), error && _jsx("div", { className: "alert alert-error", children: error }), info && _jsx("div", { className: "alert alert-info", children: info }), !isAuthenticated ? (_jsxs("section", { children: [_jsxs("div", { className: "tab-group", children: [_jsx("button", { className: mode === "login" ? "tab active" : "tab", onClick: () => {
                                    setMode("login");
                                    resetMessages();
                                }, children: "\uB85C\uADF8\uC778" }), _jsx("button", { className: mode === "signup" ? "tab active" : "tab", onClick: () => {
                                    setMode("signup");
                                    resetMessages();
                                }, children: "\uD68C\uC6D0\uAC00\uC785" })] }), _jsxs("form", { className: "auth-form", onSubmit: handleAuthSubmit, children: [_jsxs("label", { className: "form-field", children: [_jsx("span", { children: "\uC544\uC774\uB514" }), _jsx("input", { name: "username", value: form.username, onChange: handleInputChange, placeholder: "\uC544\uC774\uB514", autoComplete: "username", disabled: loading })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "\uBE44\uBC00\uBC88\uD638" }), _jsx("input", { type: "password", name: "password", value: form.password, onChange: handleInputChange, placeholder: "\uBE44\uBC00\uBC88\uD638", autoComplete: "current-password", disabled: loading })] }), _jsx("button", { type: "submit", className: "primary", disabled: loading, children: loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입" })] })] })) : (_jsxs("section", { className: "authenticated", children: [_jsxs("div", { className: "toggle-row", children: [_jsx("span", { children: "\uD544\uD130\uB9C1 \uD65C\uC131\uD654" }), _jsxs("label", { className: "switch", children: [_jsx("input", { type: "checkbox", checked: Boolean(config?.isEnabled), onChange: handleToggle }), _jsx("span", { className: "slider" })] })] }), _jsxs("div", { className: "category-block", children: [_jsxs("div", { className: "category-header", children: [_jsx("h2", { children: "\uCE74\uD14C\uACE0\uB9AC \uBAA9\uB85D" }), _jsx("button", { className: "secondary", onClick: refreshCategories, disabled: categoryLoading, children: "\uC0C8\uB85C\uACE0\uCE68" })] }), categoryLoading && _jsx("p", { className: "hint", children: "\uCE74\uD14C\uACE0\uB9AC \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." }), categories.length === 0 && !categoryLoading ? (_jsx("p", { className: "hint", children: "\uB4F1\uB85D\uB41C \uCE74\uD14C\uACE0\uB9AC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("ul", { className: "category-list", children: categories.map((category) => (_jsxs("li", { children: [_jsx("strong", { children: category.name }), category.description && _jsx("p", { children: category.description })] }, category.id))) })), _jsxs("form", { className: "category-form", onSubmit: handleCategorySubmit, children: [_jsx("h3", { children: "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00" }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "\uCE74\uD14C\uACE0\uB9AC \uC774\uB984" }), _jsx("input", { name: "name", value: categoryForm.name, onChange: handleCategoryInputChange, placeholder: "\uC608: \uC2A4\uD3EC\uC77C\uB7EC", disabled: categoryLoading })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "\uD0A4\uC6CC\uB4DC (\uC27C\uD45C\uB85C \uAD6C\uBD84)" }), _jsx("input", { name: "keywords", value: categoryForm.keywords, onChange: handleCategoryInputChange, placeholder: "\uC608: \uACB0\uB9D0, \uC2A4\uD3EC", disabled: categoryLoading })] }), _jsxs("label", { className: "form-field", children: [_jsx("span", { children: "\uC124\uBA85 (\uC120\uD0DD)" }), _jsx("textarea", { name: "description", value: categoryForm.description, onChange: handleCategoryInputChange, placeholder: "\uCE74\uD14C\uACE0\uB9AC \uC124\uBA85\uC744 \uC785\uB825\uD574\uC8FC\uC138\uC694", disabled: categoryLoading })] }), _jsx("button", { type: "submit", className: "primary", disabled: categoryLoading, children: categoryLoading ? "저장 중..." : "카테고리 등록" })] })] }), _jsx("button", { className: "logout", onClick: handleLogout, children: "\uB85C\uADF8\uC544\uC6C3" })] })), _jsx("footer", { className: "popup-footer", children: _jsxs("p", { children: ["API \uAE30\uBCF8 \uC8FC\uC18C: ", config?.apiBaseUrl ?? "미설정"] }) })] }));
};
export default PopupApp;
