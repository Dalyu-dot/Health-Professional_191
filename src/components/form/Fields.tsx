import { clsx } from 'clsx';

export function TextField({
  label,
  value,
  onChange,
  required,
  type = 'text',
  className,
  placeholder,
  maxLength,
  minLength,
  pattern,
  inputMode,
  title
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  className?: string;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  title?: string;
}) {
  return (
    <label className={clsx('block text-sm font-medium text-slate-700 dark:text-slate-200', className)}>
      {label} {required && <span className="text-red-600">*</span>}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        maxLength={maxLength}
        minLength={minLength}
        pattern={pattern}
        inputMode={inputMode}
        title={title}
        placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-phil-600 focus:ring-2 focus:ring-phil-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  required?: boolean;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
      {label} {required && <span className="text-red-600">*</span>}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none transition focus:border-phil-600 focus:ring-2 focus:ring-phil-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className={clsx(
      'flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm transition',
      checked
        ? 'border-phil-600 bg-phil-50 text-phil-900 dark:border-phil-600 dark:bg-phil-900/20 dark:text-phil-100'
        : 'border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
    )}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-phil-600" />
      <span className={clsx('font-medium', checked && 'text-phil-800 dark:text-phil-200')}>{label}</span>
    </label>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <h2 className="mb-4 border-b border-slate-200 pb-3 text-base font-semibold text-slate-950 dark:border-slate-800 dark:text-slate-100">{title}</h2>
      {children}
    </section>
  );
}
