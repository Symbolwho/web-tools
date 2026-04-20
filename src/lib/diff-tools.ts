export type DiffLineType = "equal" | "added" | "removed"

export interface DiffLine {
  type: DiffLineType
  text: string
  leftLineNo: number | null
  rightLineNo: number | null
}

// Myers diff algorithm on line arrays
function myersDiff(a: string[], b: string[]): Array<{ type: "equal" | "added" | "removed"; aIdx: number; bIdx: number }> {
  const n = a.length
  const m = b.length
  const max = n + m
  const v: number[] = new Array(2 * max + 1).fill(0)
  const trace: number[][] = []

  for (let d = 0; d <= max; d++) {
    trace.push([...v])
    for (let k = -d; k <= d; k += 2) {
      const ki = k + max
      let x: number
      if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
        x = v[ki + 1]
      } else {
        x = v[ki - 1] + 1
      }
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[ki] = x
      if (x >= n && y >= m) {
        return backtrack(trace, a, b, max)
      }
    }
  }
  return backtrack(trace, a, b, max)
}

function backtrack(
  trace: number[][],
  a: string[],
  b: string[],
  max: number,
): Array<{ type: "equal" | "added" | "removed"; aIdx: number; bIdx: number }> {
  const result: Array<{ type: "equal" | "added" | "removed"; aIdx: number; bIdx: number }> = []
  let x = a.length
  let y = b.length

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d]
    const k = x - y
    const ki = k + max
    let prevK: number
    if (k === -d || (k !== d && v[ki - 1] < v[ki + 1])) {
      prevK = k + 1
    } else {
      prevK = k - 1
    }
    const prevX = v[prevK + max]
    const prevY = prevX - prevK

    while (x > prevX && y > prevY) {
      result.push({ type: "equal", aIdx: x - 1, bIdx: y - 1 })
      x--
      y--
    }

    if (d > 0) {
      if (x === prevX) {
        result.push({ type: "added", aIdx: -1, bIdx: y - 1 })
        y--
      } else {
        result.push({ type: "removed", aIdx: x - 1, bIdx: -1 })
        x--
      }
    }
  }

  return result.reverse()
}

export function computeDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split("\n")
  const rightLines = right.split("\n")
  const ops = myersDiff(leftLines, rightLines)

  const result: DiffLine[] = []
  let leftNo = 1
  let rightNo = 1

  for (const op of ops) {
    if (op.type === "equal") {
      result.push({ type: "equal", text: leftLines[op.aIdx], leftLineNo: leftNo++, rightLineNo: rightNo++ })
    } else if (op.type === "removed") {
      result.push({ type: "removed", text: leftLines[op.aIdx], leftLineNo: leftNo++, rightLineNo: null })
    } else {
      result.push({ type: "added", text: rightLines[op.bIdx], leftLineNo: null, rightLineNo: rightNo++ })
    }
  }

  return result
}

export interface DiffStats {
  added: number
  removed: number
  equal: number
}

export function getDiffStats(lines: DiffLine[]): DiffStats {
  return lines.reduce(
    (acc, l) => {
      acc[l.type]++
      return acc
    },
    { added: 0, removed: 0, equal: 0 },
  )
}
