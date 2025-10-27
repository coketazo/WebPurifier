import React, { useEffect, useState } from "react";
import { loadConfig, saveConfig } from "../lib/storage";
import { DEFAULT_API_BASE_URL } from "../types/storage";

interface OptionsForm {
  apiBaseUrl: string;
}

// 옵션 페이지에서 API 기본 주소를 수정하는 컴포넌트
const OptionsApp: React.FC = () => {
  const [form, setForm] = useState<OptionsForm>({ apiBaseUrl: DEFAULT_API_BASE_URL });
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 초기 렌더링 시 저장된 API 주소를 불러온다
  useEffect(() => {
    (async () => {
      const config = await loadConfig();
      setForm({ apiBaseUrl: config.apiBaseUrl || DEFAULT_API_BASE_URL });
    })();
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ apiBaseUrl: event.target.value });
  };

  // 주소 저장 버튼을 눌렀을 때 실행
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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
    } catch (err) {
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

  return (
    <div className="options-root">
      <h1>WebPurifier 옵션</h1>
      <p className="description">
        백엔드 배포 주소가 변경되면 여기에서 수정해주세요.
      </p>

      {status && <div className="message success">{status}</div>}
      {error && <div className="message error">{error}</div>}

      <form onSubmit={handleSubmit} className="options-form">
        <label className="form-field">
          <span>API 기본 주소</span>
          <input value={form.apiBaseUrl} onChange={handleChange} />
        </label>
        <div className="button-row">
          <button type="submit" className="primary">
            저장
          </button>
          <button type="button" className="secondary" onClick={handleReset}>
            기본값으로
          </button>
        </div>
      </form>
    </div>
  );
};

export default OptionsApp;
