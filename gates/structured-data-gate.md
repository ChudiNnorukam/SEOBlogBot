# Gate 3: Structured Data (JSON-LD)

**Severity:** WARNING (deployment proceeds with alert)
**Purpose:** Validates JSON-LD schemas for rich snippets in search results.

---

## What This Gate Validates

| Check | Severity | Pass Criteria |
|-------|----------|---------------|
| JSON-LD Present | MEDIUM | At least one schema on homepage |
| Valid JSON Syntax | HIGH | All JSON-LD blocks parse correctly |
| @context Present | HIGH | Uses `https://schema.org` |
| Required Properties | MEDIUM | Schema type has minimum required fields |
| Article Schema on Posts | MEDIUM | Blog posts have BlogPosting schema |
| Organization Schema | LOW | Homepage has Organization schema |
| Breadcrumb Schema | LOW | Navigation has BreadcrumbList |

---

## Why Structured Data Matters

**Rich Snippets:** Properly implemented JSON-LD can trigger:
- Article cards with author photos
- FAQ accordions in search results
- Breadcrumb trails
- Review stars
- How-to steps

**AI Search Visibility:** LLMs (ChatGPT, Claude, Perplexity) use structured data to:
- Understand content relationships
- Extract factual information
- Cite sources accurately

---

## Common Failure Patterns

### JSONLD_INVALID_SYNTAX - Malformed JSON

**Symptoms:**
- Google Rich Results Test shows parse errors
- Console errors when rendering page

**Root Causes:**
1. **Unescaped quotes in content** - Description contains `"`
2. **Trailing commas** - Invalid in JSON
3. **Missing quotes around keys**

**Diagnosis:**
```bash
# Extract and validate JSON-LD
curl -s https://chudi-blog.vercel.app | \
  grep -oP '(?<=<script type="application/ld\+json">).*?(?=</script>)' | \
  jq .
```

**Fix:**
```typescript
// Always use JSON.stringify for safety
const schema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: post.title,
  description: post.excerpt.replace(/"/g, '\\"'),  // Escape quotes
};

return (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
  />
);
```

### JSONLD_MISSING_CONTEXT - No @context

**Symptoms:**
- Schema not recognized by Google
- No rich snippets appear

**Fix:**
```typescript
// WRONG
const schema = {
  '@type': 'Article',
  headline: 'My Post',
};

// CORRECT
const schema = {
  '@context': 'https://schema.org',  // REQUIRED
  '@type': 'Article',
  headline: 'My Post',
};
```

### JSONLD_MISSING_REQUIRED - Required Fields Missing

**BlogPosting required fields:**
- `headline` (title)
- `author` (with @type Person or Organization)
- `datePublished`
- `image`

**Diagnosis:**
```bash
# Use Google Rich Results Test
# https://search.google.com/test/rich-results?url=https://chudi-blog.vercel.app/blog/your-post
```

**Fix - Complete BlogPosting:**
```typescript
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  
  // Required
  headline: post.title,
  image: post.featuredImage,
  datePublished: post.publishedAt,
  
  // Strongly recommended
  dateModified: post.updatedAt,
  author: {
    '@type': 'Person',
    name: post.author.name,
    url: `https://chudi-blog.vercel.app/about`,
  },
  
  // Recommended
  description: post.excerpt,
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
    '@id': `https://chudi-blog.vercel.app/blog/${post.slug}`,
  },
};
```

---

## Validation Script

```typescript
// Gate 3 validation

interface SchemaValidation {
  type: string;
  hasContext: boolean;
  requiredFields: string[];
  missingFields: string[];
  isValid: boolean;
}

