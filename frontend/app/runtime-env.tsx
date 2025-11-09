// Server-side runtime env injection
// This reads actual runtime env vars, not build-time replacements

export async function RuntimeEnv() {
  // Force dynamic rendering to read runtime env
  const envVars = {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8005/api/v1",
    NEXT_PUBLIC_API_TOKEN: process.env.NEXT_PUBLIC_API_TOKEN || "",
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__RUNTIME_ENV__ = ${JSON.stringify(envVars)};`,
      }}
    />
  );
}

// Force this route to be dynamic
export const dynamic = 'force-dynamic';
export const revalidate = 0;

