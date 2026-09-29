import { normalizePhone } from '../services/userService';

/**
 * Mask Thai phone numbers for PDPA and victim privacy protection.
 * Examples:
 *   "0812345678" -> "081-xxx-5678"
 *   "089-123-4567" -> "089-xxx-4567"
 */
export function maskPhone(rawPhone: string): string {
  const norm = normalizePhone(rawPhone);
  if (norm.length === 10) {
    return `${norm.slice(0, 3)}-xxx-${norm.slice(6)}`;
  }
  if (norm.length === 9) {
    return `${norm.slice(0, 2)}-xxx-${norm.slice(5)}`;
  }
  if (rawPhone.length > 6) {
    return `${rawPhone.slice(0, 3)}****${rawPhone.slice(-3)}`;
  }
  return rawPhone;
}

/**
 * Format phone properly when authorized to view
 */
export function formatFullPhone(rawPhone: string): string {
  const norm = normalizePhone(rawPhone);
  if (norm.length === 10) {
    return `${norm.slice(0, 3)}-${norm.slice(3, 6)}-${norm.slice(6)}`;
  }
  return rawPhone;
}
