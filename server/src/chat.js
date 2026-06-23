/**
 * Chat moderation — server-side sanitization for the live WebSocket chat.
 */

const PROFANITY = [
  "fuck", "shit", "bitch", "cunt", "asshole", "dick", "pussy", "whore",
  "slut", "nigger", "nigga", "faggot", "retard", "cock", "bastard",
  "douchebag", "dipshit", "motherfucker",
];
const PROFANITY_RE = new RegExp(`\\b(?:${PROFANITY.join("|")})[a-z]*\\b`, "gi");

const LINK_RE =
  /(https?:\/\/\S+|www\.\S+|\b[\w-]+\.(?:com|net|org|io|gg|xyz|fun|app|co|me)(?:\/\S*)?\b)/gi;

export function sanitizeChat(raw) {
  let text = String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  if (!text) return "";
  text = text.replace(LINK_RE, "[link removed]");
  text = text.replace(PROFANITY_RE, (m) => m[0] + "*".repeat(m.length - 1));
  return text.trim();
}

export function cleanName(raw) {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 20);
}

export function isSignedIn(name) {
  return cleanName(name).length > 0;
}
