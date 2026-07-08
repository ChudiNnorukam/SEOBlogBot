# SEOBlogBot

> An MCP server that brings 8 SEO audit tools directly into Claude Code and Claude Desktop. Audit sitemaps, validate meta tags, analyze Core Web Vitals, and inspect Google Search Console indexing — all from your AI assistant, without leaving your workflow.

## What It Is

SEOBlogBot is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server built for SEO auditing of Next.js App Router blogs. Install it once and call its tools naturally from any Claude session — ask Claude to audit your sitemap, check your robots.txt, or run a Lighthouse checklist, and SEOBlogBot handles the HTTP requests, parsing, and Google API calls in the background.

## Tools

8 SEO tools available as MCP tools inside Claude:

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

## Install

### 1. Clone and build

```bash
git clone https://github.com/ChudiNnorukam/SEOBlogBot.git
cd SEOBlogBot
npm install
npm run build
```

### 2. Add to Claude Code

Create or update `~/.mcp.json` (applies to all Claude Code sessions) or `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "seoblogbot": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/SEOBlogBot/dist/index.js"]
    }
  }
}
```

Replace `/absolute/path/to/SEOBlogBot` with the directory where you cloned the repo. Example: if you cloned to `~/Projects/SEOBlogBot`, use `~/Projects/SEOBlogBot/dist/index.js`.

### 3. Add to Claude Desktop

Open Claude Desktop, go to **Settings > Developer**, and add to the MCP servers config. On macOS the config file is at `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "seoblogbot": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/SEOBlogBot/dist/index.js"]
    }
  }
}
```

For Google Search Console tools, pass the credentials path via `env`:

```json
{
  "mcpServers": {
    "seoblogbot": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/SEOBlogBot/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/your-service-account-key.json"
      }
    }
  }
}
```

### 4. Restart Claude

Quit and relaunch Claude Code or Claude Desktop. The 8 SEO tools are now available in every session.

## Usage

Once installed, ask Claude naturally:

```
Audit the sitemap at https://example.com

Check the robots.txt for https://myblog.com

Validate meta tags on https://myblog.com/my-post

Analyze Core Web Vitals for https://myblog.com (mobile)

Generate schema recommendations for https://myblog.com/about

Run Lighthouse checklist on https://myblog.com (mobile)
```

## Google Search Console Setup

The `check-indexing-status` and `check-indexing-status-batch` tools require a Google Cloud service account with Search Console access.

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the **Search Console API**

### Step 2: Create Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name it (e.g., "seoblogbot")
4. Click **Create and Continue** (skip optional permissions)
5. Click **Done**

### Step 3: Download JSON Key

1. Click on your new service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** and download

### Step 4: Add Service Account to Search Console

1. Copy the service account email (ends with `@...iam.gserviceaccount.com`)
2. Go to [Google Search Console](https://search.google.com/search-console)
3. Select your property
4. Go to **Settings** > **Users and permissions**
5. Click **Add user**, paste the email, set permission to **Full** or **Restricted**

### Step 5: Configure Credentials

```bash
# Option 1: environment variable
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-service-account-key.json

# Option 2: in the MCP config (recommended for Claude Desktop)
# see the "env" block in the install section above
```

## PageSpeed API Key (Optional)

Without a key, PageSpeed Insights allows 25,000 requests/day — usually sufficient. To raise the limit:

1. Go to [Google Cloud Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** > **API Key**
3. Restrict the key to **PageSpeed Insights API**
4. Set the environment variable:

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

**"Google authentication not configured"**
Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account JSON file path.

**"Access denied" on GSC**
Ensure the service account email is added as a user in Search Console property settings with at least Restricted permission.

**"Property not found"**
The `siteUrl` must match exactly what is in Search Console, including protocol, trailing slash, and subdomain:
- `https://example.com/` (with trailing slash)
- `https://www.example.com/` vs `https://example.com/` are different properties

## License

MIT — see [LICENSE](LICENSE)
