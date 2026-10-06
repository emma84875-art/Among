import { useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';

interface VerificationCodeInputProps {
  value: string;
  onChange: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export function VerificationCodeInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}: VerificationCodeInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newDigits = [...digits];
      if (newDigits[index]) {
        newDigits[index] = '';
        const newCode = newDigits.join('');
        onChange(newCode);
      } else if (index > 0) {
        newDigits[index - 1] = '';
        const newCode = newDigits.join('');
        onChange(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleChange = (index: number, e: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) return;

    const lastChar = rawVal[rawVal.length - 1];
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const newCode = newDigits.join('');
    onChange(newCode);

    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.length === 6 && onComplete) {
      onComplete(newCode);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    e.preventDefault();

    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedText) return;

    onChange(pastedText);

    // Focus last filled box or 6th box
    const targetIndex = Math.min(pastedText.length, 5);
    inputRefs.current[targetIndex]?.focus();

    if (pastedText.length === 6 && onComplete) {
      onComplete(pastedText);
    }
  };

  return (
    <div
      id="verification-code-group"
      className="flex items-center justify-center gap-2 sm:gap-3 py-2"
    >
      {digits.map((digit, index) => {
        const isFilled = digit !== '';
        return (
          <input
            key={index}
            id={`verification-digit-${index}`}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoComplete="one-time-code"
            onKeyDown={(e) => handleKeyDown(index, e)}
            onChange={(e) => handleChange(index, e)}
            onPaste={handlePaste}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-mono font-medium rounded-xl border transition-all duration-150 select-all cursor-pointer ${
              hasError
                ? 'border-rose-600 dark:border-rose-500 bg-rose-500/5 text-rose-950 dark:text-rose-100 focus:ring-1 focus:ring-rose-600'
                : isFilled
                ? 'border-zinc-950 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 shadow-xs'
                : 'border-zinc-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:border-zinc-950 dark:focus:border-zinc-100 focus:ring-1 focus:ring-zinc-950 dark:focus:ring-zinc-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            aria-label={`Digit ${index + 1} of 6`}
          />
        );
      })}
    </div>
  );
}
