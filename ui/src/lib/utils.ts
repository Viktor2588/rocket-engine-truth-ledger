import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}

export function getTruthColor(score: number): string {
  if (score < 0.3) return 'text-truth-low'
  if (score < 0.7) return 'text-truth-medium'
  return 'text-truth-high'
}

export function getTruthBgColor(score: number): string {
  if (score < 0.3) return 'bg-truth-low'
  if (score < 0.7) return 'bg-truth-medium'
  return 'bg-truth-high'
}

export function getTruthLabel(score: number): string {
  if (score < 0.3) return 'Low'
  if (score < 0.7) return 'Medium'
  return 'High'
}
