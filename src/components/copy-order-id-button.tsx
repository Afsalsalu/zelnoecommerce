"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

function copyWithFallback(value: string) {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
  }
}

export function CopyOrderIdButton({ orderNumber }: { orderNumber: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  async function copyOrderId() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(orderNumber);
      } else if (!copyWithFallback(orderNumber)) {
        throw new Error("Clipboard copy failed");
      }

      setCopied(true);
      toast.success("Order ID copied");
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
      toast.error("We couldn't copy the order ID. Please copy it manually.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Copy order ID"
        title="Copy order ID"
        onClick={copyOrderId}
        className="pointer-events-auto grid size-7 shrink-0 place-items-center text-muted transition-colors hover:text-olive focus-visible:text-olive"
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
      {copied && <span role="status" aria-live="polite" className="text-[10px] text-olive">Order ID copied</span>}
    </>
  );
}
