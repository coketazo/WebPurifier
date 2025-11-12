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
