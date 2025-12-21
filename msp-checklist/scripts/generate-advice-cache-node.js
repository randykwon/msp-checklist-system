#!/usr/bin/env node

const { getAdviceGenerator } = require('../lib/advice-generator');
const { getAdviceCacheService } = require('../lib/advice-cache');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const generator = getAdviceGenerator();
  const cacheService = getAdviceCacheService();

  try {
    switch (command) {
      case 'generate':
        console.log('🚀 Starting full advice cache generation...');
        const result = await generator.generateAndCacheAllAdvice();
        console.log(`✅ Generated advice for ${result.totalItems} items`);
        console.log(`📅 Version: ${result.version}`);
        console.log(`🇰🇷 Korean advice: ${result.koAdvice.length} items`);
        console.log(`🇺🇸 English advice: ${result.enAdvice.length} items`);
        break;

      case 'list':
        console.log('📋 Available cache versions:');
        const versions = cacheService.getCacheVersions();
        if (versions.length === 0) {
          console.log('  No cache versions found.');
        } else {
          versions.forEach((version, index) => {
            const isLatest = index === 0 ? ' (latest)' : '';
            console.log(`  ${version.version}${isLatest}`);
            console.log(`    Created: ${version.createdAt}`);
            console.log(`    Items: ${version.totalItems}`);
            console.log(`    Description: ${version.description}`);
            console.log('');
          });
        }
        break;

      case 'stats':
        const version = args[1];
        console.log(`📊 Cache statistics${version ? ` for version ${version}` : ' (all versions)'}`);
        const stats = cacheService.getCacheStats(version) as any;
        console.log(`  Total entries: ${stats.total}`);
        console.log(`  Korean entries: ${stats.korean}`);
        console.log(`  English entries: ${stats.english}`);
        console.log(`  Unique items: ${stats.unique_items}`);
        break;

      case 'export':
        const exportVersion = args[1];
        if (!exportVersion) {
          console.error('❌ Please specify a version to export');
          process.exit(1);
        }
        const exportPath = cacheService.exportCacheToFile(exportVersion);
        console.log(`💾 Cache exported to: ${exportPath}`);
        break;

      case 'import':
        const importPath = args[1];
        if (!importPath) {
          console.error('❌ Please specify a file path to import');
          process.exit(1);
        }
        const success = cacheService.importCacheFromFile(importPath);
        if (success) {
          console.log(`✅ Cache imported from: ${importPath}`);
        } else {
          console.error(`❌ Failed to import cache from: ${importPath}`);
          process.exit(1);
        }
        break;

      case 'test':
        console.log('🧪 Testing cache service...');
        const testItem = 'BUSP-001';
        const cachedAdvice = cacheService.getCachedAdvice(testItem, 'ko');
        if (cachedAdvice) {
          console.log(`✅ Found cached advice for ${testItem}`);
          console.log(`   Version: ${cachedAdvice.version}`);
          console.log(`   Created: ${cachedAdvice.createdAt}`);
          console.log(`   Advice length: ${cachedAdvice.advice.length} chars`);
          console.log(`   Virtual evidence length: ${cachedAdvice.virtualEvidence.length} chars`);
        } else {
          console.log(`❌ No cached advice found for ${testItem}`);
        }
        break;

      default:
        console.log(`
🎯 MSP Advice Cache Management

Usage: npm run cache <command> [options]

Commands:
  generate              Generate advice cache for all assessment items
  list                  List all available cache versions
  stats [version]       Show cache statistics (optionally for specific version)
  export <version>      Export cache version to JSON file
  import <file>         Import cache from JSON file
  test                  Test cache service functionality

Examples:
  npm run cache generate
  npm run cache list
  npm run cache stats 20241217_143022
  npm run cache export 20241217_143022
  npm run cache import cache/advice_cache_20241217_143022.json
        `);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    cacheService.close();
  }
}

main();