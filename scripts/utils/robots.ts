// scripts/utils/robots.ts
// Robots.txt parsing helpers for validators and crawlers (Google REP behavior)

export type RobotsRule = {
  type: 'allow' | 'disallow';
  path: string;
};

export type RobotsGroup = {
  agents: string[];
  rules: RobotsRule[];
};

const ROBOTS_DIRECTIVE = {
  userAgent: 'user-agent',
  allow: 'allow',
  disallow: 'disallow',
  sitemap: 'sitemap',
} as const;

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pathMatches = (pattern: string, path: string): boolean => {
  if (!pattern) return false;
  let rawPattern = pattern.trim();
  let anchored = false;
  if (rawPattern.endsWith('$')) {
    anchored = true;
    rawPattern = rawPattern.slice(0, -1);
  }
  const regexBody = escapeRegex(rawPattern).replace(/\\\*/g, '.*');
  const regex = anchored ? new RegExp(`^${regexBody}$`) : new RegExp(`^${regexBody}`);
  return regex.test(path);
};

export const parseRobotsTxt = (text: string): RobotsGroup[] => {
  const groups: RobotsGroup[] = [];
  let currentGroup: RobotsGroup | null = null;
  let groupHasRules = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === ROBOTS_DIRECTIVE.userAgent) {
      if (!currentGroup || groupHasRules) {
        currentGroup = { agents: [], rules: [] };
        groups.push(currentGroup);
        groupHasRules = false;
      }
      if (value) currentGroup.agents.push(value.toLowerCase());
      continue;
    }

    if (key === ROBOTS_DIRECTIVE.allow || key === ROBOTS_DIRECTIVE.disallow) {
      if (!currentGroup) continue;
      currentGroup.rules.push({
        type: key === ROBOTS_DIRECTIVE.allow ? 'allow' : 'disallow',
        path: value,
      });
      groupHasRules = true;
      continue;
    }

    if (key === ROBOTS_DIRECTIVE.sitemap) {
      continue;
    }
  }

  return groups;
};

export const pickRobotsGroup = (userAgent: string, groups: RobotsGroup[]): RobotsGroup | null => {
  const ua = userAgent.toLowerCase();
  let bestGroup: RobotsGroup | null = null;
  let bestMatchLength = -1;

  for (const group of groups) {
    for (const agent of group.agents) {
      if (!agent) continue;
      if (agent === '*') {
        if (bestMatchLength < 1) {
          bestGroup = group;
          bestMatchLength = 1;
        }
        continue;
      }
      if (ua.includes(agent) && agent.length > bestMatchLength) {
        bestGroup = group;
        bestMatchLength = agent.length;
      }
    }
  }

  return bestGroup;
};

export const evaluateRobotsRules = (
  path: string,
  rules: RobotsRule[]
): { allowed: boolean; matchedRule?: RobotsRule; matchedLength: number } => {
  let bestRule: RobotsRule | null = null;
  let bestLength = -1;

  for (const rule of rules) {
    if (rule.type === 'disallow' && rule.path === '') continue;
    if (!pathMatches(rule.path, path)) continue;

    const ruleLength = rule.path.length;
    if (ruleLength > bestLength) {
      bestRule = rule;
      bestLength = ruleLength;
    } else if (ruleLength === bestLength && bestRule && bestRule.type === 'disallow' && rule.type === 'allow') {
      bestRule = rule;
    }
  }

  if (!bestRule) {
    return { allowed: true, matchedLength: 0 };
  }

  return {
    allowed: bestRule.type === 'allow',
    matchedRule: bestRule,
    matchedLength: bestLength,
  };
};

export const isAllowedByRules = (path: string, rules: RobotsRule[]): boolean =>
  evaluateRobotsRules(path, rules).allowed;
