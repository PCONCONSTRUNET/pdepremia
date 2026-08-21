import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Get Prize Image (dynamically resolve missing image_url) */
export function getPrizeImage(prize: any) {
  if (prize?.image_url) return prize.image_url;
  if (!prize?.name) return null;
  
  const name = prize.name.toLowerCase();
  if (name.includes('tente novamente')) return '/tente_novamente.png';
  
  if (prize.prize_type === 'box' && prize.reference_value) {
    const val = Number(prize.reference_value);
    if (val === 1) return '/1 real.png';
    if (val === 2) return '/2 real.png';
    if (val === 5) return '/5 reais.png';
    if (val === 10) return '/10 reais.png';
    if (val === 15) return '/15 reais.png';
    if (val === 20) return '/20 reais.png';
    if (val === 30) return '/30 reais.png';
    if (val === 50) return '/50 reais.png';
    if (val === 100) return '/100 reais.png';
    if (val === 200) return '/200 reais.png';
  }
  
  if (prize.prize_type === 'double_spins') {
    if (name.includes('2')) return '/2 rodadas gratis.png';
    if (name.includes('5')) return '/5 rodadas gratis.png';
    if (name.includes('10')) return '/10 rodadas gratis.png';
    if (name.includes('15')) return '/15 rodadas gratis.png';
  }
  
  return null;
}

/** Format currency to BRL */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

/** Mask input for currency (used in inputs) */
export function maskCurrency(value: string | number): string {
  const numericValue = String(value).replace(/\D/g, '')
  if (!numericValue) return ''
  const amount = Number(numericValue) / 100
  return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Format date to Brazilian format */
export function formatDate(date: string | Date, pattern = 'dd/MM/yyyy'): string {
  return format(new Date(date), pattern, { locale: ptBR })
}

/** Format datetime */
export function formatDateTime(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/** Format relative time */
export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

/** Format ticket number with leading zeros */
export function formatTicketNumber(num: number | string, padLength = 6): string {
  return String(num).padStart(padLength, '0')
}

/** Truncate string */
export function truncate(str: string, length: number): string {
  return str.length > length ? `${str.slice(0, length)}...` : str
}

/** Get initials from name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/** Mask name for privacy (ex: "Lucas M.") */
export function maskName(name: string): string {
  const parts = name.trim().split(' ')
  if (parts.length === 1) return parts[0]
  return `${parts[0]} ${parts[parts.length - 1][0]}.`
}

/** Sleep promise */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Copy to clipboard */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Generate a random color from a string (for wheel items) */
export function stringToColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 65%, 55%)`
}

/** Format large numbers */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('pt-BR').format(num)
}

/** Check if a date is in the future */
export function isFuture(date: string | Date): boolean {
  return new Date(date) > new Date()
}

/** Check if a date is in the past */
export function isPast(date: string | Date): boolean {
  return new Date(date) < new Date()
}

/** Slugify a string */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Apply phone mask (99) 99999-9999 */
export function maskPhone(value: string): string {
  if (!value) return ''
  const phone = value.replace(/\D/g, '')
  if (phone.length <= 2) return phone
  if (phone.length <= 7) return `(${phone.slice(0, 2)}) ${phone.slice(2)}`
  return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7, 11)}`
}

/** Apply CPF mask 999.999.999-99 */
export function maskCPF(value: string): string {
  if (!value) return ''
  const cpf = value.replace(/\D/g, '')
  if (cpf.length <= 3) return cpf
  if (cpf.length <= 6) return `${cpf.slice(0, 3)}.${cpf.slice(3)}`
  if (cpf.length <= 9) return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6)}`
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9, 11)}`
}

/** Apply CNPJ mask 99.999.999/9999-99 */
export function maskCNPJ(value: string): string {
  if (!value) return ''
  const cnpj = value.replace(/\D/g, '')
  if (cnpj.length <= 2) return cnpj
  if (cnpj.length <= 5) return `${cnpj.slice(0, 2)}.${cnpj.slice(2)}`
  if (cnpj.length <= 8) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5)}`
  if (cnpj.length <= 12) return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8)}`
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12, 14)}`
}

/** Validate CPF (Mathematical algorithm) */
export function validateCPF(cpf: string): boolean {
  cpf = cpf.replace(/[^\d]+/g, '')
  if (cpf.length !== 11 || !!cpf.match(/(\d)\1{10}/)) return false
  
  let sum = 0
  let rest
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i)
  }
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cpf.substring(9, 10))) return false
  
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i)
  }
  rest = (sum * 10) % 11
  if (rest === 10 || rest === 11) rest = 0
  if (rest !== parseInt(cpf.substring(10, 11))) return false
  
  return true
}

/** Calculate age from a birth date string (YYYY-MM-DD) */
export function calculateAge(birthDate: string): number {
  const today = new Date()
  const birthDateObj = new Date(birthDate)
  let age = today.getFullYear() - birthDateObj.getFullYear()
  const m = today.getMonth() - birthDateObj.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
    age--
  }
  return age
}

