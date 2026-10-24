"use client";
import Link from "next/link";
import { startTransition, useActionState } from "react";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/schemas";
import { loginAction } from "@/app/login/actions";
import type { z } from "zod";
type Values = z.infer<typeof loginSchema>;
export function LoginForm({ nextPath = "/account" }: { nextPath?: string }) {
  const [actionState, formAction, isPending] = useActionState(loginAction, null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  async function submit(values: Values) {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("next", nextPath);
    startTransition(() => formAction(formData));
  }
  return <form onSubmit={handleSubmit(submit)} className="space-y-5"><label className="block"><span className="field-label">Email</span><input className="field-control" type="email" autoComplete="email" {...register("email")} aria-invalid={Boolean(errors.email)} />{errors.email && <span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>}</label><label className="block"><span className="field-label">Password</span><input className="field-control" type="password" autoComplete="current-password" {...register("password")} aria-invalid={Boolean(errors.password)} />{errors.password && <span className="mt-1 block text-xs text-red-700">{errors.password.message}</span>}</label>{actionState?.error && <p role="alert" className="text-sm text-red-700">{actionState.error}</p>}<div className="flex justify-end"><Link href="/forgot-password" className="text-xs underline underline-offset-4">Forgot password?</Link></div><button disabled={isSubmitting || isPending} className="button-primary w-full"><LogIn size={15} aria-hidden="true" />{isSubmitting || isPending ? "Signing in…" : "Sign in"}</button><p className="text-center text-xs text-muted">New to ZELNO? <Link className="text-ink underline underline-offset-4" href="/register">Create an account</Link></p></form>;
}
