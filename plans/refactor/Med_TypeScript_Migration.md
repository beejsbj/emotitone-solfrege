# Medium Priority: TypeScript Migration

## 🎯 Goal

Convert any remaining `.js` files to `.ts` files to achieve 100% TypeScript coverage in the source code. This will improve type safety, IDE support, and code consistency across the entire codebase.

## 📋 Background

While most of the codebase has been converted to TypeScript, there may still be some `.js` files that need to be migrated. This creates inconsistency and potential type safety issues.

## 🔧 Implementation Steps

### Step 1: Identify JavaScript Files

Find all `.js` files in the source directory:

```bash
find src -name "*.js" -type f
```

**Exclusions:**

- Don't convert files in `src/lib/` that are external dependencies
- Focus on files that are part of the application logic

### Step 2: Convert Files to TypeScript

For each `.js` file found:

1. **Rename**: Change `.js` extension to `.ts`
2. **Add type annotations**: Add TypeScript type annotations where needed
3. **Fix type errors**: Address any TypeScript compilation errors
4. **Add interfaces**: Create proper TypeScript interfaces for data structures
5. **Update imports**: Ensure all imports use the new `.ts` file paths

### Step 3: Common Conversion Tasks

**Function parameters and return types:**

```typescript
// Before
function processData(data) {
  return data.map((item) => item.value);
}

// After
function processData(data: DataItem[]): number[] {
  return data.map((item) => item.value);
}
```

**Variable declarations:**

```typescript
// Add type annotations where TypeScript can't infer
const config: AppConfig = getConfig();
const items: string[] = [];
```

**Object interfaces:**

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}
```

**Array types:**

```typescript
// Specify array element types
const notes: string[] = ["C", "D", "E"];
const frequencies: number[] = [261.63, 293.66, 329.63];
```

### Step 4: Update Import References

1. **Find all imports**: Search for imports that reference the old `.js` files
2. **Update import paths**: Change import paths to use the new `.ts` files
3. **Update re-exports**: Fix any re-exports in index files

Example:

```typescript
// Before
import { helper } from "./utils/helper.js";

// After
import { helper } from "./utils/helper";
```

## ✅ Verification

1. **No JavaScript Files**: Verify no `.js` files remain in `src/` (except external libraries)
2. **Type Check**: `npm run type-check` must pass without errors
3. **Build**: `npm run build` must succeed
4. **Import Check**: All imports are correctly updated and working
5. **Runtime Test**: Application runs without errors

## 📦 Completion

This phase is complete when all source files are TypeScript, type checking passes, and the application builds and runs successfully.
