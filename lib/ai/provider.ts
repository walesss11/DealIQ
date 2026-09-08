import { OpenAI } from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  client ??= new OpenAI({ apiKey });
  return client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMRequest {
  systemPrompt?: string;
  userPrompt?: string;
  messages?: ChatMessage[];
  responseFormat?: "text" | "json";
  model?: string;
  temperature?: number;
}

export async function callLLM(options: LLMRequest): Promise<string> {
  const modelName = options.model || process.env.OPENAI_MODEL || "gpt-4o";
  const isJson = options.responseFormat === "json";

  try {
    const formattedMessages: ChatMessage[] = [];
    if (options.systemPrompt) {
      formattedMessages.push({ role: "system", content: options.systemPrompt });
    }
    if (options.messages && options.messages.length > 0) {
      formattedMessages.push(...options.messages);
    } else if (options.userPrompt) {
      formattedMessages.push({ role: "user", content: options.userPrompt });
    }

    const response = await getClient().chat.completions.create({
      model: modelName,
      messages: formattedMessages,
      temperature: options.temperature ?? 0.1,
      response_format: isJson ? { type: "json_object" } : undefined,
    });

    const resultText = response.choices[0]?.message?.content || "";
    return resultText;
  } catch (error: unknown) {
    console.error("LLM Provider call failed:", error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM call failed: ${message}`);
  }
}
