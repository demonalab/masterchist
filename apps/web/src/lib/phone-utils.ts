// Phone number utilities for Russian phone numbers

// Format phone for display: +7 (999) 123-45-67
export function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 0) return '';
  
  // Handle 8 or 7 at start
  let normalized = digits;
  if (digits.startsWith('8') && digits.length === 11) {
    normalized = '7' + digits.slice(1);
  } else if (!digits.startsWith('7') && digits.length === 10) {
    normalized = '7' + digits;
  }
  
  const parts = [];
  if (normalized.length > 0) parts.push('+' + normalized.slice(0, 1));
  if (normalized.length > 1) parts.push(' (' + normalized.slice(1, 4));
  if (normalized.length > 4) parts[1] += ') ';
  if (normalized.length > 4) parts.push(normalized.slice(4, 7));
  if (normalized.length > 7) parts.push('-' + normalized.slice(7, 9));
  if (normalized.length > 9) parts.push('-' + normalized.slice(9, 11));
  
  return parts.join('');
}

// Format phone as user types
export function formatPhoneInput(value: string, prevValue: string): string {
  const digits = value.replace(/\D/g, '');
  
  // If user is deleting, allow it
  if (value.length < prevValue.length) {
    return value;
  }
  
  return formatPhoneDisplay(digits);
}

// Validate phone number (Russian format)
export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  
  // Russian phone: 11 digits starting with 7 or 8
  if (digits.length === 11) {
    return digits.startsWith('7') || digits.startsWith('8');
  }
  
  // 10 digits without country code
  if (digits.length === 10) {
    return true;
  }
  
  return false;
}

// Get clean phone number for API (just digits with 7 prefix)
export function cleanPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 11 && digits.startsWith('8')) {
    return '7' + digits.slice(1);
  }
  
  if (digits.length === 10) {
    return '7' + digits;
  }
  
  return digits;
}
