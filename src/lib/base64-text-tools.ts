import type { MessageKey } from "@/lib/i18n"

export type Base64TextResult =
  | { ok: true; value: string }
  | { ok: false; errorKey: MessageKey }

/**
 * Encode a UTF-8 string to base64. Uses TextEncoder so multi-byte characters
 * (emoji, CJK, etc.) round-trip correctly instead of throwing on btoa.
 */
export function encodeBase64(input: string, urlSafe = false): Base64TextResult {
  try {
    const bytes = new TextEncoder().encode(input)
    let binary = ""
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i])
    }
    let base64 = btoa(binary)
    if (urlSafe) {
      base64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    }
    return { ok: true, value: base64 }
  } catch {
    return { ok: false, errorKey: "base64Text.errors.encodeFailed" }
  }
}

/**
 * Decode a base64 (or base64url) string back to a UTF-8 string. Tolerates
 * whitespace and missing padding, and treats malformed input as an error.
 */
export function decodeBase64(input: string): Base64TextResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, errorKey: "base64Text.errors.emptyInput" }
  }

  let normalized = trimmed.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/")
  const remainder = normalized.length % 4
  if (remainder === 2) normalized += "=="
  else if (remainder === 3) normalized += "="
  else if (remainder === 1) {
    return { ok: false, errorKey: "base64Text.errors.invalidBase64" }
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return { ok: false, errorKey: "base64Text.errors.invalidBase64" }
  }

  try {
    const binary = atob(normalized)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    const value = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    return { ok: true, value }
  } catch {
    return { ok: false, errorKey: "base64Text.errors.invalidBase64" }
  }
}
