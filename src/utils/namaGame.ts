export const NAMA_IKUTI = 'Followed a player'
export function atributGame(nama: string | null | undefined): 'no' | undefined {
  return nama === NAMA_IKUTI ? undefined : 'no'
}