async function runStructuredDataGate(baseUrl: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // Extract all JSON-LD blocks
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const matches = [...html.matchAll(jsonLdRegex)];
    
    if (matches.length === 0) {
      results.push({
        name: 'JSON-LD Presence',
        status: 'WARNING',
        severity: 'MEDIUM',
        message: 'No structured data found',
        fix: 'Add JSON-LD schemas for Organization, WebSite, and articles',
      });
      return results;
    }
    
    results.push({
      name: 'JSON-LD Presence',
      status: 'PASSED',
      severity: 'MEDIUM',
      message: `${matches.length} schema(s) found`,
    });
    
    // Validate each schema
    const schemas: any[] = [];
    for (const match of matches) {
      try {
        const parsed = JSON.parse(match[1].trim());
        schemas.push(parsed);
      } catch (e) {
        results.push({
          name: 'JSON-LD Syntax',
          status: 'FAILED',
          severity: 'HIGH',
          message: `Invalid JSON: ${e instanceof Error ? e.message : 'Parse error'}`,
          fix: 'Check for unescaped quotes or trailing commas',
        });
      }
    }
    
    // Check @context
    const missingContext = schemas.filter(s => !s['@context']);
    if (missingContext.length > 0) {
      results.push({
        name: 'Schema @context',
        status: 'FAILED',
        severity: 'HIGH',
        message: `${missingContext.length} schema(s) missing @context`,
        fix: 'Add "@context": "https://schema.org" to all schemas',
      });
    }
    
    // Check for recommended types
    const types = schemas.map(s => s['@type']).flat().filter(Boolean);
    
    const recommendedForHomepage = ['Organization', 'WebSite'];
    const missingRecommended = recommendedForHomepage.filter(t => !types.includes(t));
    
    if (missingRecommended.length > 0) {
      results.push({
        name: 'Recommended Schemas',
        status: 'WARNING',
        severity: 'LOW',
        message: `Consider adding: ${missingRecommended.join(', ')}`,
      });
    }
    
    // Validate required fields per type
    for (const schema of schemas) {
      const type = schema['@type'];
      const validation = validateSchemaFields(type, schema);
      
      if (validation.missingFields.length > 0) {
        results.push({
          name: `${type} Required Fields`,
          status: 'WARNING',
          severity: 'MEDIUM',
          message: `Missing: ${validation.missingFields.join(', ')}`,
          fix: `Add required fields to ${type} schema`,
        });
      }
    }
    
  } catch (error) {
    results.push({
      name: 'Structured Data Analysis',
      status: 'FAILED',
      severity: 'HIGH',
      message: error instanceof Error ? error.message : 'Analysis failed',
    });
  }
  
  return results;
}

function validateSchemaFields(type: string, schema: any): SchemaValidation {
  const requiredFieldsByType: Record<string, string[]> = {
    'BlogPosting': ['headline', 'author', 'datePublished', 'image'],
    'Article': ['headline', 'author', 'datePublished', 'image'],
    'Organization': ['name', 'url'],
    'WebSite': ['name', 'url'],
    'Person': ['name'],
    'BreadcrumbList': ['itemListElement'],
    'FAQPage': ['mainEntity'],
  };
  
  const required = requiredFieldsByType[type] || [];
  const missing = required.filter(field => !schema[field]);
  
  return {
    type,
    hasContext: !!schema['@context'],
    requiredFields: required,
    missingFields: missing,
    isValid: missing.length === 0 && !!schema['@context'],
  };
}
```

---

## Complete Schema Templates

### Homepage Schemas

```typescript
// components/HomeSchemas.tsx

export function HomePageSchemas() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Chudi Blog',
    url: 'https://chudi-blog.vercel.app',
    logo: 'https://chudi-blog.vercel.app/logo.png',
    sameAs: [
      'https://twitter.com/chudi',
      'https://github.com/chudi',
      'https://linkedin.com/in/chudi',
    ],
    founder: {
      '@type': 'Person',
      name: 'Chudi Nnorukam',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Chudi Blog',
    url: 'https://chudi-blog.vercel.app',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://chudi-blog.vercel.app/search?q={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
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
    </>
  );
}
```

### Blog Post Schemas

```typescript
// components/ArticleSchemas.tsx

interface ArticleSchemasProps {
  post: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    publishedAt: string;
    updatedAt: string;
    featuredImage: string;
    author: {
      name: string;
      image: string;
    };
    tags: string[];
    wordCount: number;
  };
}

export function ArticleSchemas({ post }: ArticleSchemasProps) {
  const baseUrl = 'https://chudi-blog.vercel.app';
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    image: post.featuredImage,
    url: postUrl,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    wordCount: post.wordCount,
    keywords: post.tags.join(', '),
    author: {
      '@type': 'Person',
      name: post.author.name,
      image: post.author.image,
      url: `${baseUrl}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Chudi Blog',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${baseUrl}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
```

---

## Testing Tools

1. **Google Rich Results Test:** https://search.google.com/test/rich-results
2. **Schema.org Validator:** https://validator.schema.org/
3. **JSON-LD Playground:** https://json-ld.org/playground/

---

## Manual Verification

```bash
# Extract and format JSON-LD
curl -s https://chudi-blog.vercel.app | \
  grep -oP '(?<=<script type="application/ld\+json">)[\s\S]*?(?=</script>)' | \
  head -1 | \
  jq .

# Count schemas
curl -s https://chudi-blog.vercel.app | \
  grep -c 'application/ld+json'

# Validate with Google's API (requires API key)
curl "https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://chudi-blog.vercel.app"}'
```
