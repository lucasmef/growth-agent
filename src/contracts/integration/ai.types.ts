export type AIProviderName = "openai" | "anthropic" | "google";

export type StructuredGenerationRequest<TInput> = {
  task:
    | "GENERATE_STRATEGY"
    | "GENERATE_PILLARS"
    | "GENERATE_CALENDAR"
    | "GENERATE_DRAFT"
    | "GENERATE_INSIGHTS";
  model: string;
  promptVersion: string;
  input: TInput;
  maxRetries?: number;
};

export type StructuredGenerationResult<TOutput> = {
  model: string;
  promptVersion: string;
  output: TOutput;
  finishReason?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
};
