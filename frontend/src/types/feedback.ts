// v2 피드백 API 스키마 정의 (백엔드 모델과 1:1 매핑)

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

