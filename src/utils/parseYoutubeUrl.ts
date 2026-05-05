export function parseYoutubeUrl(input: string): string | null {
  try {
    const url = new URL(input.trim())
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1) || null
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname === '/watch') return url.searchParams.get('v')
      if (url.pathname.startsWith('/shorts/')) return url.pathname.split('/')[2] ?? null
      if (url.pathname.startsWith('/embed/')) return url.pathname.split('/')[2] ?? null
    }
  } catch {
    return null
  }
  return null
}
