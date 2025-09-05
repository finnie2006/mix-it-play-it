# GitHub Actions Build Workflow

This repository includes GitHub Actions workflows to automatically build the X-Air Radio Mode application for Windows, macOS, and Linux.

## Workflows

### 1. Build and Release (`build.yml`)
- **Triggers**: 
  - Push to `main` branch
  - Version tags (e.g., `v1.0.0`)
  - Manual dispatch
  - Pull requests to `main`
- **Actions**:
  - Builds for Windows, macOS, and Linux
  - Creates artifacts for each platform
  - Creates GitHub releases for version tags

### 2. Test Build (`test-build.yml`)
- **Triggers**:
  - Push to `develop` or `feature/*` branches
  - Pull requests to `main` or `develop`
- **Actions**:
  - Tests builds for all platforms
  - Runs linting
  - No artifact uploads (testing only)

## Release Process

### Automatic Release
1. Create a version tag: `git tag v1.0.0`
2. Push the tag: `git push origin v1.0.0`
3. GitHub Actions will automatically:
   - Build for all platforms
   - Create a GitHub release
   - Upload all artifacts to the release

### Manual Build
1. Go to the "Actions" tab in your GitHub repository
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Choose the branch and click "Run workflow"

## Build Artifacts

### Windows
- **Setup Installer**: `X-Air Radio Mode-{version}-setup.exe`
- **Portable**: `X-Air Radio Mode-{version}-portable.exe`

### Linux
- **AppImage**: `X-Air Radio Mode-{version}.AppImage`

### macOS
- **DMG**: `X-Air Radio Mode-{version}.dmg`

## Local Development

You can still build locally using the npm scripts:

```bash
# Build for current platform
npm run electron:build:current

# Build for specific platforms
npm run electron:build:linux
npm run electron:build:win
npm run electron:build:mac

# Build portable Windows version
npm run electron:portable
```

## Requirements

The workflows automatically handle all dependencies, but for local development you need:
- Node.js 18+
- npm or yarn
- Platform-specific requirements for cross-compilation (if applicable)

## Troubleshooting

### Build Failures
- Check the Actions tab for detailed logs
- Ensure all dependencies are properly listed in `package.json`
- Verify the build scripts work locally first

### Release Issues
- Ensure you have proper permissions to create releases
- Check that the tag follows semantic versioning (e.g., `v1.0.0`)
- Verify `GITHUB_TOKEN` permissions in repository settings
