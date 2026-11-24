export function fokusCariAkun() {
  if (!location.hash.startsWith('#/accounts')) location.hash = '#/accounts'
  let coba = 0
  const cari = () => {
    const el = document.querySelector<HTMLInputElement>('[data-cari-akun]')
    if (el) {
      el.focus()
      el.select()
    } else if (++coba < 20) requestAnimationFrame(cari)
  }
  requestAnimationFrame(cari)
}
