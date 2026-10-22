"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contactSchema } from "@/lib/schemas";
import type { z } from "zod";
type Values = z.infer<typeof contactSchema>;
export function ContactForm() {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<Values>({ resolver: zodResolver(contactSchema), defaultValues: { name: "", email: "", phone: "", subject: "", message: "" } });
  async function submit(values: Values) {
    try { const response = await fetch("/api/contact", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Please try again."); reset(); toast.success("Your note is with us. Thank you."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "We couldn't send your note."); }
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-5">
    <div className="grid gap-5 sm:grid-cols-2"><label><span className="field-label">Your name</span><input autoComplete="name" className="field-control" {...register("name")} aria-invalid={Boolean(errors.name)} />{errors.name && <span className="mt-1 block text-xs text-red-700">{errors.name.message}</span>}</label><label><span className="field-label">Email address</span><input autoComplete="email" type="email" className="field-control" {...register("email")} aria-invalid={Boolean(errors.email)} />{errors.email && <span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>}</label></div>
    <div className="grid gap-5 sm:grid-cols-2"><label><span className="field-label">Phone (optional)</span><input autoComplete="tel" className="field-control" {...register("phone")} />{errors.phone && <span className="mt-1 block text-xs text-red-700">{errors.phone.message}</span>}</label><label><span className="field-label">Subject</span><input className="field-control" {...register("subject")} aria-invalid={Boolean(errors.subject)} />{errors.subject && <span className="mt-1 block text-xs text-red-700">{errors.subject.message}</span>}</label></div>
    <label className="block"><span className="field-label">How can we help?</span><textarea rows={6} className="field-control resize-y" {...register("message")} aria-invalid={Boolean(errors.message)} />{errors.message && <span className="mt-1 block text-xs text-red-700">{errors.message.message}</span>}</label>
    <button disabled={isSubmitting} className="button-primary">{isSubmitting ? "Sending…" : "Send your note"}</button>
  </form>;
}
