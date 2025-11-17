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
export interface CategoryDeleteRequest {
    id: number;
}
export interface CategoryDeleteResponse {
    id: number;
    message: string;
}
