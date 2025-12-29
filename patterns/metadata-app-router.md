# Pattern: Next.js App Router Metadata

Complete metadata implementation for SEO-optimized Next.js 14/15 blogs.

---

## Root Layout Metadata

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from 'next';

const siteConfig = {
  name: 'Chudi Blog',
  description: 'Insights on AI systems engineering, neurodivergent productivity, and building with Claude Code CLI',
  url: 'https://chudi-blog.vercel.app',
  author: {
    name: 'Chudi Nnorukam',
    twitter: '@chudi',
    linkedin: 'https://linkedin.com/in/chudi',
  },
  locale: 'en_US',
};

export const metadata: Metadata = {
  // Base URL for relative URLs in metadata
  metadataBase: new URL(siteConfig.url),
  
  // Title configuration
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,  // "Post Title | Chudi Blog"
  },
  
  // Description
  description: siteConfig.description,
  
  // Keywords (less important now, but doesn't hurt)
  keywords: [
    'AI systems engineering',
    'Claude Code CLI',
    'neurodivergent productivity',
    'MicroSaaS',
    'Next.js',
    'TypeScript',
  ],
  
  // Author information
  authors: [{ name: siteConfig.author.name, url: siteConfig.url }],
  creator: siteConfig.author.name,
  publisher: siteConfig.name,
  
  // Robots configuration
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.name,
    description: siteConfig.description,
    images: [
      {
        url: '/og-image.png',  // 1200x630 recommended
        width: 1200,
        height: 630,
        alt: siteConfig.name,
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.name,
    description: siteConfig.description,
    creator: siteConfig.author.twitter,
    images: ['/og-image.png'],
  },
  
  // Canonical URL
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/',
    },
  },
  
  // Icons
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  
  // Manifest
  manifest: '/site.webmanifest',
  
  // Verification (add your IDs)
  verification: {
    google: 'your-google-verification-code',
    // yandex: 'your-yandex-code',
    // yahoo: 'your-yahoo-code',
  },
  
  // Category
  category: 'technology',
};

// Viewport (separate export in Next.js 14+)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## Blog Post Dynamic Metadata

```typescript
// app/blog/[slug]/page.tsx
import type { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';

interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    image: string;
  };
  featuredImage: string;
  tags: string[];
  readingTime: number;
}

// This would be your data fetching function
async function getPost(slug: string): Promise<BlogPost | null> {
  // Fetch from CMS, filesystem, database, etc.
  // Return null if not found
}

// Generate static params for all posts (optional, for SSG)
export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

// Dynamic metadata generation
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const slug = (await params).slug;
  const post = await getPost(slug);
  
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }
  
  const baseUrl = 'https://chudi-blog.vercel.app';
  const postUrl = `${baseUrl}/blog/${slug}`;
  
  // Inherit parent images as fallback
  const previousImages = (await parent).openGraph?.images || [];
  
  return {
    // Title uses template from layout: "Post Title | Chudi Blog"
    title: post.title,
    
    // Description (truncate if needed)
    description: post.excerpt.slice(0, 160),
    
    // Keywords from tags
    keywords: post.tags,
    
    // Author
    authors: [{ name: post.author.name }],
    
    // Open Graph - Article type
    openGraph: {
      type: 'article',
      url: postUrl,
      title: post.title,
      description: post.excerpt,
      siteName: 'Chudi Blog',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      tags: post.tags,
      images: [
        {
          url: post.featuredImage,
          width: 1200,
          height: 630,
          alt: post.title,
        },
        ...previousImages,
      ],
    },
    
    // Twitter Card
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [post.featuredImage],
    },
    
    // Canonical URL (CRITICAL for SEO)
    alternates: {
      canonical: postUrl,
    },
  };
}

// Page component
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const post = await getPost(slug);
  
  if (!post) {
    notFound();
  }
  
  return (
    <article>
      {/* Article content */}
    </article>
  );
}
```

