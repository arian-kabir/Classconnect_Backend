"use client";
import * as React from 'react';
import { cn } from '@/lib/utils';

interface SelectContextType {
  value?: string;
  onValueChange?: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextType>({
  open: false,
  setOpen: () => {},
  disabled: false,
});

export function Select({ value, onValueChange, disabled, children }: { value?: string; onValueChange?: (val: string) => void; disabled?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <SelectContext.Provider value={{ value, onValueChange, open, setOpen, disabled }}>
      <div className="relative w-full">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className, id, children }: { className?: string; id?: string; children: React.ReactNode }) {
  const { open, setOpen, disabled } = React.useContext(SelectContext);
  return (
    <button
      id={id}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setOpen(!open)}
      className={cn(
        'flex h-10 w-full items-center justify-between rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#002626] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      {children}
      <span className="ml-2 text-xs text-gray-500">▼</span>
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value } = React.useContext(SelectContext);
  return <span>{value || placeholder}</span>;
}

export function SelectContent({ className, children }: { className?: string; children: React.ReactNode }) {
  const { open } = React.useContext(SelectContext);
  if (!open) return null;
  return (
    <div
      className={cn(
        'absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white p-1 text-gray-950 shadow-md',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const { onValueChange, setOpen } = React.useContext(SelectContext);
  return (
    <div
      onClick={() => {
        onValueChange?.(value);
        setOpen(false);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-md py-1.5 px-2 text-sm outline-none hover:bg-[#e2ede6] hover:text-[#002626]',
        className
      )}
    >
      {children}
    </div>
  );
}
