import { CheckCircle2, Copy, ShieldAlert, ShieldCheck, WandSparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { JsonOutput } from "@/components/json-output"
import { InlineFieldError } from "@/components/inline-field-error"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n, type MessageKey } from "@/lib/i18n"
import {
  decodeJwtToken,
  signJwtToken,
  verifyJwtToken,
  type JwtAlgorithm,
  type JwtClaimCheck,
  type JwtDecodeValue,
  type JwtSignValue,
  type JwtVerifyValue,
} from "@/lib/jwt-tools"
import { cn } from "@/lib/utils"

type JwtMode = "decode" | "verify" | "encode"
type VerifyErrorField = "token" | "key" | "tolerance" | null
type EncodeErrorField = "key" | "header" | "payload" | null

const JWT_TOKEN_STORAGE_KEY = "web-tools:jwt-token"
const JWT_ALGORITHMS: JwtAlgorithm[] = ["HS256", "HS384", "HS512", "RS256", "ES256"]

function getStoredJwtToken() {
  if (typeof window === "undefined") {
    return ""
  }

  return window.localStorage.getItem(JWT_TOKEN_STORAGE_KEY) ?? ""
}

function getDefaultPayload() {
  return JSON.stringify(
    {
      sub: "1234567890",
      name: "John Doe",
      iat: Math.floor(Date.now() / 1000),
    },
    null,
    2,
  )
}

function getKeyPlaceholder(mode: "verify" | "encode", algorithm: JwtAlgorithm, t: (key: MessageKey) => string) {
  if (algorithm.startsWith("HS")) {
    return t(mode === "verify" ? "jwt.placeholders.secret" : "jwt.placeholders.signingSecret")
  }

  return t(mode === "verify" ? "jwt.placeholders.publicKeyPem" : "jwt.placeholders.privateKeyPem")
}

function getClaimLabelKey(claim: JwtClaimCheck["claim"]): MessageKey {
  switch (claim) {
    case "exp":
      return "jwt.claims.exp"
    case "nbf":
      return "jwt.claims.nbf"
    case "iss":
      return "jwt.claims.iss"
    case "aud":
      return "jwt.claims.aud"
  }
}

function getClaimStatusKey(status: JwtClaimCheck["status"]): MessageKey {
  switch (status) {
    case "passed":
      return "jwt.status.passed"
    case "failed":
      return "jwt.status.failed"
    case "skipped":
      return "jwt.status.skipped"
  }
}

function getVerifyErrorField(errorKey: MessageKey | null): VerifyErrorField {
  switch (errorKey) {
    case "jwt.errors.emptyToken":
    case "jwt.errors.invalidCompactToken":
    case "jwt.errors.invalidHeaderEncoding":
    case "jwt.errors.invalidPayloadEncoding":
    case "jwt.errors.invalidSignatureEncoding":
    case "jwt.errors.invalidHeaderJson":
    case "jwt.errors.invalidPayloadJson":
    case "jwt.errors.unsupportedAlgorithm":
      return "token"
    case "jwt.errors.missingVerificationKey":
    case "jwt.errors.invalidKeyFormat":
      return "key"
    case "jwt.errors.invalidClockTolerance":
      return "tolerance"
    default:
      return null
  }
}

function getEncodeErrorField(errorKey: MessageKey | null): EncodeErrorField {
  switch (errorKey) {
    case "jwt.errors.missingSigningKey":
    case "jwt.errors.invalidKeyFormat":
    case "jwt.errors.signFailed":
      return "key"
    case "jwt.errors.invalidHeaderInput":
    case "jwt.errors.headerAlgorithmConflict":
      return "header"
    case "jwt.errors.invalidPayloadInput":
      return "payload"
    default:
      return null
  }
}

function StatusBadge({ tone, children }: { tone: "success" | "warning" | "muted"; children: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
        tone === "success" && "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
        tone === "warning" && "bg-destructive/12 text-destructive",
        tone === "muted" && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  )
}

