/**
 * Dynamic Sitemap for Next.js App Router
 * 
 * CRITICAL CONFIGURATION:
 * - export const dynamic = 'force-dynamic' prevents caching
 * - export const revalidate = 0 ensures fresh data
 * - These are REQUIRED to fix "Couldn't fetch" in GSC
 * 
 * Usage:
 *   1. Copy this file to app/sitemap.ts
 *   2. Update SITE_URL constant
 *   3. Update getBlogPosts() to fetch from your CMS/database
 *   4. Deploy and submit to Google Search Console
 */

import type { MetadataRoute } from 'next';

// ============================================================================
// CONFIGURATION - UPDATE THESE
// ============================================================================

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://chudi-blog.vercel.app';

// ============================================================================
// CRITICAL: Force dynamic generation (fixes GSC "Couldn't fetch")
// ============================================================================

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ============================================================================
// Data Fetching - UPDATE FOR YOUR CMS
// ============================================================================

interface BlogPost {
  slug: string;
  updatedAt: string;
  publishedAt: string;
}

/**
 * Fetch all blog posts from your data source
 * 
 * Examples for different CMSs:
 * 
 * Contentful:
 *   const entries = await contentful.getEntries({ content_type: 'blogPost' });
 *   return entries.items.map(item => ({ slug: item.fields.slug, ... }));
 * 
 * Sanity:
 *   return await sanity.fetch(`*[_type == "post"]{ slug, _updatedAt }`);
 * 
 * Prisma/Database:
 *   return await prisma.post.findMany({ where: { published: true } });
 * 
 * MDX/File-based:
 *   const files = fs.readdirSync('./content/posts');
 *   return files.map(file => parsePost(file));
 */
async function getBlogPosts(): Promise<BlogPost[]> {
  // OPTION 1: Fetch from API
  try {
    const res = await fetch(`${SITE_URL}/api/posts`, {
      cache: 'no-store', // CRITICAL: Prevent caching
      next: { revalidate: 0 },
    });
    
    if (!res.ok) {
      console.error('Failed to fetch posts for sitemap');
      return [];
    }
    
    return res.json();
  } catch (error) {
    console.error('Sitemap post fetch error:', error);
    return [];
  }
  
  // OPTION 2: Static list (for testing)
  // return [
  //   { slug: 'first-post', updatedAt: '2024-12-01', publishedAt: '2024-12-01' },
  //   { slug: 'second-post', updatedAt: '2024-12-15', publishedAt: '2024-12-10' },
  // ];
}

// ============================================================================
// Static Pages - UPDATE FOR YOUR SITE STRUCTURE
// ============================================================================

const staticPages = [
  {
    path: '',
    changeFrequency: 'daily' as const,
    priority: 1.0,
  },
  {
    path: '/blog',
    changeFrequency: 'daily' as const,
    priority: 0.9,
  },
  {
    path: '/about',
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  },
  {
    path: '/contact',
    changeFrequency: 'yearly' as const,
    priority: 0.5,
  },
];

// ============================================================================
// Sitemap Generator
// ============================================================================

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = SITE_URL.replace(/\/$/, '');
  
  // Generate static page entries
  const staticEntries = staticPages.map(page => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
  
  // Fetch and generate blog post entries
  const posts = await getBlogPosts();
  
  const blogEntries = posts.map(post => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt || post.publishedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));
  
  // Combine all entries
  return [...staticEntries, ...blogEntries];
}

// ============================================================================
// Verification Steps
// ============================================================================

/**
 * After deploying, verify with:
 * 
 * 1. Direct access:
 *    curl -I https://your-site.com/sitemap.xml
 *    Expected: 200 OK, Content-Type: application/xml
 * 
 * 2. Check content:
 *    curl https://your-site.com/sitemap.xml | head -30
 *    Expected: Valid XML with <urlset> and <url> elements
 * 
 * 3. Google Search Console:
 *    - Go to Sitemaps section
 *    - Submit: sitemap.xml
 *    - Status should change to "Success" within minutes
 * 
 * 4. URL Inspection:
 *    - Inspect any URL from sitemap
 *    - Click "Request Indexing"
 */
