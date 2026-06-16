// The canonical public origin, hardcoded on purpose. NEXT_PUBLIC_BASE_URL is inlined at
// build time, so relying on it for SEO meant a build without it baked "localhost" into
// the sitemap/canonical/robots. The product has one fixed domain, so pin it here — this
// is also what Google wants as the single canonical address. (Invite/join links still use
// the runtime NEXT_PUBLIC_BASE_URL, which must be set on the host.)
export const SITE_URL = "https://stackgg.app";
