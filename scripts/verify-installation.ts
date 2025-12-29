#!/usr/bin/env npx ts-node
/**
 * SEOBlogBot Installation Verification
 *
 * Verifies that all required files are present and the skill is correctly installed.
 *
 * Usage:
 *   npx ts-node scripts/verify-installation.ts
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  critical: boolean;
}

const SKILL_ROOT = path.resolve(__dirname, '..');

const REQUIRED_FILES: CheckItem[] = [
  // Core documentation
  { name: 'SKILL.md', path: 'SKILL.md', type: 'file', critical: true },
  { name: 'CLAUDE.md', path: 'CLAUDE.md', type: 'file', critical: true },
  { name: 'ARCHITECTURE.md', path: 'ARCHITECTURE.md', type: 'file', critical: false },

  // Libraries
  { name: 'lib/types.ts', path: 'lib/types.ts', type: 'file', critical: true },
  { name: 'lib/seo-patterns.ts', path: 'lib/seo-patterns.ts', type: 'file', critical: true },
  { name: 'lib/gsc-client.ts', path: 'lib/gsc-client.ts', type: 'file', critical: false },

  // Main script
  { name: 'seo-preflight.ts', path: 'scripts/seo-preflight.ts', type: 'file', critical: true },

  // Validators
  { name: 'validators/index.ts', path: 'scripts/validators/index.ts', type: 'file', critical: true },
  { name: 'validators/validate-sitemap.ts', path: 'scripts/validators/validate-sitemap.ts', type: 'file', critical: true },
  { name: 'validators/validate-crawlability.ts', path: 'scripts/validators/validate-crawlability.ts', type: 'file', critical: true },
  { name: 'validators/validate-meta.ts', path: 'scripts/validators/validate-meta.ts', type: 'file', critical: true },
  { name: 'validators/validate-canonical.ts', path: 'scripts/validators/validate-canonical.ts', type: 'file', critical: true },
  { name: 'validators/validate-schema.ts', path: 'scripts/validators/validate-schema.ts', type: 'file', critical: true },
  { name: 'validators/validate-performance.ts', path: 'scripts/validators/validate-performance.ts', type: 'file', critical: true },

  // Crawlers
  { name: 'crawlers/page-crawler.ts', path: 'scripts/crawlers/page-crawler.ts', type: 'file', critical: true },

  // Gates documentation
  { name: 'gates/', path: 'gates', type: 'directory', critical: false },
  { name: 'gates/crawlability-gate.md', path: 'gates/crawlability-gate.md', type: 'file', critical: false },

  // Commands
  { name: 'commands/', path: 'commands', type: 'directory', critical: false },
  { name: 'commands/audit.md', path: 'commands/audit.md', type: 'file', critical: false },

  // Templates
  { name: 'templates/', path: 'templates', type: 'directory', critical: false },
  { name: 'templates/app-sitemap.ts', path: 'templates/app-sitemap.ts', type: 'file', critical: false },
  { name: 'templates/app-robots.ts', path: 'templates/app-robots.ts', type: 'file', critical: false },
];

function checkFile(item: CheckItem): { passed: boolean; message: string } {
  const fullPath = path.join(SKILL_ROOT, item.path);

  try {
    const stat = fs.statSync(fullPath);

    if (item.type === 'file' && !stat.isFile()) {
      return { passed: false, message: `Expected file, found directory` };
    }

    if (item.type === 'directory' && !stat.isDirectory()) {
      return { passed: false, message: `Expected directory, found file` };
    }

    return { passed: true, message: 'OK' };
  } catch (error) {
    return { passed: false, message: 'Not found' };
  }
}

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   SEOBlogBot Installation Verification                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log(`Skill root: ${SKILL_ROOT}\n`);

  let criticalPassed = 0;
  let criticalFailed = 0;
  let optionalPassed = 0;
  let optionalFailed = 0;

  console.log('Checking required files...\n');

  for (const item of REQUIRED_FILES) {
    const result = checkFile(item);
    const icon = result.passed ? '✅' : (item.critical ? '❌' : '⚠️');

    console.log(`${icon} ${item.name}`);
    if (!result.passed) {
      console.log(`   ${result.message}`);
    }

    if (item.critical) {
      if (result.passed) criticalPassed++;
      else criticalFailed++;
    } else {
      if (result.passed) optionalPassed++;
      else optionalFailed++;
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('VERIFICATION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Critical files:  ${criticalPassed}/${criticalPassed + criticalFailed} passed`);
  console.log(`Optional files:  ${optionalPassed}/${optionalPassed + optionalFailed} passed`);

  if (criticalFailed > 0) {
    console.log('\n🛑 INSTALLATION INCOMPLETE - Missing critical files');
    console.log('\nTo fix, reinstall the skill:');
    console.log('  mkdir -p ~/.claude/skills/seo-blog-bot');
    console.log('  tar -xzf seoblogbot-skill-v1.1.tar.gz -C ~/.claude/skills/seo-blog-bot/');
    process.exit(1);
  } else {
    console.log('\n✅ INSTALLATION VERIFIED - All critical files present');

    if (optionalFailed > 0) {
      console.log(`\n⚠️  ${optionalFailed} optional file(s) missing - some features may be limited`);
    }
  }

  // Test basic functionality
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('FUNCTIONALITY TEST');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Test type imports
    const { DEFAULT_CONFIG } = await import('../lib/types');
    console.log('✅ Types module loads correctly');

    // Test pattern imports
    const { SEO_PATTERNS } = await import('../lib/seo-patterns');
    console.log(`✅ SEO patterns loaded (${Object.keys(SEO_PATTERNS).length} patterns)`);

    // Test validators
    const validators = await import('./validators');
    console.log('✅ Validators module loads correctly');

    console.log('\n✅ All functionality tests passed');
  } catch (error) {
    console.log(`❌ Functionality test failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('USAGE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Quick audit:');
  console.log('  npx ts-node ~/.claude/skills/seo-blog-bot/scripts/seo-preflight.ts https://your-site.com\n');

  console.log('Full crawl:');
  console.log('  npx ts-node ~/.claude/skills/seo-blog-bot/scripts/seo-preflight.ts https://your-site.com --crawl\n');

  console.log('With Claude Code:');
  console.log('  claude "Read ~/.claude/skills/seo-blog-bot/SKILL.md then audit this blog"');
}

main().catch(console.error);
