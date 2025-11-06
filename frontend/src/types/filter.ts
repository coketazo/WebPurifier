// 필터 관련 타입 (백엔드 v2 스키마 반영)
export interface FilterRequest {
  texts: string[];
  threshold: number;
}

export interface MatchedCategoryInfo {
  id: number;
  name: string;
  similarity: number;
}

export interface FilterResult {
  text: string;
  should_filter: boolean;
  matched_categories: MatchedCategoryInfo[];
}

export interface FilterResponse {
  results: FilterResult[];
}
