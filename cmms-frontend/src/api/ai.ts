import { api } from './client';

export interface AiSuggestion {
  suggestedCategoryId: number | null;
  suggestedCategoryName: string | null;
  suggestedPriority: string | null;
  reasoning: string | null;
}

export const aiApi = {
  suggestRequestClassification: (title: string, description?: string) =>
    api.post<AiSuggestion>('/ai/suggest-request-classification', { title, description }),
};
