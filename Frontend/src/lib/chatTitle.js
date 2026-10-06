// A chat's name for the sidebar: a few meaningful words from the first question.
//   "Should I water my crop today?"        -> "Water my crop today"
//   "How much urea should I apply per acre" -> "How much urea"
// The full question stays available as the tooltip.

const LEADING = [
  /^(please|pls|hey|hi|hello|ok|okay)\s+/i,
  /^(can|could|would) you\s+(please\s+)?(tell me\s+)?/i,
  /^(tell|show|give) me\s+(about\s+)?/i,
  /^what should (i|we) do\s+((on|in|with|about|for)\s+)?/i,
  /^(should|can|do|shall) (i|we)\s+/i,
  /^i (want|would like|like|need) to\s+/i,
  /^what('s| is| are)\s+(the\s+)?/i,
];
const TRAILING_STOP = new Set(['should', 'i', 'the', 'of', 'to', 'a', 'an', 'my', 'for', 'in', 'on', 'is', 'are',
  'and', 'or', 'with', 'at', 'do', 'does', 'can', 'will', 'me', 'we', 'this', 'that', 'it', 'be']);

export function chatTitle(raw, { words = 4, fallback = '' } = {}) {
  let text = String(raw || '').split('\n')[0].trim().replace(/[?.!,;:]+$/g, '');
  if (!text) return fallback;
  for (let pass = 0; pass < 2; pass += 1) {
    for (const re of LEADING) text = text.replace(re, '');
  }
  let parts = text.split(/\s+/).filter(Boolean).slice(0, words);
  while (parts.length > 1 && TRAILING_STOP.has(parts[parts.length - 1].toLowerCase())) parts = parts.slice(0, -1);
  // trimmed down to one word: the question itself reads better
  if (parts.length < 2) parts = String(raw).split(/\s+/).slice(0, words);
  const short = parts.join(' ').replace(/[?.!,;:]+$/g, '');
  return short ? short.charAt(0).toUpperCase() + short.slice(1) : fallback;
}
