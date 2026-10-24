"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
export function LogoutButton(){const router=useRouter();async function logout(){await createBrowserSupabase().auth.signOut();router.replace("/");router.refresh();}return <button onClick={logout} className="inline-flex items-center gap-1.5 text-xs underline underline-offset-4"><LogOut size={14} aria-hidden="true" />Sign out</button>;}
