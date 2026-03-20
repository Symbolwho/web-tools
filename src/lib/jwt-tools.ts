import {
  SignJWT,
  compactVerify,
  importPKCS8,
  importSPKI,
  type CryptoKey,
  type JWTHeaderParameters,
  type JWTPayload,
} from "jose"

export type JwtAlgorithm = "HS256" | "HS384" | "HS512" | "RS256" | "ES256"
export type JwtClaimName = "exp" | "nbf" | "iss" | "aud"
export type JwtClaimCheckStatus = "passed" | "failed" | "skipped"

export type JwtToolErrorKey =
  | "jwt.errors.emptyToken"
  | "jwt.errors.invalidCompactToken"
  | "jwt.errors.invalidHeaderEncoding"
  | "jwt.errors.invalidPayloadEncoding"
  | "jwt.errors.invalidSignatureEncoding"
  | "jwt.errors.invalidHeaderJson"
  | "jwt.errors.invalidPayloadJson"
  | "jwt.errors.unsupportedAlgorithm"
  | "jwt.errors.missingVerificationKey"
  | "jwt.errors.missingSigningKey"
  | "jwt.errors.invalidKeyFormat"
  | "jwt.errors.invalidClockTolerance"
  | "jwt.errors.signatureVerificationFailed"
  | "jwt.errors.tokenExpired"
  | "jwt.errors.tokenNotActive"
  | "jwt.errors.issuerMismatch"
  | "jwt.errors.audienceMismatch"
  | "jwt.errors.invalidExpirationClaim"
  | "jwt.errors.invalidNotBeforeClaim"
  | "jwt.errors.invalidHeaderInput"
  | "jwt.errors.invalidPayloadInput"
  | "jwt.errors.headerAlgorithmConflict"
  | "jwt.errors.signFailed"

export type JwtToolResult<T> = { ok: true; value: T } | { ok: false; errorKey: JwtToolErrorKey }

export type JwtDecodeValue = {
  header: Record<string, unknown>
  payload: Record<string, unknown>
  headerText: string
  payloadText: string
  algorithm: string | null
  signature: {
    encoded: string
    present: boolean
    byteLength: number
  }
}

export type JwtDecodeResult = JwtToolResult<JwtDecodeValue>

export type JwtClaimCheck = {
  claim: JwtClaimName
  status: JwtClaimCheckStatus
  errorKey:
    | "jwt.errors.tokenExpired"
    | "jwt.errors.tokenNotActive"
    | "jwt.errors.issuerMismatch"
    | "jwt.errors.audienceMismatch"
    | "jwt.errors.invalidExpirationClaim"
    | "jwt.errors.invalidNotBeforeClaim"
    | null
}

export type JwtVerifyValue = JwtDecodeValue & {
  signatureValid: boolean
  signatureErrorKey: "jwt.errors.signatureVerificationFailed" | null
  claimChecks: JwtClaimCheck[]
  claimsValid: boolean
}

export type JwtVerifyResult = JwtToolResult<JwtVerifyValue>

export type JwtSignValue = {
  token: string
  header: Record<string, unknown>
  payload: Record<string, unknown>
}

export type JwtSignResult = JwtToolResult<JwtSignValue>

type VerifyJwtTokenOptions = {
  token: string
  key: string
  expectedIssuer?: string
  expectedAudience?: string
  clockToleranceSeconds?: number
}

type SignJwtTokenOptions = {
  algorithm: JwtAlgorithm
  secretOrPrivateKey: string
  headerInput: string
  payloadInput: string
}

type JsonInputErrorKey = "jwt.errors.invalidHeaderInput" | "jwt.errors.invalidPayloadInput"
type ImportedJwtKey = CryptoKey | Uint8Array

type JwtKeyImportResult =
  | { ok: true; value: ImportedJwtKey }
  | {
      ok: false
      errorKey: "jwt.errors.missingVerificationKey" | "jwt.errors.missingSigningKey" | "jwt.errors.invalidKeyFormat"
    }

const SUPPORTED_ALGORITHMS: readonly JwtAlgorithm[] = ["HS256", "HS384", "HS512", "RS256", "ES256"]
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function ok<T>(value: T): JwtToolResult<T> {
  return { ok: true, value }
}