function DecodedPanels({ decoded, t }: { decoded: JwtDecodeValue; t: (key: MessageKey) => string }) {
  return (
    <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-2">
      <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Label id="jwt-header-label" htmlFor="jwt-header-json">
            {t("jwt.sections.header")}
          </Label>
          <span className="text-xs text-muted-foreground">{t("jwt.labels.readOnly")}</span>
        </div>
        <JsonOutput
          key={decoded.headerText}
          id="jwt-header-json"
          value={decoded.headerText}
          aria-labelledby="jwt-header-label"
          placeholder={t("jwt.placeholders.decodedJson")}
          className="min-h-[12rem] flex-1 xl:min-h-0"
        />
      </section>

      <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <Label id="jwt-payload-label" htmlFor="jwt-payload-json">
            {t("jwt.sections.payload")}
          </Label>
          <span className="text-xs text-muted-foreground">{t("jwt.labels.readOnly")}</span>
        </div>
        <JsonOutput
          key={decoded.payloadText}
          id="jwt-payload-json"
          value={decoded.payloadText}
          aria-labelledby="jwt-payload-label"
          placeholder={t("jwt.placeholders.decodedJson")}
          className="min-h-[12rem] flex-1 xl:min-h-0"
        />
      </section>
    </div>
  )
}

