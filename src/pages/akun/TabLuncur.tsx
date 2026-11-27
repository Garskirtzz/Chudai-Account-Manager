import type { ReactNode } from 'react'
import { Gamepad2, Lock, Server } from '@/components/ikon'
import type { ServerTersimpan } from '@/api/types'

export function jenisServer(s: Pick<ServerTersimpan, 'link_code' | 'job_id'>) {
  if (s.link_code) return { ikon: Lock, teks: 'Private server' }
  if (s.job_id) return { ikon: Server, teks: `Server ${s.job_id.slice(0, 8)}` }
  return { ikon: Gamepad2, teks: 'Any server' }
}

export function Bagian({ judul, kanan, children }: { judul: string; kanan?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-line-subtle px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold text-content-secondary">{judul}</h3>
        {kanan}
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  )
}
