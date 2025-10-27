import React, { useEffect, useMemo, useState } from "react";
import { login, signup, createCategory, listCategories } from "../lib/api";
import { loadConfig, saveConfig, updateConfig } from "../lib/storage";
import type { LoginRequest, SignupRequest } from "../types/auth";
import type { CategoryCreateRequest, CategoryResponse } from "../types/category";
import type { StoredConfig } from "../types/storage";

interface FormState {
  username: string;
  password: string;
}

const initialForm: FormState = { username: "", password: "" };

interface CategoryFormState {
  name: string;
  keywords: string;
  description: string;
}

// 브라우저 팝업에서 인증, 토글, 카테고리 관리를 담당하는 메인 컴포넌트
const PopupApp: React.FC = () => {
  const [config, setConfig] = useState<StoredConfig | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>({
    name: "",
    keywords: "",
    description: ""
  });
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categories, setCategories] = useState<CategoryResponse[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 확장 팝업이 열릴 때 저장된 설정과 카테고리를 불러온다
  useEffect(() => {
    (async () => {
      const loaded = await loadConfig();
      setConfig(loaded);
      setCategories(loaded.categories ?? []);
    })();
  }, []);

  const isAuthenticated = useMemo(() => Boolean(config?.token && config?.user), [config]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((prev: FormState) => ({ ...prev, [name]: value }));
  };

  const handleCategoryInputChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
  const { name, value } = event.target;
  setCategoryForm((prev: CategoryFormState) => ({ ...prev, [name]: value }));
  };

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  // 로그인/회원가입 제출 처리
  const handleAuthSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!form.username || !form.password) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "signup") {
        const payload: SignupRequest = {
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
      } else {
        const payload: LoginRequest = {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 필터링 기능 on/off 토글 처리
  const handleToggle = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.checked;
    const updated = await updateConfig((prev) => ({
      ...prev,
      isEnabled: next
    }));
    setConfig(updated);
    setInfo(next ? "필터링이 활성화되었습니다." : "필터링이 비활성화되었습니다.");
    if (!next) {
      setCategories(updated.categories ?? []);
    } else if (updated.token) {
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "카테고리 목록을 불러오는 중 문제가 발생했습니다."
      );
    } finally {
      setCategoryLoading(false);
    }
  };

  // 신규 카테고리 등록 처리
  const handleCategorySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    resetMessages();

    if (!categoryForm.name || !categoryForm.keywords) {
      setError("카테고리 이름과 키워드를 입력해주세요.");
      return;
    }

    const payload: CategoryCreateRequest = {
      name: categoryForm.name.trim(),
      keywords: categoryForm.keywords
        .split(",")
        .map((keyword: string) => keyword.trim())
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "카테고리를 생성하는 중 문제가 발생했습니다."
      );
    } finally {
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

  return (
    <div className="popup-root">
      <header className="popup-header">
        <h1>WebPurifier</h1>
        {isAuthenticated && config?.user && (
          <p className="welcome">안녕하세요, {config.user.username}님</p>
        )}
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-info">{info}</div>}

      {!isAuthenticated ? (
        <section>
          <div className="tab-group">
            <button
              className={mode === "login" ? "tab active" : "tab"}
              onClick={() => {
                setMode("login");
                resetMessages();
              }}
            >
              로그인
            </button>
            <button
              className={mode === "signup" ? "tab active" : "tab"}
              onClick={() => {
                setMode("signup");
                resetMessages();
              }}
            >
              회원가입
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label className="form-field">
              <span>아이디</span>
              <input
                name="username"
                value={form.username}
                onChange={handleInputChange}
                placeholder="아이디"
                autoComplete="username"
                disabled={loading}
              />
            </label>
            <label className="form-field">
              <span>비밀번호</span>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleInputChange}
                placeholder="비밀번호"
                autoComplete="current-password"
                disabled={loading}
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
            </button>
          </form>
        </section>
      ) : (
        <section className="authenticated">
          <div className="toggle-row">
            <span>필터링 활성화</span>
            <label className="switch">
              <input
                type="checkbox"
                checked={Boolean(config?.isEnabled)}
                onChange={handleToggle}
              />
              <span className="slider" />
            </label>
          </div>

          <div className="category-block">
            <div className="category-header">
              <h2>카테고리 목록</h2>
              <button
                className="secondary"
                onClick={refreshCategories}
                disabled={categoryLoading}
              >
                새로고침
              </button>
            </div>

            {categoryLoading && <p className="hint">카테고리 정보를 불러오는 중...</p>}

            {categories.length === 0 && !categoryLoading ? (
              <p className="hint">등록된 카테고리가 없습니다.</p>
            ) : (
              <ul className="category-list">
                {categories.map((category) => (
                  <li key={category.id}>
                    <strong>{category.name}</strong>
                    {category.description && <p>{category.description}</p>}
                  </li>
                ))}
              </ul>
            )}

            <form className="category-form" onSubmit={handleCategorySubmit}>
              <h3>카테고리 추가</h3>
              <label className="form-field">
                <span>카테고리 이름</span>
                <input
                  name="name"
                  value={categoryForm.name}
                  onChange={handleCategoryInputChange}
                  placeholder="예: 스포일러"
                  disabled={categoryLoading}
                />
              </label>
              <label className="form-field">
                <span>키워드 (쉼표로 구분)</span>
                <input
                  name="keywords"
                  value={categoryForm.keywords}
                  onChange={handleCategoryInputChange}
                  placeholder="예: 결말, 스포"
                  disabled={categoryLoading}
                />
              </label>
              <label className="form-field">
                <span>설명 (선택)</span>
                <textarea
                  name="description"
                  value={categoryForm.description}
                  onChange={handleCategoryInputChange}
                  placeholder="카테고리 설명을 입력해주세요"
                  disabled={categoryLoading}
                />
              </label>
              <button type="submit" className="primary" disabled={categoryLoading}>
                {categoryLoading ? "저장 중..." : "카테고리 등록"}
              </button>
            </form>
          </div>

          <button className="logout" onClick={handleLogout}>
            로그아웃
          </button>
        </section>
      )}

      <footer className="popup-footer">
        <p>API 기본 주소: {config?.apiBaseUrl ?? "미설정"}</p>
      </footer>
    </div>
  );
};

export default PopupApp;
