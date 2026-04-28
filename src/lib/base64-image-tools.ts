import type { MessageKey } from "@/lib/i18n"

type Base64Result =
  | { ok: true; value: string }
  | { ok: false; errorKey: MessageKey }

export type ImageMeta = {
  fileName: string
  fileSize: number
  mimeType: string
  width: number
  height: number
  base64Length: number
  dataUri: string
  rawBase64: string
}

export function fileToBase64(file: File): Promise<Base64Result & { meta?: ImageMeta }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUri = reader.result as string
      const rawBase64 = dataUri.split(",")[1] ?? ""
      const img = new Image()
      img.onload = () => {
        resolve({
          ok: true,
          value: dataUri,
          meta: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type || "image/unknown",
            width: img.naturalWidth,
            height: img.naturalHeight,
            base64Length: rawBase64.length,
            dataUri,
            rawBase64,
          },
        })
      }
      img.onerror = () => {
        resolve({ ok: false, errorKey: "base64Image.errors.invalidBase64" })
      }
      img.src = dataUri
    }
    reader.onerror = () => {
      resolve({ ok: false, errorKey: "base64Image.errors.fileReadFailed" })
    }
    reader.readAsDataURL(file)
  })
}

export function parseBase64Input(input: string): Base64Result {
  const trimmed = input.trim()
  if (!trimmed) {
    return { ok: false, errorKey: "base64Image.errors.emptyInput" }
  }

  if (trimmed.startsWith("data:")) {
    return { ok: true, value: trimmed }
  }

  return { ok: true, value: `data:image/png;base64,${trimmed}` }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
