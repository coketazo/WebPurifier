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
