/**
 * Password rules aligned with Buyer1 web/mobile.
 * Special chars: ! @ * . _ $ # & - +
 */

export const PASSWORD_SPECIAL_CHARS_REGEX = /[!@*._$#&\-+]/;

export interface PasswordCriteria {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'strong';

export interface PasswordEvaluation {
  score: number;
  percentage: number;
  level: PasswordStrengthLevel;
  criteria: PasswordCriteria;
  isValid: boolean;
}

export function evaluatePassword(password: string): PasswordEvaluation {
  const pw = password || '';
  if (!pw) {
    return {
      score: 0,
      percentage: 0,
      level: 'empty',
      criteria: {
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
      },
      isValid: false,
    };
  }

  const criteria: PasswordCriteria = {
    hasMinLength: pw.length >= 8,
    hasUpperCase: /[A-Z]/.test(pw),
    hasLowerCase: /[a-z]/.test(pw),
    hasNumber: /[0-9]/.test(pw),
    hasSpecialChar: PASSWORD_SPECIAL_CHARS_REGEX.test(pw),
  };

  let score = 0;
  if (criteria.hasMinLength) score++;
  if (criteria.hasUpperCase) score++;
  if (criteria.hasLowerCase) score++;
  if (criteria.hasNumber) score++;
  if (criteria.hasSpecialChar) score++;

  const normalized = score / 5;
  let level: PasswordStrengthLevel = 'weak';
  if (normalized >= 0.8) level = 'strong';
  else if (normalized >= 0.4) level = 'fair';

  const isValid =
    criteria.hasMinLength &&
    criteria.hasUpperCase &&
    criteria.hasLowerCase &&
    criteria.hasNumber &&
    criteria.hasSpecialChar;

  return {
    score,
    percentage: Math.round(normalized * 100),
    level,
    criteria,
    isValid,
  };
}
