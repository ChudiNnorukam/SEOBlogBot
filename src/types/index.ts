// SEOBlogBot Type Definitions

// Base type for MCP structuredContent compatibility
export interface McpCompatible {
  [key: string]: unknown;
}

export interface SitemapAuditResult extends McpCompatible {
  accessible: boolean;
  contentType: string;
  statusCode: number;
  urlCount: number;
  issues: Issue[];
  sampleUrls: string[];
}

export interface RobotsCheckResult extends McpCompatible {
  accessible: boolean;
  statusCode: number;
  content: string | null;
  allowsIndexing: boolean;
  sitemapReferences: string[];
  issues: Issue[];
  userAgentRules: UserAgentRule[];
}

export interface UserAgentRule {
  userAgent: string;
  disallow: string[];
  allow: string[];
}

export interface MetaTagsResult extends McpCompatible {
  url: string;
  title: MetaField;
  description: MetaField;
  openGraph: OpenGraphData;
  twitter: TwitterData;
  canonical: string | null;
  xRobotsTag: string | null;
  issues: string[];
}

export interface MetaField {
  value: string | null;
  length: number;
  status: 'good' | 'too_short' | 'too_long' | 'missing';
}

export interface OpenGraphData {
  title: string | null;
  description: string | null;
  image: string | null;
  type: string | null;
  url: string | null;
}

export interface TwitterData {
  card: string | null;
  title: string | null;
  description: string | null;
  image: string | null;
}

export interface CoreWebVitalsResult extends McpCompatible {
  url: string;
  strategy: 'mobile' | 'desktop';
  performanceScore: number;
  metrics: {
    lcp: MetricResult;
    inp: MetricResult;
    cls: MetricResult;
    fcp: MetricResult;
    ttfb: MetricResult;
  };
  opportunities: Opportunity[];
  diagnostics: Diagnostic[];
}

export interface MetricResult {
  value: number;
  unit: string;
  rating: 'good' | 'needs_improvement' | 'poor';
}

export interface Opportunity {
  id: string;
  title: string;
  savings: string | null;
}

export interface Diagnostic {
  id: string;
  title: string;
  description: string;
}

export interface IndexingStatusResult extends McpCompatible {
  url: string;
  indexingState: 'INDEXED' | 'NOT_INDEXED' | 'UNKNOWN';
  verdict: string;
  lastCrawlTime: string | null;
  crawlability: {
    verdict: string;
    robotsTxtState: string | null;
  };
  indexability: {
    verdict: string;
    reason: string | null;
  };
  mobileFriendly: boolean | null;
  richResults: string[];
}

export interface SchemaRecommendation extends McpCompatible {
  url: string;
  detectedType: string;
  recommendedSchemas: RecommendedSchema[];
  existingSchemas: ExistingSchema[];
}

export interface RecommendedSchema {
  type: string;
  priority: 'required' | 'recommended' | 'optional';
  template: string;
}

export interface ExistingSchema {
  type: string;
  valid: boolean;
  issues: string[];
}

export interface Issue {
  type: 'warning' | 'error';
  message: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}
