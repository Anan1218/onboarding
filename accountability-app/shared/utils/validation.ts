interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (email.length === 0) {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email' };
  }

  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (password.length === 0) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  return { isValid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (value.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }

  return { isValid: true };
}
