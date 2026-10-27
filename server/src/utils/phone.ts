/**
 * Phone Number Normalization Utility for Electropathy AI
 * Standardizes Indian phone numbers to E.164 format (+91XXXXXXXXXX)
 */

export interface PhoneValidationResult {
  isValid: boolean;
  e164: string;
  national10Digit: string;
  error?: string;
}

/**
 * Normalize and validate phone numbers to standard E.164 format (+91XXXXXXXXXX)
 */
export function normalizePhoneNumber(raw: string): PhoneValidationResult {
  if (!raw || typeof raw !== 'string') {
    return {
      isValid: false,
      e164: '',
      national10Digit: '',
      error: 'Phone number is required.'
    };
  }

  // Remove all non-digit characters
  const digits = raw.replace(/\D/g, '');

  let national10 = '';

  if (digits.length === 10) {
    national10 = digits;
  } else if (digits.length === 11 && digits.startsWith('0')) {
    national10 = digits.slice(1);
  } else if (digits.length === 12 && digits.startsWith('91')) {
    national10 = digits.slice(2);
  } else if (digits.length > 10) {
    // Take the last 10 digits if prefaced by country codes
    national10 = digits.slice(-10);
  } else {
    return {
      isValid: false,
      e164: '',
      national10Digit: '',
      error: 'Mobile number must be a valid 10-digit number.'
    };
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(national10)) {
    return {
      isValid: false,
      e164: '',
      national10Digit: national10,
      error: 'Indian mobile number must be 10 digits starting with 6, 7, 8, or 9.'
    };
  }

  return {
    isValid: true,
    e164: `+91${national10}`,
    national10Digit: national10
  };
}

/**
 * Format E.164 phone number for clean user-facing display: +91 84213 58609
 */
export function formatDisplayPhone(e164OrDigits: string): string {
  const norm = normalizePhoneNumber(e164OrDigits);
  if (!norm.isValid) return e164OrDigits;

  const n = norm.national10Digit;
  return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
}
