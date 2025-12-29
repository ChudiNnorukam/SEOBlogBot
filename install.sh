#!/bin/bash
# SEOBlogBot v1.1 Installation Script

set -e

SKILL_DIR="${HOME}/.claude/skills/seo-blog-bot"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║   SEOBlogBot v1.1 Installation                                ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Create skill directory
echo "Creating skill directory: ${SKILL_DIR}"
mkdir -p "${SKILL_DIR}"

# Copy files
echo "Copying files..."
cp -r "${SCRIPT_DIR}"/* "${SKILL_DIR}/"

# Remove install script from installed location
rm -f "${SKILL_DIR}/install.sh"

# Verify installation
echo ""
echo "Verifying installation..."

required_files=(
    "SKILL.md"
    "lib/types.ts"
    "lib/seo-patterns.ts"
    "scripts/seo-preflight.ts"
    "scripts/validators/index.ts"
)

all_present=true
for file in "${required_files[@]}"; do
    if [ -f "${SKILL_DIR}/${file}" ]; then
        echo "  ✅ ${file}"
    else
        echo "  ❌ ${file} - MISSING"
        all_present=false
    fi
done

echo ""

if [ "$all_present" = true ]; then
    echo "✅ Installation complete!"
    echo ""
    echo "Usage:"
    echo "  1. Quick audit:"
    echo "     npx ts-node ${SKILL_DIR}/scripts/seo-preflight.ts https://your-site.com"
    echo ""
    echo "  2. With Claude Code:"
    echo "     claude \"Read ${SKILL_DIR}/SKILL.md then audit this blog\""
    echo ""
    echo "  3. Multi-page crawl:"
    echo "     npx ts-node ${SKILL_DIR}/scripts/seo-preflight.ts https://your-site.com --crawl"
else
    echo "❌ Installation incomplete - some files missing"
    echo "Please try reinstalling or check the archive contents"
    exit 1
fi
