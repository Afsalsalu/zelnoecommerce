"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema } from "@/lib/schemas";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { z } from "zod";
type Values = z.infer<typeof registerSchema>;
export function RegisterForm() {
  const router = useRouter();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<Values>({ resolver: zodResolver(registerSchema), defaultValues: { fullName: "", email: "", phone: "", password: "" } });
  async function submit(values: Values) {
    try { const client = createBrowserSupabase(); const { data, error } = await client.auth.signUp({ email: values.email, password: values.password, options: { data: { full_name: values.fullName, phone: values.phone || "" }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/account` } }); if (error) throw error; if (data.session) { toast.success("Your account is ready."); router.push("/account"); router.refresh(); } else toast.success("Check your email to confirm your account."); }
    catch { setError("root", { message: "We couldn't create your account. Check your details and try again." }); }
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-5"><label className="block"><span className="field-label">Full name</span><input autoComplete="name" className="field-control" {...register("fullName")} />{errors.fullName && <span className="mt-1 block text-xs text-red-700">{errors.fullName.message}</span>}</label><label className="block"><span className="field-label">Email</span><input type="email" autoComplete="email" className="field-control" {...register("email")} />{errors.email && <span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>}</label><label className="block"><span className="field-label">Phone (optional)</span><input autoComplete="tel" className="field-control" {...register("phone")} />{errors.phone && <span className="mt-1 block text-xs text-red-700">{errors.phone.message}</span>}</label><label className="block"><span className="field-label">Password</span><input type="password" autoComplete="new-password" className="field-control" {...register("password")} />{errors.password && <span className="mt-1 block text-xs text-red-700">{errors.password.message}</span>}</label>{errors.root && <p role="alert" className="text-sm text-red-700">{errors.root.message}</p>}<button disabled={isSubmitting} className="button-primary w-full">{isSubmitting ? "Creating account…" : "Create account"}</button><p className="text-center text-xs text-muted">Already have an account? <Link className="underline underline-offset-4" href="/login">Sign in</Link></p></form>;
}
