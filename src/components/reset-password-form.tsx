"use client";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createBrowserSupabase } from "@/lib/supabase/browser";
const schema=z.object({password:z.string().min(8,"Use at least 8 characters.").max(128)}); type Values=z.infer<typeof schema>;
export function ResetPasswordForm(){const router=useRouter();const {register,handleSubmit,formState:{errors,isSubmitting},setError}=useForm<Values>({resolver:zodResolver(schema)});async function submit(v:Values){try{const {error}=await createBrowserSupabase().auth.updateUser({password:v.password});if(error)throw error;toast.success("Your password has been updated.");router.replace("/account");router.refresh();}catch{setError("root",{message:"This reset link may have expired. Request a new one and try again."});}}return <form onSubmit={handleSubmit(submit)} className="space-y-5"><label className="block"><span className="field-label">New password</span><input type="password" autoComplete="new-password" className="field-control" {...register("password")}/>{errors.password&&<span className="mt-1 block text-xs text-red-700">{errors.password.message}</span>}</label>{errors.root&&<p role="alert" className="text-sm text-red-700">{errors.root.message}</p>}<button className="button-primary w-full" disabled={isSubmitting}><Save size={15} aria-hidden="true" />{isSubmitting?"Updating…":"Save new password"}</button></form>;}
