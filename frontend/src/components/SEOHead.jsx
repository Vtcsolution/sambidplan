import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'Sambid';
const SITE_URL  = 'https://sambid.co';
const DEFAULT_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * SEOHead — drop this into any page to set title, meta, OG, Twitter, canonical.
 *
 * Props:
 *   title        — page title (shown in tab + Google result)
 *   description  — 150-160 chars, shown in Google snippet
 *   keywords     — comma-separated keyword string
 *   canonical    — full URL for this page (defaults to SITE_URL)
 *   image        — OG image URL (defaults to /og-image.png)
 *   noindex      — true → tells Google not to index (use on dashboard/admin)
 *   type         — OG type: 'website' (default) | 'article'
 *   jsonLd       — optional JSON-LD object (pass already-built schema)
 */
export default function SEOHead({
  title,
  description,
  keywords,
  canonical,
  image = DEFAULT_IMAGE,
  noindex = false,
  type = 'website',
  jsonLd,
}) {
  const fullTitle    = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Federal Contract Opportunity Alerts`;
  const canonicalUrl = canonical || SITE_URL;

  return (
    <Helmet>
      {/* ── Core ─────────────────────────────────────────────────── */}
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords    && <meta name="keywords"    content={keywords}    />}
      <link rel="canonical" href={canonicalUrl} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />

      {/* ── Open Graph (LinkedIn, Facebook, WhatsApp previews) ───── */}
      <meta property="og:type"        content={type}        />
      <meta property="og:site_name"   content={SITE_NAME}   />
      <meta property="og:title"       content={fullTitle}   />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url"         content={canonicalUrl} />
      <meta property="og:image"       content={image}        />
      <meta property="og:image:width"  content="1200"        />
      <meta property="og:image:height" content="630"         />

      {/* ── Twitter Card ─────────────────────────────────────────── */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle}           />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image"       content={image}               />
      <meta name="twitter:site"        content="@sambidco"           />

      {/* ── JSON-LD Structured Data ───────────────────────────────── */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
