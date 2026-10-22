import { loginSchema } from "@/lib/schemas";
import { safeInternalPath } from "@/lib/utils";

export type LoginActionState = { error: string } | null;

export type LoginCredentials = {
  email: string;
  password: string;
  nextPath: string;
};

type PasswordAuthClient = {
  auth: {
    signInWithPassword: (credentials: { email: string; password: string }) => Promise<{ error: unknown | null }>;
  };
};

export function parseLoginFormData(formData: FormData):
  | { ok: true; value: LoginCredentials }
  | { ok: false; error: string } {
  const result = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!result.success) return { ok: false, error: "Enter a valid email and password." };

  const rawNext = formData.get("next");
  return {
    ok: true,
    value: {
      ...result.data,
      nextPath: safeInternalPath(typeof rawNext === "string" ? rawNext : null),
    },
  };
}

export function getLoginRedirectPath(nextPath: string | null | undefined) {
  return safeInternalPath(nextPath);
}

export async function authenticateWithPassword(
  client: PasswordAuthClient,
  credentials: Pick<LoginCredentials, "email" | "password">,
): Promise<LoginActionState> {
  try {
    const { error } = await client.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    return error ? { error: "That email and password combination could not be verified." } : null;
  } catch {
    return { error: "Sign in is temporarily unavailable. Please try again later." };
  }
}
