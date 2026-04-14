export function parseImageUrls(input: string): string[] {
  return input
    .split(/[\r\n,，]+/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