function err<T>(errorKey: JwtToolErrorKey): JwtToolResult<T> {
  return { ok: false, errorKey }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

function isJwtAlgorithm(value: string): value is JwtAlgorithm {
  return SUPPORTED_ALGORITHMS.includes(value as JwtAlgorithm)
}

function decodeBase64UrlSegment(segment: string) {
  const normalized = segment.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")

  try {
    const binary = atob(padded)
    return Uint8Array.from(binary, (char) => char.charCodeAt(0))
  } catch {
    return null
  }
}

function decodeJsonSegment(
  segment: string,
  encodingErrorKey: "jwt.errors.invalidHeaderEncoding" | "jwt.errors.invalidPayloadEncoding",
  jsonErrorKey: "jwt.errors.invalidHeaderJson" | "jwt.errors.invalidPayloadJson",
): JwtToolResult<Record<string, unknown>> {
  const bytes = decodeBase64UrlSegment(segment)
  if (!bytes) {
    return err(encodingErrorKey)
  }

  try {
    const parsed = JSON.parse(textDecoder.decode(bytes))
    return isJsonObject(parsed) ? ok(parsed) : err(jsonErrorKey)
  } catch {
    return err(jsonErrorKey)
  }
}

function parseCompactToken(token: string): JwtToolResult<{ headerSegment: string; payloadSegment: string; signatureSegment: string }> {
  const trimmed = token.trim()
  if (!trimmed) {
    return err("jwt.errors.emptyToken")
  }

  const parts = trimmed.split(".")
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    return err("jwt.errors.invalidCompactToken")
  }

  return ok({
    headerSegment: parts[0],
    payloadSegment: parts[1],
    signatureSegment: parts[2],
  })
}

function parseJsonObjectInput(input: string, errorKey: JsonInputErrorKey): JwtToolResult<Record<string, unknown>> {
  const trimmed = input.trim()
  if (!trimmed) {
    return errorKey === "jwt.errors.invalidHeaderInput" ? ok({}) : err(errorKey)
  }

  try {
    const parsed = JSON.parse(trimmed)
    return isJsonObject(parsed) ? ok(parsed) : err(errorKey)
  } catch {
    return err(errorKey)
  }
}

async function importVerificationKey(algorithm: JwtAlgorithm, key: string): Promise<JwtKeyImportResult> {
  const trimmed = key.trim()
  if (!trimmed) {
    return { ok: false, errorKey: "jwt.errors.missingVerificationKey" }
  }

  if (algorithm.startsWith("HS")) {
    return { ok: true, value: textEncoder.encode(trimmed) }
  }

  try {
    return { ok: true, value: await importSPKI(trimmed, algorithm) }
  } catch {
    return { ok: false, errorKey: "jwt.errors.invalidKeyFormat" }
  }
}

async function importSigningKey(algorithm: JwtAlgorithm, key: string): Promise<JwtKeyImportResult> {
  const trimmed = key.trim()
  if (!trimmed) {
    return { ok: false, errorKey: "jwt.errors.missingSigningKey" }
  }

  if (algorithm.startsWith("HS")) {
    return { ok: true, value: textEncoder.encode(trimmed) }
  }

  try {
    return { ok: true, value: await importPKCS8(trimmed, algorithm) }
  } catch {
    return { ok: false, errorKey: "jwt.errors.invalidKeyFormat" }
  }
}

function isClaimNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function getAudienceMatches(audience: unknown, expectedAudience: string) {
  return (
    audience === expectedAudience ||
    (Array.isArray(audience) && audience.some((value) => typeof value === "string" && value === expectedAudience))
  )
}

function buildClaimChecks(
  payload: Record<string, unknown>,
  expectedIssuer: string,
  expectedAudience: string,
  clockToleranceSeconds: number,
): JwtClaimCheck[] {
  const nowSeconds = Date.now() / 1000
  const claimChecks: JwtClaimCheck[] = []

  if (payload.exp === undefined) {
    claimChecks.push({ claim: "exp", status: "skipped", errorKey: null })
  } else if (!isClaimNumber(payload.exp)) {
    claimChecks.push({ claim: "exp", status: "failed", errorKey: "jwt.errors.invalidExpirationClaim" })
  } else if (nowSeconds - clockToleranceSeconds >= payload.exp) {
    claimChecks.push({ claim: "exp", status: "failed", errorKey: "jwt.errors.tokenExpired" })
  } else {
    claimChecks.push({ claim: "exp", status: "passed", errorKey: null })
  }

  if (payload.nbf === undefined) {
    claimChecks.push({ claim: "nbf", status: "skipped", errorKey: null })
  } else if (!isClaimNumber(payload.nbf)) {
    claimChecks.push({ claim: "nbf", status: "failed", errorKey: "jwt.errors.invalidNotBeforeClaim" })
  } else if (nowSeconds + clockToleranceSeconds < payload.nbf) {
    claimChecks.push({ claim: "nbf", status: "failed", errorKey: "jwt.errors.tokenNotActive" })
  } else {
    claimChecks.push({ claim: "nbf", status: "passed", errorKey: null })
  }

  if (!expectedIssuer.trim()) {
    claimChecks.push({ claim: "iss", status: "skipped", errorKey: null })
  } else if (payload.iss === expectedIssuer) {
    claimChecks.push({ claim: "iss", status: "passed", errorKey: null })
  } else {
    claimChecks.push({ claim: "iss", status: "failed", errorKey: "jwt.errors.issuerMismatch" })
  }

  if (!expectedAudience.trim()) {
    claimChecks.push({ claim: "aud", status: "skipped", errorKey: null })
  } else {
    const matchesAudience = getAudienceMatches(payload.aud, expectedAudience)
    claimChecks.push({
      claim: "aud",
      status: matchesAudience ? "passed" : "failed",
      errorKey: matchesAudience ? null : "jwt.errors.audienceMismatch",
    })
  }

  return claimChecks
}

