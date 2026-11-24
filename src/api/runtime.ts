declare global {
  interface Window {
    __TAURI__?: { core?: { invoke?: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } }
    __camTray?: (jenis: string, id: string) => void
  }
}

export function adaRuntime(): boolean {
  return typeof window !== 'undefined' && typeof window.__TAURI__?.core?.invoke === 'function'
}

const MOCK_BOLEH = import.meta.env.DEV || import.meta.env.VITE_MOCK === '1'

export function pakaiMock(): boolean {
  return !adaRuntime() && MOCK_BOLEH
}

export class RuntimeTidakAda extends Error {
  constructor(cmd: string) {
    super(`Desktop runtime unavailable (command "${cmd}" needs the Tauri app).`)
    this.name = 'RuntimeTidakAda'
  }
}

type Penjawab = (cmd: string, args: Record<string, unknown>) => Promise<unknown>
let mock: Promise<Penjawab> | null = null

export function invoke<T>(cmd: string, args: Record<string, unknown> = {}): Promise<T> {
  if (adaRuntime()) return window.__TAURI__!.core!.invoke!(cmd, args) as Promise<T>
  if (MOCK_BOLEH) {
    mock ??= import('./mock').then((m) => m.jawab)
    return mock.then((jawab) => jawab(cmd, args)) as Promise<T>
  }
  return Promise.reject(new RuntimeTidakAda(cmd))
}
