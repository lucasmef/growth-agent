import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";

type GenerateStructuredObjectInput<TSchema extends z.ZodTypeAny> = {
  schema: TSchema;
  system: string;
  prompt: string;
  model?: string;
};

export async function generateStructuredObject<TSchema extends z.ZodTypeAny>({
  schema,
  system,
  prompt,
  model = "gpt-5-mini",
}: GenerateStructuredObjectInput<TSchema>) {
  const result = await generateObject({
    model: openai(model),
    schema,
    system,
    prompt,
  });

  return {
    object: result.object,
    finishReason: result.finishReason,
    usage: result.usage,
  };
}
