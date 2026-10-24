"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Send } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
const schema=z.object({email:z.string().trim().email().max(254)}); type Values=z.infer<typeof schema>;
export function ForgotPasswordForm(){ const {register,handleSubmit,formState:{errors,isSubmitting},setError}=useForm<Values>({resolver:zodResolver(schema),defaultValues:{email:""}}); async function submit(v:Values){try{const client=createBrowserSupabase();const redirect=`${process.env.NEXT_PUBLIC_SITE_URL||window.location.origin}/reset-password`;const {error}=await client.auth.resetPasswordForEmail(v.email,{redirectTo:redirect});if(error)throw error;toast.success("If that address has an account, a reset link is on its way.");}catch{setError("root",{message:"Password recovery is not connected yet. Please try again later."});}}return <form onSubmit={handleSubmit(submit)} className="space-y-5"><label className="block"><span className="field-label">Email</span><input className="field-control" type="email" autoComplete="email" {...register("email")}/>{errors.email&&<span className="mt-1 block text-xs text-red-700">{errors.email.message}</span>}</label>{errors.root&&<p role="alert" className="text-sm text-red-700">{errors.root.message}</p>}<button className="button-primary w-full" disabled={isSubmitting}><Send size={15} aria-hidden="true" />{isSubmitting?"Sending…":"Send reset link"}</button></form>; }
