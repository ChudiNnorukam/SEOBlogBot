/**
 * Complete Metadata Configuration for Next.js App Router
 * 
 * This template provides:
 * - SEO-optimized title/description
 * - OpenGraph tags for social sharing
 * - Twitter cards
 * - JSON-LD structured data
 * - Proper canonical configuration
 * 
 * Usage:
 *   1. Copy metadata object to your app/layout.tsx
 *   2. Update all values for your site
 *   3. Add JSON-LD component to layout
 */

import type { Metadata, Viewport } from 'next';

// ============================================================================
// CONFIGURATION - UPDATE THESE
// ============================================================================

const SITE_URL = 'https://chudi-blog.vercel.app';
const SITE_NAME = 'Chudi Blog';
const SITE_DESCRIPTION = 'Insights on AI systems engineering, neurodivergent productivity, and building MicroSaaS products';
const AUTHOR_NAME = 'Chudi Nnorukam';
const AUTHOR_TWITTER = '@chudi'; // Without @
const DEFAULT_OG_IMAGE = '/og-image.png'; // 1200x630 recommended

// ============================================================================
// Viewport Configuration
// ============================================================================

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

// ============================================================================
// Root Metadata (applies to all pages unless overridden)
// ============================================================================

export const metadata: Metadata = {
  // Base URL for resolving relative URLs in metadata
  metadataBase: new URL(SITE_URL),
  
  // Title configuration
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`, // "Page Title | Site Name"
  },
  
  // Core SEO
  description: SITE_DESCRIPTION,
  keywords: [
    'AI systems engineering',
    'Claude Code CLI',
    'MicroSaaS',
    'Next.js',
    'Vercel',
    'neurodivergent productivity',
    'ADHD developer',
    'automation',
  ],
  
  // Authorship
  authors: [
    { name: AUTHOR_NAME, url: SITE_URL },
  ],
  creator: AUTHOR_NAME,
  publisher: SITE_NAME,
  
  // Robots configuration
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  
  // Manifest for PWA
  manifest: '/manifest.json',
  
  // OpenGraph (Facebook, LinkedIn, etc.)
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME,
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: AUTHOR_TWITTER,
    creator: AUTHOR_TWITTER,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  
  // Canonical and alternates
  alternates: {
    canonical: SITE_URL,
    types: {
      'application/rss+xml': `${SITE_URL}/feed.xml`,
    },
  },
  
  // Verification tags
  verification: {
    google: 'your-google-verification-code', // From GSC
    // yandex: 'your-yandex-code',
    // other: { 'facebook-domain-verification': 'your-fb-code' },
  },
  
  // Category
  category: 'technology',
  
  // Other useful meta
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'default',
    'format-detection': 'telephone=no',
  },
};

// ============================================================================
// JSON-LD Structured Data Component
// ============================================================================

export function RootJsonLd() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    sameAs: [
      `https://twitter.com/${AUTHOR_TWITTER}`,
      'https://github.com/chudi',
      'https://linkedin.com/in/chudi',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${SITE_URL}/contact`,
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: SITE_URL,
    jobTitle: 'AI Systems Engineer',
    worksFor: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    sameAs: [
      `https://twitter.com/${AUTHOR_TWITTER}`,
      'https://github.com/chudi',
      'https://linkedin.com/in/chudi',
    ],
    knowsAbout: [
      'AI Systems Engineering',
      'Claude Code CLI',
      'MicroSaaS Development',
      'Next.js',
      'Automation',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
    </>
  );
}

// ============================================================================
// Example Root Layout
// ============================================================================

/*
// app/layout.tsx
import { metadata, viewport, RootJsonLd } from './metadata-config';

export { metadata, viewport };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <RootJsonLd />
      </head>
      <body>{children}</body>
    </html>
  );
}
*/

// ============================================================================
// Dynamic Page Metadata (for blog posts)
// ============================================================================

/*
// app/blog/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = (await params).slug;
  const post = await getPost(slug);
  
  if (!post) {
    return { title: 'Post Not Found' };
  }

  return {
    title: post.title,
    description: post.excerpt,
    authors: [{ name: post.author.name }],
    
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `${SITE_URL}/blog/${slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: [
        {
          url: post.featuredImage || DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: post.title,
        },
      ],
      section: post.category,
      tags: post.tags,
    },
    
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.featuredImage || DEFAULT_OG_IMAGE],
    },
    
    alternates: {
      canonical: `${SITE_URL}/blog/${slug}`,
    },
  };
}
*/

// ============================================================================
// Blog Post JSON-LD Component
// ============================================================================

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  publishedAt: string;
  updatedAt: string;
  authorName: string;
  authorUrl?: string;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  imageUrl,
  publishedAt,
  updatedAt,
  authorName,
  authorUrl,
}: ArticleJsonLdProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description: description,
    image: imageUrl,
    url: url,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: {
      '@type': 'Person',
      name: authorName,
      url: authorUrl || SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
