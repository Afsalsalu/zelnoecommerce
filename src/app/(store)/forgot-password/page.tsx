import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
export const metadata={title:"Reset your password",robots:{index:false,follow:false}};
export default function ForgotPasswordPage(){return <section className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-5 py-16"><div className="w-full max-w-md"><span className="eyebrow">Account help</span><h1 className="mt-4 font-display text-5xl">A fresh start.</h1><p className="my-5 text-sm leading-7 text-muted">Enter the email address linked to your account and weâ€™ll send a secure reset link.</p><div className="bg-paper p-6"><ForgotPasswordForm/></div><Link className="mt-6 inline-flex items-center gap-1.5 text-xs underline underline-offset-4" href="/login"><ArrowLeft size={14} aria-hidden="true" />Back to sign in</Link></div></section>;}


