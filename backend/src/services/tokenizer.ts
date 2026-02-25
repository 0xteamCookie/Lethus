// count tokens exactly as openai does

import { encode, decode } from "gpt-tokenizer";
import type { ChatMessage } from "../types";

export function countTokens(text: string): number {
  return encode(text).length;
}

// count tokens for a chat message.
// openai adds overhead per message
//   - 3 tokens for the message envelope (<|im_start|>role\n)
//   - 1 token for the content separator
//   - 3 tokens for the reply prefix at the end

export function countMessageTokens(message: ChatMessage): number {
  return countTokens(message.content) + 4;
}

// count token for array of messages
// used for calculating context size before sending
export function countMessagesTokens(messages: ChatMessage[]): number {
  // Sum per-message counts + 3 for the priming reply at end
  return messages.reduce(
    (sum, msg) => sum + countMessageTokens(msg),
    3, // base overhead for the entire messages array
  );
}

// // ── Truncate text to a token limit ──────────────────────────
// Used when content might exceed limits.
// Truncates word-by-word from the end to stay within limit.
// More accurate than char-based truncation.
export function truncateToTokens(text: string, maxTokens: number): string {
  const tokens = encode(text);
  if (tokens.length <= maxTokens) {
    return text;
  }

  return decode(tokens.slice(0, maxTokens));
}
