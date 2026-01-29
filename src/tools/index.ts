// SEOBlogBot Tools - Registration Hub

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAuditSitemapTool } from './sitemap-audit.js';
import { registerCheckRobotsTool } from './robots-check.js';
import { registerValidateMetaTagsTool } from './meta-validator.js';
import { registerCoreWebVitalsTool } from './core-web-vitals.js';
import { registerIndexingStatusTool } from './indexing-status.js';
import { registerIndexingStatusBatchTool } from './indexing-status-batch.js';
import { registerSchemaGeneratorTool } from './schema-generator.js';
import { registerLighthouseAuditTool } from './lighthouse-audit.js';

export function registerAllTools(server: McpServer): void {
  // Priority 1: HTTP-Only Tools (no auth required)
  registerAuditSitemapTool(server);
  registerCheckRobotsTool(server);
  registerValidateMetaTagsTool(server);

  // Priority 2: API Tools
  registerCoreWebVitalsTool(server);
  registerIndexingStatusTool(server);
  registerIndexingStatusBatchTool(server);
  registerSchemaGeneratorTool(server);
  registerLighthouseAuditTool(server);
}
