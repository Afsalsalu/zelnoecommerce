import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadServerConfig(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const allowed = /^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=(.*)$/;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.trim().match(allowed);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    process.env[match[1]] = value;
  }
}

loadServerConfig();

const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
function isUsable(value: string | undefined): value is string {
  return Boolean(value && !/YOUR_(?:PROJECT|[A-Z0-9_]+)/.test(value));
}

async function main(): Promise<void> {
  const suppliedEmail = process.argv.slice(2).find((argument) => argument !== "--" && !argument.startsWith("-"))?.trim().toLowerCase();
  if (!suppliedEmail || !emailPattern.test(suppliedEmail)) {
    console.error("Usage: pnpm admin:bootstrap -- user@example.com");
    process.exitCode = 1;
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isUsable(supabaseUrl) || !isUsable(serviceRoleKey)) {
    console.error("Admin bootstrap requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the server environment.");
    process.exitCode = 1;
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  let page = 1;
  let matchedUser: { id: string; email?: string } | undefined;
  while (!matchedUser) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("Could not read Supabase users for the requested admin email.");
      process.exitCode = 1;
      return;
    }
    matchedUser = data.users.find((user) => user.email?.toLowerCase() === suppliedEmail);
    if (data.users.length < 1000) break;
    page += 1;
  }

  if (!matchedUser) {
    console.error("No Supabase Auth user exists for that email. Create the user first, then run this command again.");
    process.exitCode = 1;
    return;
  }

  const { error } = await supabase.from("user_roles").upsert({ user_id: matchedUser.id, role: "admin" }, { onConflict: "user_id,role" });
  if (error) {
    console.error("Could not grant the admin role. Check that the Supabase schema is applied.");
    process.exitCode = 1;
    return;
  }

  console.log(`Admin role granted to ${suppliedEmail}.`);
}

main().catch(() => {
  console.error("Admin bootstrap failed.");
  process.exitCode = 1;
});
