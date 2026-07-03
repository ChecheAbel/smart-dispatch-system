const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Something went wrong. Please try again.",
    );
  }
  return data;
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseResponse(response) as Promise<{ message: string }>;
}

export async function resetPassword(token: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });
  return parseResponse(response) as Promise<{ message: string }>;
}
