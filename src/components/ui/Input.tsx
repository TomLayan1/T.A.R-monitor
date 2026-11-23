import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const fieldBase =
  'block w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

const slug = (label: string) => `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-700">
      {label}
      {required && <span className="text-rose-600"> *</span>}
    </label>
  );
}

function Message({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={id} role="alert" className="mt-1 text-xs text-rose-600">
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={id} className="mt-1 text-xs text-slate-500">
        {hint}
      </p>
    );
  return null;
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {
  adornment?: ReactNode;
  /** Extra classes for the <input> element itself (e.g. colour for a calculated value). */
  inputClassName?: string;
}

export function Input({ label, error, hint, adornment, inputClassName = '', className = '', readOnly, id, ...rest }: InputProps) {
  const inputId = id ?? slug(label);
  const msgId = `${inputId}-msg`;
  return (
    <div className={className}>
      <Label htmlFor={inputId} label={label} required={rest.required} />
      <div className="relative">
        {adornment && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
            {adornment}
          </span>
        )}
        <input
          id={inputId}
          readOnly={readOnly}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? msgId : undefined}
          className={`${fieldBase} ${adornment ? 'pl-8' : ''} ${
            readOnly ? 'cursor-not-allowed bg-slate-100 text-slate-600' : ''
          } ${error ? 'border-rose-400' : 'border-slate-300'} ${inputClassName}`}
          {...rest}
        />
      </div>
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {}

export function Select({ label, error, hint, className = '', id, children, ...rest }: SelectProps) {
  const selectId = id ?? slug(label);
  const msgId = `${selectId}-msg`;
  return (
    <div className={className}>
      <Label htmlFor={selectId} label={label} required={rest.required} />
      <select
        id={selectId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? msgId : undefined}
        className={`${fieldBase} ${error ? 'border-rose-400' : 'border-slate-300'}`}
        {...rest}
      >
        {children}
      </select>
      <Message id={msgId} error={error} hint={hint} />
    </div>
  );
}
