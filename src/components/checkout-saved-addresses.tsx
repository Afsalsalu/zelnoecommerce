"use client";

import { ChevronDown, MapPin, Plus } from "lucide-react";
import type { SavedAddress } from "@/lib/saved-addresses";

export function CheckoutSavedAddresses({ addresses, selectedId, expanded, onExpand, onSelect, onUseNew }: {
  addresses: SavedAddress[];
  selectedId: string | null;
  expanded: boolean;
  onExpand: () => void;
  onSelect: (address: SavedAddress) => void;
  onUseNew: () => void;
}) {
  if (!addresses.length) return null;
  const ordered = addresses;
  const first = ordered[0];
  const additional = ordered.slice(1);

  const card = (address: SavedAddress, isLastUsed: boolean) => {
    const selected = selectedId === address.id;
    return (
      <label key={address.id} className={`block cursor-pointer border p-4 transition-colors ${selected ? "border-olive bg-[#eef0e7]" : "border-line bg-ivory hover:border-olive/60"}`}>
        <span className="flex items-start gap-3">
          <input type="radio" name="saved-address" value={address.id} checked={selected} onChange={() => onSelect(address)} className="mt-1 accent-olive" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink">
              <span>{address.full_name}</span>
              {isLastUsed && <span className="text-[9px] font-semibold uppercase tracking-[.12em] text-olive">Last used</span>}
              {address.label && <span className="text-[9px] font-semibold uppercase tracking-[.12em] text-muted">{address.label}</span>}
            </span>
            <span className="mt-2 block text-xs leading-6 text-muted">
              {address.phone} · {address.email}<br />
              {address.address_line}, {address.area}<br />
              {address.city}, {address.state} · {address.pincode}
            </span>
          </span>
        </span>
      </label>
    );
  };

  return (
    <section className="border border-line bg-paper p-5 sm:p-7" aria-labelledby="saved-addresses-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Quick checkout</span>
          <h2 id="saved-addresses-heading" className="mt-2 font-display text-3xl">Saved addresses</h2>
          <p className="mt-2 text-sm leading-6 text-muted">Choose a saved contact and delivery address, or continue with a new one.</p>
        </div>
        <MapPin size={18} className="mt-1 text-olive" aria-hidden="true" />
      </div>
      <div className="mt-5 space-y-3">
        {card(first, true)}
        {additional.length > 0 && <div className={`grid transition-[grid-template-rows,opacity] duration-300 ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}><div className="min-h-0 space-y-3 overflow-hidden">{additional.map((address) => card(address, false))}</div></div>}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {addresses.length > 1 && <button type="button" onClick={onExpand} aria-expanded={expanded} className="button-secondary min-h-10 px-4">
          <ChevronDown size={15} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
          {expanded ? "Hide more addresses" : "More addresses"}
        </button>}
        <button type="button" onClick={onUseNew} className="button-secondary min-h-10 px-4">
          <Plus size={15} aria-hidden="true" />
          Use a new address
        </button>
      </div>
    </section>
  );
}
