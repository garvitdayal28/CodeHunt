import { useMemo } from "react";

function sanitizeOtp(value, length) {
  return String(value || "")
    .replace(/\D/g, "")
    .slice(0, length);
}

export default function OtpBoxes({
  value = "",
  onChange,
  length = 4,
  editable = false,
  autoFocus = false,
  className = "",
}) {
  const normalized = useMemo(() => sanitizeOtp(value, length), [value, length]);
  const chars = useMemo(
    () => Array.from({ length }, (_, idx) => normalized[idx] || ""),
    [normalized, length],
  );

  const updateAt = (idx, digit) => {
    const nextChars = [...chars];
    nextChars[idx] = digit;
    const nextValue = nextChars.join("").replace(/\D/g, "").slice(0, length);
    onChange?.(nextValue);
  };

  const handleKeyDown = (e, idx) => {
    if (!editable) return;

    if (e.key === "Backspace" && !chars[idx] && idx > 0) {
      const prev = e.currentTarget.previousElementSibling;
      if (prev) prev.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) {
      const prev = e.currentTarget.previousElementSibling;
      if (prev) prev.focus();
    }
    if (e.key === "ArrowRight" && idx < length - 1) {
      const next = e.currentTarget.nextElementSibling;
      if (next) next.focus();
    }
  };

  const handleChange = (e, idx) => {
    if (!editable) return;
    const raw = e.target.value.replace(/\D/g, "");
    const digit = raw.slice(-1);
    updateAt(idx, digit);
    if (digit && idx < length - 1) {
      const next = e.currentTarget.nextElementSibling;
      if (next) next.focus();
    }
  };

  const handlePaste = (e) => {
    if (!editable) return;
    e.preventDefault();
    const pasted = sanitizeOtp(e.clipboardData.getData("text"), length);
    onChange?.(pasted);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {chars.map((ch, idx) => (
        <input
          key={idx}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={ch}
          readOnly={!editable}
          autoFocus={autoFocus && idx === 0}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          onPaste={handlePaste}
          className={`
            h-12 w-11 rounded-lg border text-center text-[20px] font-semibold tracking-wide
            ${editable
              ? "border-border bg-white text-ink focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
              : "border-border bg-surface-sunken/30 text-ink cursor-default"
            }
          `}
        />
      ))}
    </div>
  );
}
