import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, icon, className, id, ...props },
  ref
) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-[#1F2937] dark:text-zinc-200 tracking-normal"
        >
          {label}
          {props.required && <span className="text-[#B91C1C] dark:text-rose-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-[#6B7280] dark:text-zinc-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3.5 py-2.5 text-sm rounded-[10px] border bg-white dark:bg-zinc-900 transition-all duration-150 min-h-[44px]',
            'text-[#1F2937] dark:text-zinc-100 placeholder:text-[#9CA3AF] dark:placeholder:text-zinc-500',
            icon && 'pl-10',
            error
              ? 'border-[#B91C1C] dark:border-rose-500 ring-2 ring-[#B91C1C]/15 focus:border-[#B91C1C] focus:outline-none'
              : 'border-[#FED7AA] dark:border-zinc-700 shadow-xs hover:border-[#FDBA74] dark:hover:border-zinc-600 focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 focus:outline-none',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-[#6B7280] dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={`${inputId}-error`}
          className="text-xs text-[#B91C1C] dark:text-rose-400 font-medium flex items-center gap-1 mt-0.5"
          role="alert"
        >
          <span>•</span> {error}
        </p>
      )}
    </div>
  );
});
