import React from "react";
import { createRoot } from "react-dom/client";
import OptionsApp from "./OptionsApp";
import "./styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("옵션 페이지 루트 요소를 찾을 수 없습니다.");
}

const root = createRoot(container);
root.render(<OptionsApp />);