function toJwtHeaderParameters(header: Record<string, unknown>, algorithm: JwtAlgorithm): JwtToolResult<JWTHeaderParameters> {
  if ("b64" in header && header.b64 !== true) {
    return err("jwt.errors.invalidHeaderInput")
  }

  return ok({
    ...header,
    alg: algorithm,
    ...(header.b64 === true ? { b64: true } : {}),
  })
}

export function decodeJwtToken(token: string): JwtDecodeResult {
  const compact = parseCompactToken(token)
  if (!compact.ok) {
    return compact
  }

  const headerResult = decodeJsonSegment(
    compact.value.headerSegment,
    "jwt.errors.invalidHeaderEncoding",
    "jwt.errors.invalidHeaderJson",
  )
  if (!headerResult.ok) {
    return headerResult
  }

  const payloadResult = decodeJsonSegment(
    compact.value.payloadSegment,
    "jwt.errors.invalidPayloadEncoding",
    "jwt.errors.invalidPayloadJson",
  )
  if (!payloadResult.ok) {
    return payloadResult
  }

  const signatureBytes = compact.value.signatureSegment ? decodeBase64UrlSegment(compact.value.signatureSegment) : new Uint8Array(0)
  if (!signatureBytes) {
    return err("jwt.errors.invalidSignatureEncoding")
  }

  return ok({
    header: headerResult.value,
    payload: payloadResult.value,
    headerText: JSON.stringify(headerResult.value, null, 2),
    payloadText: JSON.stringify(payloadResult.value, null, 2),
    algorithm: typeof headerResult.value.alg === "string" ? headerResult.value.alg : null,
    signature: {
      encoded: compact.value.signatureSegment,
      present: compact.value.signatureSegment.length > 0,
      byteLength: signatureBytes.length,
    },
  })
}

export async function verifyJwtToken({
  token,
  key,
  expectedIssuer = "",
  expectedAudience = "",
  clockToleranceSeconds = 0,
}: VerifyJwtTokenOptions): Promise<JwtVerifyResult> {
  if (!Number.isFinite(clockToleranceSeconds) || clockToleranceSeconds < 0) {
    return err("jwt.errors.invalidClockTolerance")
  }

  const decoded = decodeJwtToken(token)
  if (!decoded.ok) {
    return decoded
  }

  if (!decoded.value.algorithm || !isJwtAlgorithm(decoded.value.algorithm)) {
    return err("jwt.errors.unsupportedAlgorithm")
  }

  const verificationKey = await importVerificationKey(decoded.value.algorithm, key)
  if (!verificationKey.ok) {
    return err(verificationKey.errorKey)
  }

  let signatureValid = true

  try {
    await compactVerify(token.trim(), verificationKey.value, {
      algorithms: [decoded.value.algorithm],
    })
  } catch {
    signatureValid = false
  }

  const claimChecks = buildClaimChecks(
    decoded.value.payload,
    expectedIssuer.trim(),
    expectedAudience.trim(),
    clockToleranceSeconds,
  )

  return ok({
    ...decoded.value,
    signatureValid,
    signatureErrorKey: signatureValid ? null : "jwt.errors.signatureVerificationFailed",
    claimChecks,
    claimsValid: claimChecks.every((check) => check.status !== "failed"),
  })
}

export async function signJwtToken({
  algorithm,
  secretOrPrivateKey,
  headerInput,
  payloadInput,
}: SignJwtTokenOptions): Promise<JwtSignResult> {
  const headerResult = parseJsonObjectInput(headerInput, "jwt.errors.invalidHeaderInput")
  if (!headerResult.ok) {
    return headerResult
  }

  if (!payloadInput.trim()) {
    return err("jwt.errors.invalidPayloadInput")
  }

  const payloadResult = parseJsonObjectInput(payloadInput, "jwt.errors.invalidPayloadInput")
  if (!payloadResult.ok) {
    return payloadResult
  }

  if ("alg" in headerResult.value) {
    if (typeof headerResult.value.alg !== "string") {
      return err("jwt.errors.invalidHeaderInput")
    }

    if (headerResult.value.alg !== algorithm) {
      return err("jwt.errors.headerAlgorithmConflict")
    }
  }

  const protectedHeaderResult = toJwtHeaderParameters(headerResult.value, algorithm)
  if (!protectedHeaderResult.ok) {
    return protectedHeaderResult
  }

  const signingKey = await importSigningKey(algorithm, secretOrPrivateKey)
  if (!signingKey.ok) {
    return err(signingKey.errorKey)
  }

  try {
    const token = await new SignJWT(payloadResult.value as JWTPayload)
      .setProtectedHeader(protectedHeaderResult.value)
      .sign(signingKey.value)

    return ok({
      token,
      header: protectedHeaderResult.value,
      payload: payloadResult.value,
    })
  } catch {
    return err("jwt.errors.signFailed")
  }
}
