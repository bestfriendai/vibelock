# LockerRoom Talk

A React Native app built with Expo SDK 54 for college campus social networking.

## Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- EAS CLI for builds

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Generate package-lock.json (if missing):
   ```bash
   npm run lockfile:update
   ```

### Development

```bash
# Start development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android

# Run web version
npm run web
```

### Building

```bash
# Development build
npm run build:development

# Preview build
npm run build:preview

# Production build
npm run build:production
```

## Troubleshooting

### npm ci Error with Missing Webpack Dependencies

If you encounter errors about missing webpack packages during EAS builds:

1. **Generate lock file locally:**
   ```bash
   npm run install:clean
   ```

2. **Validate dependencies:**
   ```bash
   node scripts/validate-dependencies.js
   ```

3. **Commit the generated package-lock.json:**
   ```bash
   git add package-lock.json
   git commit -m "Add package-lock.json for consistent builds"
   ```

### Common Issues

- **Missing webpack dependencies**: The app supports web builds which require webpack. These are now explicitly declared in devDependencies.
- **Lock file out of sync**: Always commit package-lock.json to ensure consistent builds across environments.
- **EAS Build failures**: The prebuildCommand in eas.json ensures lock file is updated before builds.

### Scripts

- `npm run install:clean` - Clean install with fresh lock file
- `npm run lockfile:update` - Update package-lock.json only
- `npm run prebuild:lockfile` - Pre-build hook for lock file generation
- `node scripts/generate-lockfile.js` - Generate lock file with validation
- `node scripts/validate-dependencies.js` - Validate required dependencies

## Architecture

- **Framework**: Expo SDK 54 with React Native 0.81
- **Navigation**: React Navigation 7
- **State Management**: Zustand
- **Styling**: NativeWind (Tailwind CSS)
- **Backend**: Supabase
- **Monetization**: Google AdMob + RevenueCat
- **Build System**: EAS Build

## Contributing

1. Ensure package-lock.json is up to date
2. Run linting and type checking: `npm run check`
3. Test builds locally before pushing
4. Follow the existing code style and patterns
