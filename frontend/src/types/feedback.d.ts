export type FeedbackType = "reinforce" | "weaken";
export interface FeedbackRequest {
    text_content: string;
    category_id: number;
    feedback_type: FeedbackType;
}
export interface FeedbackResponse {
    message: string;
    category_id: number;
    new_log_id: number;
}
