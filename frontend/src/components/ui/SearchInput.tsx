import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [local, setLocal] = useState(value);

  // Debounce: propagate to parent 350ms after typing stops.
  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (local !== value) onChange(local);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [local, onChange, value]);

  return (
    <div className={`relative ${className ?? ''}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-petrol-400" />
      <input
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-8"
        aria-label={placeholder}
      />
      {local && (
        <button
          onClick={() => setLocal('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-petrol-400 hover:text-petrol-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