export function JwtToolSurface() {
  const { t } = useI18n()
  const [mode, setMode] = useState<JwtMode>("decode")

  const [token, setToken] = useState(getStoredJwtToken)
  const [decodeResult, setDecodeResult] = useState<JwtDecodeValue | null>(null)
  const [decodeErrorKey, setDecodeErrorKey] = useState<MessageKey | null>(null)

  const [verifyKey, setVerifyKey] = useState("")
  const [verifyExpectedIssuer, setVerifyExpectedIssuer] = useState("")
  const [verifyExpectedAudience, setVerifyExpectedAudience] = useState("")
  const [verifyClockTolerance, setVerifyClockTolerance] = useState("0")
  const [verifyResult, setVerifyResult] = useState<JwtVerifyValue | null>(null)
  const [verifyErrorKey, setVerifyErrorKey] = useState<MessageKey | null>(null)

  const [encodeAlgorithm, setEncodeAlgorithm] = useState<JwtAlgorithm>("HS256")
  const [encodeKey, setEncodeKey] = useState("")
  const [encodeHeaderInput, setEncodeHeaderInput] = useState("")
  const [encodePayloadInput, setEncodePayloadInput] = useState(getDefaultPayload)
  const [encodeResult, setEncodeResult] = useState<JwtSignValue | null>(null)
  const [encodeErrorKey, setEncodeErrorKey] = useState<MessageKey | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    if (token) {
      window.localStorage.setItem(JWT_TOKEN_STORAGE_KEY, token)
    } else {
      window.localStorage.removeItem(JWT_TOKEN_STORAGE_KEY)
    }
  }, [token])

  const detectedAlgorithm = (() => {
    const decoded = decodeJwtToken(token)
    if (!decoded.ok || !decoded.value.algorithm) {
      return null
    }

    return JWT_ALGORITHMS.includes(decoded.value.algorithm as JwtAlgorithm) ? (decoded.value.algorithm as JwtAlgorithm) : null
  })()

  const verifyErrorField = getVerifyErrorField(verifyErrorKey)
  const encodeErrorField = getEncodeErrorField(encodeErrorKey)
  const verifyKeyPlaceholder = getKeyPlaceholder("verify", detectedAlgorithm ?? "HS256", t)

  const encodeDecodedPanelValue: JwtDecodeValue | null = encodeResult
    ? {
        header: encodeResult.header,
        payload: encodeResult.payload,
        headerText: JSON.stringify(encodeResult.header, null, 2),
        payloadText: JSON.stringify(encodeResult.payload, null, 2),
        algorithm: typeof encodeResult.header.alg === "string" ? encodeResult.header.alg : null,
        signature: {
          encoded: "",
          present: true,
          byteLength: 0,
        },
      }
    : null

  const encodeTokenValue = encodeResult?.token ?? ""

  async function copyText(value: string, successKey: MessageKey) {
    if (!value.trim()) {
      toast.error(t("errors.nothingToCopy"))
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      toast.success(t(successKey))
    } catch {
      toast.error(t("errors.copyFailed"))
    }
  }

  function handleDecode() {
    const result = decodeJwtToken(token)
    if (!result.ok) {
      setDecodeResult(null)
      setDecodeErrorKey(result.errorKey)
      return
    }

    setDecodeResult(result.value)
    setDecodeErrorKey(null)
  }

  async function handleVerify() {
    const tolerance = Number(verifyClockTolerance.trim() || "0")
    const result = await verifyJwtToken({
      token,
      key: verifyKey,
      expectedIssuer: verifyExpectedIssuer,
      expectedAudience: verifyExpectedAudience,
      clockToleranceSeconds: tolerance,
    })

    if (!result.ok) {
      setVerifyResult(null)
      setVerifyErrorKey(result.errorKey)
      return
    }

    setVerifyResult(result.value)
    setVerifyErrorKey(null)
  }

  async function handleEncode() {
    const result = await signJwtToken({
      algorithm: encodeAlgorithm,
      secretOrPrivateKey: encodeKey,
      headerInput: encodeHeaderInput,
      payloadInput: encodePayloadInput,
    })

    if (!result.ok) {
      setEncodeResult(null)
      setEncodeErrorKey(result.errorKey)
      return
    }

    setEncodeResult(result.value)
    setEncodeErrorKey(null)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 bg-card/90 shadow-xl shadow-primary/5 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4 pt-5">
          <div data-slot="button-group" className="inline-flex w-full rounded-xl border border-border/70 bg-muted/35 p-1">
            {([
              ["decode", "jwt.mode.decode"],
              ["verify", "jwt.mode.verify"],
              ["encode", "jwt.mode.encode"],
            ] as const).map(([value, labelKey]) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={mode === value ? "default" : "ghost"}
                className="min-w-0 flex-1 rounded-lg"
                onClick={() => setMode(value)}
              >
                {t(labelKey)}
              </Button>
            ))}
          </div>

          {mode === "decode" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <section
                className={cn(
                  "rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm",
                  decodeErrorKey && "border-destructive/60",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="jwt-decode-token">{t("jwt.sections.tokenInput")}</Label>
                  <Button type="button" className="gap-2" onClick={handleDecode}>
                    <WandSparkles className="size-4" />
                    {t("jwt.actions.decode")}
                  </Button>
                </div>
                <Textarea
                  id="jwt-decode-token"
                  value={token}
                  onChange={(event) => {
                    setToken(event.target.value)
                    setDecodeErrorKey(null)
                    setVerifyErrorKey(null)
                  }}
                  placeholder={t("jwt.placeholders.token")}
                  className="mt-3 min-h-[7rem] resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
                  spellCheck={false}
                />
                {decodeErrorKey ? <InlineFieldError message={t(decodeErrorKey)} /> : null}
              </section>

              {decodeResult ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">{t("jwt.labels.algorithm")}</p>
                      <p className="mt-2 font-mono text-sm">{decodeResult.algorithm ?? t("jwt.labels.none")}</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">{t("jwt.labels.signature")}</p>
                      <div className="mt-2">
                        <StatusBadge tone={decodeResult.signature.present ? "success" : "warning"}>
                          {t(decodeResult.signature.present ? "jwt.status.present" : "jwt.status.missing")}
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                      <p className="text-xs text-muted-foreground">{t("jwt.labels.signatureBytes")}</p>
                      <p className="mt-2 font-mono text-sm">{decodeResult.signature.byteLength}</p>
                    </div>
                  </div>

                  <DecodedPanels decoded={decodeResult} t={t} />
                </>
              ) : null}
            </div>
          ) : null}

          {mode === "verify" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <section
                  className={cn(
                    "rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm",
                    verifyErrorField === "token" && "border-destructive/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="jwt-verify-token">{t("jwt.sections.tokenInput")}</Label>
                    <Button type="button" className="gap-2" onClick={handleVerify}>
                      <ShieldCheck className="size-4" />
                      {t("jwt.actions.verify")}
                    </Button>
                  </div>
                  <Textarea
                    id="jwt-verify-token"
                    value={token}
                    onChange={(event) => {
                      setToken(event.target.value)
                      setDecodeErrorKey(null)
                      setVerifyErrorKey(null)
                    }}
                    placeholder={t("jwt.placeholders.token")}
                    className="mt-3 min-h-[7rem] resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
                    spellCheck={false}
                  />
                  {verifyErrorField === "token" && verifyErrorKey ? <InlineFieldError message={t(verifyErrorKey)} /> : null}
                </section>

                <section className="space-y-3 rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <div className="space-y-2">
                    <Label htmlFor="jwt-verify-key">{t("jwt.labels.verificationKey")}</Label>
                    <Textarea
                      id="jwt-verify-key"
                      value={verifyKey}
                      onChange={(event) => {
                        setVerifyKey(event.target.value)
                        setVerifyErrorKey(null)
                      }}
                      placeholder={verifyKeyPlaceholder}
                      className={cn("min-h-[8rem] resize-none font-mono text-sm", verifyErrorField === "key" && "border-destructive")}
                      spellCheck={false}
                    />
                    {verifyErrorField === "key" && verifyErrorKey ? <InlineFieldError message={t(verifyErrorKey)} /> : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="jwt-verify-issuer">{t("jwt.labels.expectedIssuer")}</Label>
                      <input
                        id="jwt-verify-issuer"
                        value={verifyExpectedIssuer}
                        onChange={(event) => {
                          setVerifyExpectedIssuer(event.target.value)
                          setVerifyErrorKey(null)
                        }}
                        placeholder={t("jwt.placeholders.expectedIssuer")}
                        className="timestamp-input"
                        spellCheck={false}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jwt-verify-audience">{t("jwt.labels.expectedAudience")}</Label>
                      <input
                        id="jwt-verify-audience"
                        value={verifyExpectedAudience}
                        onChange={(event) => {
                          setVerifyExpectedAudience(event.target.value)
                          setVerifyErrorKey(null)
                        }}
                        placeholder={t("jwt.placeholders.expectedAudience")}
                        className="timestamp-input"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-verify-tolerance">{t("jwt.labels.clockTolerance")}</Label>
                    <input
                      id="jwt-verify-tolerance"
                      value={verifyClockTolerance}
                      onChange={(event) => {
                        setVerifyClockTolerance(event.target.value)
                        setVerifyErrorKey(null)
                      }}
                      placeholder={t("jwt.placeholders.clockTolerance")}
                      className={cn("timestamp-input", verifyErrorField === "tolerance" && "border-destructive")}
                      inputMode="decimal"
                      spellCheck={false}
                    />
                    {verifyErrorField === "tolerance" && verifyErrorKey ? <InlineFieldError message={t(verifyErrorKey)} /> : null}
                  </div>
                </section>
              </div>

              {verifyResult ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-border/60 bg-background/65 p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        {verifyResult.signatureValid ? (
                          <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ShieldAlert className="size-4 text-destructive" />
                        )}
                        <p className="text-sm font-semibold">{t("jwt.labels.signatureVerification")}</p>
                      </div>
                      <div className="mt-3">
                        <StatusBadge tone={verifyResult.signatureValid ? "success" : "warning"}>
                          {t(verifyResult.signatureValid ? "jwt.status.valid" : "jwt.status.invalid")}
                        </StatusBadge>
                      </div>
                      {verifyResult.signatureErrorKey ? (
                        <p className="mt-3 text-sm text-destructive">{t(verifyResult.signatureErrorKey)}</p>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-border/60 bg-background/65 p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        {verifyResult.claimsValid ? (
                          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <ShieldAlert className="size-4 text-destructive" />
                        )}
                        <p className="text-sm font-semibold">{t("jwt.labels.claimValidation")}</p>
                      </div>
                      <div className="mt-3">
                        <StatusBadge tone={verifyResult.claimsValid ? "success" : "warning"}>
                          {t(verifyResult.claimsValid ? "jwt.status.valid" : "jwt.status.invalid")}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>

                  <section className="rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <Label>{t("jwt.sections.claimChecks")}</Label>
                      <span className="text-xs text-muted-foreground">{verifyResult.algorithm ?? t("jwt.labels.none")}</span>
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                      {verifyResult.claimChecks.map((check) => (
                        <div key={check.claim} className="rounded-lg border border-border/60 bg-background/80 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium">{t(getClaimLabelKey(check.claim))}</p>
                            <StatusBadge
                              tone={
                                check.status === "passed" ? "success" : check.status === "failed" ? "warning" : "muted"
                              }
                            >
                              {t(getClaimStatusKey(check.status))}
                            </StatusBadge>
                          </div>
                          {check.errorKey ? <p className="mt-2 text-xs text-destructive">{t(check.errorKey)}</p> : null}
                        </div>
                      ))}
                    </div>
                  </section>

                  <DecodedPanels decoded={verifyResult} t={t} />
                </>
              ) : null}
            </div>
          ) : null}

          {mode === "encode" ? (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
                <section className="space-y-4 rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-[12rem_minmax(0,1fr)] md:items-end">
                    <div className="space-y-2">
                      <Label htmlFor="jwt-encode-algorithm">{t("jwt.labels.algorithm")}</Label>
                      <select
                        id="jwt-encode-algorithm"
                        value={encodeAlgorithm}
                        onChange={(event) => {
                          setEncodeAlgorithm(event.target.value as JwtAlgorithm)
                          setEncodeErrorKey(null)
                        }}
                        className="timestamp-select"
                      >
                        {JWT_ALGORITHMS.map((algorithm) => (
                          <option key={algorithm} value={algorithm}>
                            {algorithm}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jwt-encode-key">{t("jwt.labels.signingKey")}</Label>
                      <Textarea
                        id="jwt-encode-key"
                        value={encodeKey}
                        onChange={(event) => {
                          setEncodeKey(event.target.value)
                          setEncodeErrorKey(null)
                        }}
                        placeholder={getKeyPlaceholder("encode", encodeAlgorithm, t)}
                        className={cn("min-h-[7rem] resize-none font-mono text-sm", encodeErrorField === "key" && "border-destructive")}
                        spellCheck={false}
                      />
                      {encodeErrorField === "key" && encodeErrorKey ? <InlineFieldError message={t(encodeErrorKey)} /> : null}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-encode-header">{t("jwt.sections.headerOptional")}</Label>
                    <Textarea
                      id="jwt-encode-header"
                      value={encodeHeaderInput}
                      onChange={(event) => {
                        setEncodeHeaderInput(event.target.value)
                        setEncodeErrorKey(null)
                      }}
                      placeholder={t("jwt.placeholders.headerJson")}
                      className={cn("min-h-[6rem] resize-none font-mono text-sm", encodeErrorField === "header" && "border-destructive")}
                      spellCheck={false}
                    />
                    {encodeErrorField === "header" && encodeErrorKey ? <InlineFieldError message={t(encodeErrorKey)} /> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jwt-encode-payload">{t("jwt.sections.payload")}</Label>
                    <Textarea
                      id="jwt-encode-payload"
                      value={encodePayloadInput}
                      onChange={(event) => {
                        setEncodePayloadInput(event.target.value)
                        setEncodeErrorKey(null)
                      }}
                      placeholder={t("jwt.placeholders.payloadJson")}
                      className={cn("min-h-[10rem] resize-none font-mono text-sm", encodeErrorField === "payload" && "border-destructive")}
                      spellCheck={false}
                    />
                    {encodeErrorField === "payload" && encodeErrorKey ? <InlineFieldError message={t(encodeErrorKey)} /> : null}
                  </div>

                  <Button type="button" className="gap-2" onClick={handleEncode}>
                    <WandSparkles className="size-4" />
                    {t("jwt.actions.generate")}
                  </Button>
                </section>

                <section className="flex min-h-0 flex-col rounded-xl border border-border/60 bg-background/65 p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="jwt-encode-result">{t("jwt.sections.generatedToken")}</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      aria-label={t("jwt.actions.copyToken")}
                      title={t("jwt.actions.copyToken")}
                      onClick={() => copyText(encodeTokenValue, "jwt.toast.copyToken")}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                  <Textarea
                    id="jwt-encode-result"
                    value={encodeTokenValue}
                    readOnly
                    placeholder={t("jwt.placeholders.generatedToken")}
                    className="mt-3 min-h-[10rem] flex-1 resize-none overflow-auto border-0 bg-transparent px-0 py-0 font-mono text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0 xl:min-h-0"
                    spellCheck={false}
                  />
                </section>
              </div>

              {encodeDecodedPanelValue ? <DecodedPanels decoded={encodeDecodedPanelValue} t={t} /> : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
