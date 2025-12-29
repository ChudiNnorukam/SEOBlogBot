// SEOBlogBot Tools - Registration Hub

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAuditSitemapTool } from './sitemap-audit.js';
import { registerCheckRobotsTool } from './robots-check.js';
import { registerValidateMetaTagsTool } from './meta-validator.js';
import { registerCoreWebVitalsTool } from './core-web-vitals.js';
import { registerIndexingStatusTool } from './indexing-status.js';
import { registerSchemaGeneratorTool } from './schema-generator.js';

export function registerAllTools(server: McpServer): void {
  // Priority 1: HTTP-Only Tools (no auth required)
  registerAuditSitemapTool(server);
  registerCheckRobotsTool(server);
  registerValidateMetaTagsTool(server);

  // Priority 2: API Tools
  registerCoreWebVitalsTool(server);
  registerIndexingStatusTool(server);
  registerSchemaGeneratorTool(server);
}
