"use client";

import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-on-surface">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-10 w-full rounded-xl bg-surface-container-lowest ring-1 ring-outline-variant/30 px-3 text-sm text-on-surface",
            "placeholder:text-inverse-on-surface",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-primary/40",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error && "ring-error focus:ring-error/40",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-on-surface-variant">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
