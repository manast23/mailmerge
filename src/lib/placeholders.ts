export function replacePlaceholders(text: string, data: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return data[key.trim()] !== undefined ? String(data[key.trim()]) : match
  })
}

export function extractPlaceholders(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '').trim()))]
}
