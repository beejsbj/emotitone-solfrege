# High Priority: Component Fixes

## 🎯 Goal

Fix critical broken components that are essential for the application's functionality:

1. Fix and rename `AutoDebugPanel` (shows NaN values and has poor name)
2. Fix `FloatingPopup` (visibility and interaction issues)

This phase focuses exclusively on these component fixes without touching other systems.

## 📋 Background

Two key UI components are currently broken:

1. **AutoDebugPanel**: Shows NaN values for configuration options and has a confusing name
2. **FloatingPopup**: Not working properly due to integration issues with stores

## 🔧 Implementation Steps

### Step 1: Fix and Rename AutoDebugPanel

**Rename the component:**

1. Rename file: `src/components/AutoDebugPanel.vue` → `src/components/ConfigPanel.vue`
2. Find and update all import references to use the new name

**Fix NaN Issues:**
Investigate and fix these key areas:

- `configSections` computed property
- `getNumberMin`, `getNumberMax`, and `getNumberStep` functions
- `formatValue` function
- `updateValue` method
- How the component reads from the `visualConfig` store

**Common NaN causes to check:**

- Undefined values from store
- Incorrect type conversions
- Missing fallback values
- Incorrect property access

### Step 2: Fix FloatingPopup Functionality

**Debug visibility logic:**

1. Check `shouldShowPopup` computed property
2. Verify dependencies on the `music` store
3. Ensure proper reactive connections

**Verify event handling:**

1. Check store subscriptions and event listeners
2. Verify popup appears when notes are played
3. Test configuration integration with visual config store

**Check positioning and styling:**

1. Ensure popup appears in correct location
2. Verify styling is applied properly
3. Test popup dismissal behavior

### Step 3: Test Integration

Test both components with:

- Different screen sizes
- Various configuration values
- Note playing scenarios
- Store state changes

## ✅ Verification

### ConfigPanel Testing:

- [ ] Displays correct numerical values (no NaN)
- [ ] All knobs and controls are functional
- [ ] Changing values updates application visuals
- [ ] Component is properly renamed and all references updated

### FloatingPopup Testing:

- [ ] Appears when notes are played
- [ ] Shows correct information and styling
- [ ] Disappears appropriately
- [ ] Responds to configuration changes

### Technical Verification:

- [ ] `npm run type-check` passes
- [ ] `npm run build` succeeds
- [ ] No console errors when using components
- [ ] All imports and references are correct

## 📦 Completion

This phase is complete when both components are fully functional, properly named, and all verification steps pass. The components should integrate seamlessly with the rest of the application.
