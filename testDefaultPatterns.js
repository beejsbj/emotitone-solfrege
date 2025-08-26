/**
 * Test script to verify default patterns integration
 * Run this in the browser console to test the pattern system
 */

async function testDefaultPatterns() {
  console.log('🧪 Testing Default Patterns Integration...\n');
  
  // Check if patternDebug is available
  if (typeof window.patternDebug === 'undefined') {
    console.error('❌ Pattern debug utilities not available. Make sure you are in development mode.');
    return;
  }
  
  const patternDebug = window.patternDebug;
  
  // 1. Check current pattern service state
  console.group('📊 1. Current Pattern Service State');
  const stats = patternDebug.stats();
  console.log('Total patterns:', stats.totalPatterns);
  console.log('Saved patterns:', stats.savedPatterns);
  console.log('History size:', stats.historySize);
  console.groupEnd();
  
  // 2. Get all patterns and check for defaults
  console.group('🎵 2. Checking for Default Patterns');
  const allPatterns = patternDebug.service.getPatterns();
  const defaultPatterns = allPatterns.filter(p => p.isDefault === true);
  const userPatterns = allPatterns.filter(p => !p.isDefault);
  
  console.log(`Total patterns: ${allPatterns.length}`);
  console.log(`Default patterns: ${defaultPatterns.length}`);
  console.log(`User patterns: ${userPatterns.length}`);
  
  if (defaultPatterns.length > 0) {
    console.log('\n✅ Default patterns found! Sample:');
    const sampleDefaults = defaultPatterns.slice(0, 3);
    sampleDefaults.forEach(p => {
      console.log(`  - ${p.name} (${p.patternType}): ${p.noteCount} notes`);
    });
  } else {
    console.log('❌ No default patterns found!');
  }
  console.groupEnd();
  
  // 3. Test filtering
  console.group('🔍 3. Testing Pattern Filtering');
  
  const melodicPatterns = patternDebug.service.getPatterns({ patternType: 'melody' });
  const scalePatterns = patternDebug.service.getPatterns({ patternType: 'scale' });
  const defaultOnly = patternDebug.service.getPatterns({ isDefault: true });
  const userOnly = patternDebug.service.getPatterns({ isDefault: false });
  
  console.log(`Melodic patterns: ${melodicPatterns.length}`);
  console.log(`Scale patterns: ${scalePatterns.length}`);
  console.log(`Default patterns (via filter): ${defaultOnly.length}`);
  console.log(`User patterns (via filter): ${userOnly.length}`);
  console.groupEnd();
  
  // 4. Test helper methods
  console.group('🛠️ 4. Testing Helper Methods');
  
  const defaultPatternsHelper = patternDebug.service.getDefaultPatterns();
  const userPatternsHelper = patternDebug.service.getUserPatterns();
  
  console.log(`getDefaultPatterns(): ${defaultPatternsHelper.length} patterns`);
  console.log(`getUserPatterns(): ${userPatternsHelper.length} patterns`);
  console.groupEnd();
  
  // 5. Check for duplicates
  console.group('🔄 5. Checking for Duplicate Default Patterns');
  
  const patternNames = defaultPatterns.map(p => p.name);
  const uniqueNames = new Set(patternNames);
  
  if (patternNames.length === uniqueNames.size) {
    console.log('✅ No duplicate default patterns found');
  } else {
    console.log(`⚠️ Found ${patternNames.length - uniqueNames.size} duplicate patterns`);
    const duplicates = patternNames.filter((name, index) => patternNames.indexOf(name) !== index);
    console.log('Duplicates:', [...new Set(duplicates)]);
  }
  console.groupEnd();
  
  // 6. Test deletion protection
  console.group('🗑️ 6. Testing Default Pattern Properties');
  
  const testPattern = defaultPatterns[0];
  if (testPattern) {
    console.log(`Sample pattern: ${testPattern.name}`);
    console.log(`  - isSaved: ${testPattern.isSaved} (should be true)`);
    console.log(`  - isDefault: ${testPattern.isDefault} (should be true)`);
    console.log(`  - Will not be auto-purged: ${testPattern.isSaved || testPattern.isDefault}`);
  }
  console.groupEnd();
  
  // Summary
  console.group('📋 Test Summary');
  const passed = defaultPatterns.length > 0 && 
                 defaultPatternsHelper.length === defaultPatterns.length &&
                 patternNames.length === uniqueNames.size;
  
  if (passed) {
    console.log('✅ All tests passed! Default patterns are working correctly.');
    console.log(`Found ${defaultPatterns.length} default patterns loaded into the system.`);
  } else {
    console.log('❌ Some tests failed. Check the details above.');
  }
  console.groupEnd();
  
  return {
    totalPatterns: allPatterns.length,
    defaultPatterns: defaultPatterns.length,
    userPatterns: userPatterns.length,
    passed
  };
}

// Export for use in browser console
window.testDefaultPatterns = testDefaultPatterns;

console.log('🎵 Default Patterns Test Script Loaded!');
console.log('Run testDefaultPatterns() to test the integration.');
