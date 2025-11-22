import dotenv from "dotenv";
import OpenAI from "openai";

// Load environment variables
dotenv.config({ path: "../../.env" });

/**
 * OpenAI client singleton for Responses API
 */
let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_KEY or OPENAI_API_KEY environment variable is required"
      );
    }

    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}

/**
 * Call OpenAI Responses API with reasoning
 *
 * @param userMessage - The user's message
 * @param reasoningEffort - Controls depth of reasoning: "low", "medium", "high"
 * @returns Response with content and reasoning
 */
export async function getResponseWithReasoning(
  userMessage: string,
  reasoningEffort: "low" | "medium" | "high" = "medium"
) {
  const client = getOpenAIClient();

  // TODO: Once API verification is complete, uncomment this block and remove the stopgap below
  /*
  const response = await client.responses.create({
    model: "gpt-5-nano",
    input: userMessage,
    reasoning: {
      effort: reasoningEffort,
      summary: "auto",
    },
    include: ["reasoning.encrypted_content"],
  });
  */

  // STOPGAP: Using instructions to get CoT with <answer> tags
  // TODO: Remove this block once reasoning summaries are available
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: userMessage,
    instructions:
      "Think step-by-step about the user's question, showing your reasoning and thought process. " +
      "Then, put ONLY your final answer inside <answer></answer> tags.",
  });

  // TODO: Once API verification is complete, uncomment this block and remove the stopgap below
  /*
  // Extract content and reasoning from output items (PROPER IMPLEMENTATION)
  let content = "";
  let reasoning = null;

  for (const item of response.output) {
    console.log("Processing item type:", item.type);

    if (item.type === "message") {
      const messageItem = item as any;
      console.log("Message item:", messageItem);

      if (messageItem.content) {
        for (const contentItem of messageItem.content) {
          console.log("Content item:", contentItem);
          if (contentItem.type === "output_text" && contentItem.text) {
            content += contentItem.text;
          }
        }
      }
    } else if (item.type === "reasoning") {
      const reasoningItem = item as any;
      console.log("Reasoning item:", reasoningItem);

      if (reasoningItem.summary && reasoningItem.summary.length > 0) {
        reasoning = reasoningItem.summary.join("\n");
      } else if (reasoningItem.encrypted_content) {
        reasoning = "[Reasoning present but encrypted - summary not available]";
      }
    }
  }

  console.log("Extracted content:", content);
  console.log("Extracted reasoning:", reasoning);
  */

  // STOPGAP: Extract text and parse <answer> tags
  // TODO: Remove this block once reasoning summaries are available
  let fullText = "";
  for (const item of response.output) {
    if (item.type === "message") {
      const messageItem = item as any;
      if (messageItem.content) {
        for (const contentItem of messageItem.content) {
          if (contentItem.type === "output_text" && contentItem.text) {
            fullText += contentItem.text;
          }
        }
      }
    }
  }

  // Extract final answer from <answer> tags, everything else is CoT
  let reasoning: string | null = null;
  let content = "";

  const answerMatch = fullText.match(/<answer>([\s\S]*?)<\/answer>/);
  if (answerMatch) {
    // Final answer is inside tags
    content = answerMatch[1].trim();
    // Everything outside tags is CoT (remove the answer tags portion)
    reasoning = fullText.replace(/<answer>[\s\S]*?<\/answer>/g, "").trim();
  } else {
    // No answer tags found - treat entire message as CoT
    reasoning = fullText;
    content = fullText; // Also set as content so there's something to return
  }

  return {
    content,
    reasoning,
    fullResponse: response,
  };
}
