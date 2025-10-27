export interface FilterRequest {
    text: string;
    threshold: number;
}
export interface MatchedCategoryInfo {
    id: number;
    name: string;
    similarity: number;
}
export interface FilterResponse {
    should_filter: boolean;
    matched_categories: MatchedCategoryInfo[];
}
