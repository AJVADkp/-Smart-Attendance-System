import { cn } from '@/lib/utils';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: Array<{ value: string | number; label: string }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, children, className, id, ...props },
  ref
) {
  const selectId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-[#1F2937] dark:text-zinc-200 tracking-normal"
        >
          {label}
          {props.required && <span className="text-[#B91C1C] dark:text-rose-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full pl-3.5 pr-10 py-2.5 text-sm rounded-[10px] border bg-white dark:bg-zinc-900 transition-all duration-150 min-h-[44px] appearance-none cursor-pointer',
            'text-[#1F2937] dark:text-zinc-100',
            error
              ? 'border-[#B91C1C] dark:border-rose-500 ring-2 ring-[#B91C1C]/15 focus:border-[#B91C1C] focus:outline-none'
              : 'border-[#FED7AA] dark:border-zinc-700 shadow-xs hover:border-[#FDBA74] dark:hover:border-zinc-600 focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 focus:outline-none',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
          {...props}
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <div className="absolute right-3 text-[#6B7280] dark:text-zinc-400 pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {hint && !error && (
        <p id={`${selectId}-hint`} className="text-xs text-[#6B7280] dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${selectId}-error`}
          className="text-xs text-[#B91C1C] dark:text-rose-400 font-medium flex items-center gap-1 mt-0.5"
          role="alert"
        >
          <span>•</span> {error}
        </p>
      )}
    </div>
  );
});
