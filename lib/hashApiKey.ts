import crypto from "crypto";

export function hashApiKey(key: string) {
  return crypto.createHash("sha256").update(key).digest("hex");
}