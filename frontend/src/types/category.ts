// 카테고리 관련 타입 (백엔드 v2 스키마 반영)
export interface CategoryCreateRequest {
  name: string;
  keywords: string[];
  description?: string | null;
}

export interface CategoryResponse {
  id: number;
  name: string;
  description: string | null;
}
