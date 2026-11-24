import { useCam } from '@/stores/cam'
import { DialogAlias, DialogFps } from './kecil'
import { DialogTambah } from './DialogTambah'
import { DialogImpor } from './DialogImpor'
import { DialogFolder, DialogIkuti } from './DialogFolder'
import { DialogAlat } from './DialogAlat'
import { DialogHapus } from './DialogHapus'

export function DialogHost() {
  const d = useCam((s) => s.dialog)
  if (!d) return null
  switch (d.jenis) {
    case 'tambah':
      return <DialogTambah />
    case 'impor':
      return <DialogImpor />
    case 'folder':
      return <DialogFolder key={d.folder?.id ?? 'baru'} folder={d.folder} pindahkan={d.pindahkan} />
    case 'alias':
      return <DialogAlias key={d.akun.id} a={d.akun} />
    case 'fps':
      return <DialogFps key={d.akun.id} a={d.akun} />
    case 'ikuti':
      return <DialogIkuti key={d.akun.id} akun={d.akun} />
    case 'alat':
      return <DialogAlat />
    case 'hapus':
      return <DialogHapus key={d.ids.join(',')} ids={d.ids} />
    default:
      return null
  }
}
