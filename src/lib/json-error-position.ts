export interface JsonErrorPosition {
  line: number
  column: number
}

export function extractJsonErrorPosition(
  errorMessage: string,
  source: string,
): JsonErrorPosition | null {
  const lineColMatch = errorMessage.match(/\(line (\d+) column (\d+)\)/)
  if (lineColMatch) {
    return { line: Number(lineColMatch[1]), column: Number(lineColMatch[2]) }
  }

  const posMatch = errorMessage.match(/at position (\d+)/)
  if (posMatch) {
    const pos = Number(posMatch[1])
    let line = 1
    let col = 1
    for (let i = 0; i < pos && i < source.length; i++) {
      if (source[i] === "\n") {
        line++
        col = 1
      } else {
        col++
      }
    }
    return { line, column: col }
  }

  return null
}
