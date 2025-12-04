# Publishing Guide

## Pre-Publishing Checklist

✅ Package.json configured with:
- Repository URLs pointing to Contra-Collective
- Files field limiting what gets published
- prepublishOnly script to auto-build
- Engines field specifying Node >= 16

✅ .npmignore created to exclude source files
✅ README updated with npm installation instructions
✅ Git repository initialized

## Steps to Publish to npm

### 1. Create GitHub Repository

First, create the repository on GitHub under Contra-Collective:

```bash
# Create repo at: https://github.com/Contra-Collective/shopify-monitor-cli
# Then connect your local repo:

git remote add origin git@github.com:Contra-Collective/shopify-monitor-cli.git
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### 2. Set Up npm Account

If you haven't already:

```bash
# Login to npm (create account at https://www.npmjs.com if needed)
npm login

# Verify you're logged in
npm whoami
```

### 3. Update Author Information (Optional)

Edit `package.json` and add your author info:

```json
"author": "Contra-Collective <contact@contra-collective.com>",
```

Or:

```json
"author": {
  "name": "Contra-Collective",
  "email": "contact@contra-collective.com",
  "url": "https://github.com/Contra-Collective"
},
```

### 4. Test the Package Locally

Before publishing, test that everything works:

```bash
# Create a test package
npm pack

# This creates shopify-changelog-monitor-1.0.0.tgz
# Install it globally to test
npm install -g ./shopify-changelog-monitor-1.0.0.tgz

# Test the CLI
shopify-monitor --help
shopify-monitor list --limit 3

# Uninstall test version
npm uninstall -g shopify-changelog-monitor

# Clean up
rm shopify-changelog-monitor-1.0.0.tgz
```

### 5. Publish to npm

```bash
# Make sure the project is built
npm run build

# Publish to npm (the prepublishOnly script will auto-build)
npm publish

# For first-time publish, you might need:
npm publish --access public
```

### 6. Verify Publication

After publishing:

```bash
# Check on npm
npm view shopify-changelog-monitor

# Test global installation
npm install -g shopify-changelog-monitor
shopify-monitor --help
```

### 7. Add npm Badge to README

Add this to the top of your README.md:

```markdown
[![npm version](https://badge.fury.io/js/shopify-changelog-monitor.svg)](https://www.npmjs.com/package/shopify-changelog-monitor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
```

## Version Management

When making updates:

```bash
# Update version (patch, minor, or major)
npm version patch   # 1.0.0 -> 1.0.1
npm version minor   # 1.0.0 -> 1.1.0
npm version major   # 1.0.0 -> 2.0.0

# This creates a git tag automatically
# Push the tag to GitHub
git push && git push --tags

# Publish the new version
npm publish
```

## Publishing Scoped Package (Alternative)

If you want to publish under the @contra-collective scope:

1. Change package name in `package.json`:
```json
"name": "@contra-collective/shopify-changelog-monitor"
```

2. Update the bin command name if desired:
```json
"bin": {
  "shopify-monitor": "dist/cli.js"
}
```

3. Publish:
```bash
npm publish --access public
```

Users would then install with:
```bash
npm install -g @contra-collective/shopify-changelog-monitor
```

## Troubleshooting

### Package name already taken
If "shopify-changelog-monitor" is taken, you can:
1. Use a scoped package: `@contra-collective/shopify-changelog-monitor`
2. Choose a different name: `contra-shopify-monitor`, `shopify-changelog-cli`, etc.

### Permission denied
Make sure you're logged in with `npm login` and have the necessary permissions.

### Build fails during publish
The `prepublishOnly` script will automatically build. Make sure all dependencies are installed:
```bash
npm install
npm run build
```

## Post-Publication

1. **Add topics on GitHub**: Go to the repo and add topics like: shopify, changelog, monitoring, cli, slack, teams
2. **Create a release**: On GitHub, create a release for v1.0.0
3. **Add documentation**: Consider adding more examples and use cases
4. **Monitor issues**: Watch for user feedback and issues on GitHub

## One-Line Quick Publish

Once everything is set up:

```bash
npm version patch && git push && git push --tags && npm publish
```
