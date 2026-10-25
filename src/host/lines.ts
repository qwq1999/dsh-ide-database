/**
 * Newline-delimited text splitter for a streaming source.
 *
 * `buffer += chunk` re-copies the whole unconsumed line on every `data` event,
 * so a multi-megabyte JSON result arriving in 64 KiB chunks costs O(n²) copying
 * before it is even parsed. Keeping the tail in a small array and joining once
 * per batch makes the total work linear in the payload size.
 */
export class LineSplitter {
  private pending: string[] = []

  /** Feed one chunk; return the complete lines it finished (newlines removed). */
  push(chunk: string): string[] {
    if (!chunk.includes('\n')) {
      if (chunk !== '') this.pending.push(chunk)
      return []
    }
    const text = this.pending.length === 0 ? chunk : this.pending.join('') + chunk
    this.pending = []
    const lines = text.split('\n')
    const tail = lines.pop() ?? ''
    if (tail !== '') this.pending.push(tail)
    return lines
  }

  /** Drop any partially received line (used when the child process restarts). */
  reset(): void {
    this.pending = []
  }
}
