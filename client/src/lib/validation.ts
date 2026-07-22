export interface ValidationErrors {
  [field: string]: string | undefined;
}

export type ValidationRule = (value: string) => string | undefined;

export function required(msg?: string): ValidationRule {
  return (v: string) => (!v || !v.trim() ? msg || 'Requerido' : undefined);
}

export function email(msg?: string): ValidationRule {
  return (v: string) =>
    !v || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? msg || 'Email inválido' : undefined;
}

export function minLength(min: number, msg?: string): ValidationRule {
  return (v: string) => (!v || v.length < min ? msg || `Mínimo ${min} caracteres` : undefined);
}

export function pattern(regex: RegExp, msg: string): ValidationRule {
  return (v: string) => (!v || !regex.test(v) ? msg : undefined);
}

export function phone(msg?: string): ValidationRule {
  return (v: string) =>
    !v || !/^\d{10}$/.test(v.replace(/[\s\-()]/g, ''))
      ? msg || 'Teléfono debe ser 10 dígitos'
      : undefined;
}

export function zipCode(msg?: string): ValidationRule {
  return (v: string) => (!v || !/^\d{5}$/.test(v) ? msg || 'CP debe ser 5 dígitos' : undefined);
}

/**
 * Validate multiple fields against their rules.
 * Returns an object of field → error message (undefined = valid).
 */
export function validate(
  rules: Record<string, ValidationRule[]>,
  values: Record<string, string>,
): ValidationErrors {
  const errors: ValidationErrors = {};
  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      const err = rule(values[field] || '');
      if (err) {
        errors[field] = err;
        break;
      }
    }
  }
  return errors;
}
