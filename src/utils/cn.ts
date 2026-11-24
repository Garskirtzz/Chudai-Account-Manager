import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

const AVATAR_TONES = [
  { bg: 'hsl(0 0% 24%)', fg: 'hsl(0 0% 92%)' },
  { bg: 'hsl(0 0% 20%)', fg: 'hsl(0 0% 88%)' },
  { bg: 'hsl(0 0% 28%)', fg: 'hsl(0 0% 95%)' },
  { bg: 'hsl(0 0% 17%)', fg: 'hsl(0 0% 84%)' },
  { bg: 'hsl(0 0% 32%)', fg: 'hsl(0 0% 96%)' },
  { bg: 'hsl(0 0% 22%)', fg: 'hsl(0 0% 90%)' },
]

export function avatarTone(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length]
}

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function groupOptions(accounts: { group: string }[]) {
  return Array.from(new Set(accounts.map((a) => a.group))).sort()
}
