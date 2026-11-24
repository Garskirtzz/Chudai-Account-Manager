export function ambilPlaceIdDariUrl(teks: string): string | null {
  const t = (teks || '').trim()
  if (!/roblox\.com|ro\.blox\.com/i.test(t)) return null
  const m = t.match(/\/games\/(\d+)/i) || t.match(/[?&]placeId=(\d+)/i)
  return m ? m[1] : null
}

export function ambilShareCode(nilai: string): string {
  const v = (nilai || '').trim()
  if (!/[/]share([?/]|$)/i.test(v) && !/[?&]type=Server/i.test(v)) return ''
  const m = v.match(/[?&]code=([\w-]+)/i)
  return m ? m[1] : ''
}

export function ambilAccessCode(nilai: string): string {
  const v = (nilai || '').trim()
  const m = v.match(/(?:^|[?&])accessCode=([\w-]+)/i)
  return m ? m[1] : ''
}

export function ambilLinkCode(nilai: string): string {
  const v = (nilai || '').trim()
  const m = v.match(/privateServerLinkCode=([\w-]+)/i)
  return m ? m[1] : v
}
