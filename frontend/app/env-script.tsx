// Server component that injects runtime env vars into the window object.
//
// IMPORTANT: read NON-`NEXT_PUBLIC_`-prefixed vars (API_BASE_URL / API_TOKEN).
// Next.js statically inlines any `process.env.NEXT_PUBLIC_*` reference at BUILD
// time, so those freeze to whatever was set during `npm run build` (typically
// empty) and never pick up the real runtime values. The plain (non-public) vars
// are read at actual request time on the Node server. Requires the consuming
// layout to render dynamically (force-dynamic) so this runs per request.
export function EnvScript() {
  const envVars = {
    NEXT_PUBLIC_API_BASE_URL:
      process.env.API_BASE_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "http://localhost:8005/api/v1",
    NEXT_PUBLIC_API_TOKEN:
      process.env.API_TOKEN || process.env.NEXT_PUBLIC_API_TOKEN || "",
  };

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__ENV__ = ${JSON.stringify(envVars)};`,
      }}
    />
  );
}
