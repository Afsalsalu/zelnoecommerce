"use client";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";
export function LogoutButton(){const router=useRouter();async function logout(){await createBrowserSupabase().auth.signOut();router.replace("/");router.refresh();}return <button onClick={logout} className="text-xs underline underline-offset-4">Sign out</button>;}
