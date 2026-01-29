# SEOBlogBot

MCP server providing SEO audit tools for Next.js App Router blogs, integrated with Claude Code.

## Features

8 SEO tools available as Claude Code MCP tools:

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `audit-sitemap` | Validate sitemap accessibility and structure | No |
| `check-robots-txt` | Verify robots.txt configuration | No |
| `validate-meta-tags` | Check title, description, OG, Twitter, X-Robots-Tag | No |
| `analyze-core-web-vitals` | LCP, INP, CLS via PageSpeed API | No |
| `check-indexing-status` | Google Search Console URL inspection | Yes |
| `check-indexing-status-batch` | Batch URL inspection (max 20) | Yes |
| `generate-schema-recommendation` | JSON-LD schema suggestions | No |
| `audit-lighthouse` | Lighthouse checklist via PageSpeed Insights | No |

## Quick Start

### 1. Install dependencies

```bash
cd /Users/chudinnorukam/Projects/SEOBlogBot
npm install
```

### 2. Build the server

```bash
npm run build
```

### 3. Add to Claude Code

Add to your `.mcp.json` (in your home directory or project):

```json
{
  "mcpServers": {
    "seoblogbot": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/chudinnorukam/Projects/SEOBlogBot/dist/index.js"]
    }
  }
}
```

### 4. Restart Claude Code

The SEO tools will now be available in your Claude Code sessions.

## Usage Examples

In Claude Code, you can now use these tools:

```
Use audit-sitemap to check https://example.com

Check the robots.txt for https://myblog.com

Validate meta tags on https://myblog.com/my-post

Analyze Core Web Vitals for https://myblog.com (mobile)

Generate schema recommendations for https://myblog.com/about

Run Lighthouse checklist on https://myblog.com (mobile)
```

## Google Search Console Setup

The `check-indexing-status` tool requires Google Cloud authentication:

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable the **Search Console API**

### Step 2: Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g., "seoblogbot")
4. Click **Create and Continue** (skip optional permissions)
5. Click **Done**

### Step 3: Download JSON Key

1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** and download

### Step 4: Add to Search Console

1. Copy the service account email (ends with `@...iam.gserviceaccount.com`)
2. Go to [Google Search Console](https://search.google.com/search-console)
3. Select your property
4. Go to **Settings** > **Users and permissions**
5. Click **Add user**
6. Paste the service account email
7. Set permission to **Full** or **Restricted**

### Step 5: Configure Environment

```bash
# Option 1: Set path to JSON key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-key.json

# Option 2: Add to .mcp.json
{
  "mcpServers": {
    "seoblogbot": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/chudinnorukam/Projects/SEOBlogBot/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/Users/you/.config/seoblogbot/key.json"
      }
    }
  }
}
```

## PageSpeed API Key (Optional)

For higher rate limits on Core Web Vitals analysis:

1. Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** > **API Key**
3. Restrict the key to **PageSpeed Insights API**
4. Add to your environment:

```bash
export PAGESPEED_API_KEY=your-api-key
```

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Type check
npm run typecheck

# Build
npm run build
```

## API Rate Limits

| API | Limit | Notes |
|-----|-------|-------|
| PageSpeed Insights | 25,000/day | Free, no key required |
| GSC URL Inspection | 600/day | Per property |

## Troubleshooting

### "Google authentication not configured"

Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account JSON file path.

### "Access denied" on GSC

Ensure the service account email is added as a user in Search Console property settings.

### "Property not found"

The `siteUrl` must match exactly what's in Search Console, including:
- Protocol (`https://` vs `http://`)
- Trailing slash (`https://example.com/`)
- Subdomain (`https://www.example.com/` vs `https://example.com/`)

## License

MIT