---

## Blog Index Page Metadata

```typescript
// app/blog/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',  // Becomes "Blog | Chudi Blog"
  description: 'Articles on AI systems engineering, Claude Code CLI, and building production-ready MicroSaaS applications.',
  openGraph: {
    type: 'website',
    title: 'Blog | Chudi Blog',
    description: 'Articles on AI systems engineering, Claude Code CLI, and building production-ready MicroSaaS applications.',
  },
  alternates: {
    canonical: '/blog',
  },
};

export default async function BlogIndexPage() {
  const posts = await getAllPosts();
  
  return (
    <div>
      {/* Blog listing */}
    </div>
  );
}
```

---

## Static Page Metadata

```typescript
// app/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'Chudi Nnorukam - AI Systems Engineer specializing in Claude Code CLI, MicroSaaS development, and neurodivergent productivity workflows.',
  openGraph: {
    type: 'profile',
    title: 'About Chudi Nnorukam',
    description: 'AI Systems Engineer specializing in Claude Code CLI and MicroSaaS development.',
    images: ['/chudi-profile.jpg'],
  },
  alternates: {
    canonical: '/about',
  },
};
```

---

## JSON-LD Structured Data Component

```typescript
// components/JsonLd.tsx

interface OrganizationSchemaProps {
  name: string;
  url: string;
  logo: string;
  sameAs?: string[];
}

export function OrganizationSchema({ name, url, logo, sameAs }: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    sameAs: sameAs || [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ArticleSchemaProps {
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;
  updatedAt: string;
  author: {
    name: string;
    url: string;
  };
}

export function ArticleSchema({
  title,
  description,
  url,
  image,
  publishedAt,
  updatedAt,
  author,
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    description,
    image,
    url,
    datePublished: publishedAt,
    dateModified: updatedAt,
    author: {
      '@type': 'Person',
      name: author.name,
      url: author.url,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Chudi Blog',
      logo: {
        '@type': 'ImageObject',
        url: 'https://chudi-blog.vercel.app/logo.png',
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

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQSchemaProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

export function FAQSchema({ questions }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
```

---

## Usage in Blog Post

```typescript
// app/blog/[slug]/page.tsx
import { ArticleSchema, BreadcrumbSchema } from '@/components/JsonLd';

export default async function BlogPostPage({ params }) {
  const slug = (await params).slug;
  const post = await getPost(slug);
  
  return (
    <>
      <ArticleSchema
        title={post.title}
        description={post.excerpt}
        url={`https://chudi-blog.vercel.app/blog/${slug}`}
        image={post.featuredImage}
        publishedAt={post.publishedAt}
        updatedAt={post.updatedAt}
        author={{
          name: post.author.name,
          url: `https://chudi-blog.vercel.app/about`,
        }}
      />
      
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://chudi-blog.vercel.app' },
          { name: 'Blog', url: 'https://chudi-blog.vercel.app/blog' },
          { name: post.title, url: `https://chudi-blog.vercel.app/blog/${slug}` },
        ]}
      />
      
      <article>
        {/* Content */}
      </article>
    </>
  );
}
```

---

## Validation Checklist

Run these checks after implementing:

```bash
# Check title tag
curl -s https://chudi-blog.vercel.app | grep -o "<title>.*</title>"

# Check meta description
curl -s https://chudi-blog.vercel.app | grep -o '<meta name="description"[^>]*>'

# Check canonical
curl -s https://chudi-blog.vercel.app | grep -o '<link rel="canonical"[^>]*>'

# Check OG tags
curl -s https://chudi-blog.vercel.app | grep -o '<meta property="og:[^"]*"[^>]*>'

# Check JSON-LD
curl -s https://chudi-blog.vercel.app | grep -o '<script type="application/ld+json">.*</script>'

# Validate with Google Rich Results Test
# https://search.google.com/test/rich-results
```
