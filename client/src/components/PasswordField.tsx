import { useState } from 'react';
import { Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

interface PasswordFieldProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  placeholder?: string;
  autoComplete?: string;
  name?: string;
  showStrength?: boolean;
  error?: string;
  autoFocus?: boolean;
  /** If provided, shows match indicator */
  confirmValue?: string;
  /** If provided, shows confirm input below */
  onConfirmChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  confirmLabel?: string;
  confirmPlaceholder?: string;
  id?: string;
  confirmId?: string;
}

function getStrength(password: string): {
  level: 0 | 1 | 2 | 3;
  label: string;
  color: string;
  width: string;
} {
  if (!password) return { level: 0, label: '', color: '', width: '0%' };
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const score = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;

  if (len < 6) return { level: 1, label: 'Muy corta', color: 'bg-red-500', width: '25%' };
  if (len >= 10 && score >= 3)
    return { level: 3, label: 'Segura', color: 'bg-green-500', width: '100%' };
  if (len >= 8 && score >= 2)
    return { level: 2, label: 'Media', color: 'bg-yellow-500', width: '66%' };
  return { level: 1, label: 'Débil', color: 'bg-orange-500', width: '33%' };
}

export default function PasswordField({
  value,
  onChange,
  label = 'Contraseña',
  placeholder = 'Mínimo 6 caracteres',
  autoComplete = 'new-password',
  name = 'password',
  showStrength = false,
  error,
  autoFocus,
  confirmValue,
  onConfirmChange,
  confirmLabel = 'Confirmar contraseña',
  confirmPlaceholder = 'Repite la contraseña',
  id,
  confirmId,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const strength = getStrength(value);
  const inputId = id ?? name;

  return (
    <div className="space-y-4">
      {/* Primary password field */}
      <div>
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
        <div className="relative">
          <input
            id={inputId}
            name={name}
            type={show ? 'text' : 'password'}
            required
            minLength={6}
            value={value}
            onChange={onChange}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            placeholder={placeholder}
            className="field-control pr-12"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="icon-button absolute right-0 top-1/2 -translate-y-1/2 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Strength meter */}
        {showStrength && value.length > 0 && (
          <div className="mt-2">
            <div
              className="h-1 w-full bg-coffee-200 dark:bg-coffee-700 rounded-full overflow-hidden"
              role="progressbar"
              aria-label="Fortaleza de contraseña"
              aria-valuemin={0}
              aria-valuemax={3}
              aria-valuenow={strength.level}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: strength.width }}
              />
            </div>
            <p
              aria-live="polite"
              className={`text-xs mt-0.5 ${strength.level === 3 ? 'text-green-500' : strength.level === 2 ? 'text-yellow-500' : 'text-orange-500'}`}
            >
              {strength.label}
            </p>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      </div>

      {/* Confirm password field */}
      {onConfirmChange !== undefined && (
        <div>
          <label htmlFor={confirmId ?? 'confirmPassword'} className="field-label">
            {confirmLabel}
          </label>
          <div className="relative">
            <input
              id={confirmId ?? 'confirmPassword'}
              name="confirmPassword"
              type={show ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmValue ?? ''}
              onChange={onConfirmChange}
              autoComplete="new-password"
              placeholder={confirmPlaceholder}
              className="field-control pr-12"
            />
          </div>
          {confirmValue && confirmValue.length > 0 && (
            <p
              className={`flex items-center gap-1 text-xs mt-1 ${value === confirmValue ? 'text-green-500' : 'text-red-500'}`}
            >
              {value === confirmValue ? (
                <>
                  <CheckCircle className="w-3 h-3" /> Coinciden
                </>
              ) : (
                <>
                  <AlertCircle className="w-3 h-3" /> No coinciden
                </>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
