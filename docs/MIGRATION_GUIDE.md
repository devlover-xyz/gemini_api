# Migration Guide - Test Files Reorganization

## Overview
Semua file test telah dipindahkan ke folder `tests/` untuk organisasi yang lebih baik.

## Changes Made

### Before (Old Structure)
```
gemini_api/
├── test-single-tab.ts
├── test-recaptcha.ts
├── test-stealth.ts
├── test-google-simple.ts
├── test-google-with-solver.ts
├── test-random-ua.ts
├── test-simple.ts
├── test-ua-simple.ts
└── src/
```

### After (New Structure)
```
gemini_api/
├── tests/
│   ├── README.md                    # Test documentation
│   ├── run-all.ts                   # Test runner
│   ├── test-single-tab.ts           # ✅ Moved
│   ├── test-recaptcha.ts            # ✅ Moved
│   ├── test-stealth.ts              # ✅ Moved
│   ├── test-google-simple.ts        # ✅ Moved
│   ├── test-google-with-solver.ts   # ✅ Moved
│   ├── test-random-ua.ts            # ✅ Moved
│   ├── test-simple.ts               # ✅ Moved
│   └── test-ua-simple.ts            # ✅ Moved
└── src/
```

## Import Path Changes

All test files that imported from `./src/` have been updated to `../src/`:

### Before
```typescript
import { GoogleRecaptchaDemoScraper } from './src/scrapers/RecaptchaTestScraper';
```

### After
```typescript
import { GoogleRecaptchaDemoScraper } from '../src/scrapers/RecaptchaTestScraper';
```

## Updated Files

### Test Files (Import Paths Fixed)
1. ✅ `test-recaptcha.ts`
2. ✅ `test-single-tab.ts`
3. ✅ `test-google-simple.ts`
4. ✅ `test-google-with-solver.ts`
5. ✅ `test-random-ua.ts`
6. ✅ `test-simple.ts`

### Test Files (No Changes Needed)
- `test-stealth.ts` - Uses external packages only
- `test-ua-simple.ts` - Uses external packages only

### Documentation Updated
1. ✅ `README.md` - Updated project structure & added Testing section
2. ✅ `RECAPTCHA_FIX.md` - Updated test commands
3. ✅ `TAB_OPTIMIZATION_SUMMARY.md` - Updated test commands
4. ✅ `CHANGELOG_TAB_FIX.md` - Updated test commands

### New Files Created
1. ✅ `tests/README.md` - Comprehensive test documentation
2. ✅ `tests/run-all.ts` - Test runner script

## How to Run Tests

### Old Way (No Longer Works)
```bash
# ❌ These commands will fail
bun test-single-tab.ts
bun test-recaptcha.ts
```

### New Way (Correct)
```bash
# ✅ Use tests/ prefix
bun tests/test-single-tab.ts
bun tests/test-recaptcha.ts

# ✅ Or run all tests
bun tests/run-all.ts
```

## Migration Checklist

- [x] Create `tests/` folder
- [x] Move all `test-*.ts` files to `tests/`
- [x] Update import paths in test files
- [x] Create `tests/README.md`
- [x] Create `tests/run-all.ts`
- [x] Update main `README.md`
- [x] Update all documentation files
- [x] Verify all tests still work

## Benefits

### 1. Better Organization
- All tests in one dedicated folder
- Easy to find and manage
- Clear separation from source code

### 2. Easier Testing
- Run all tests with single command
- Dedicated test documentation
- Test runner for automation

### 3. Cleaner Root Directory
- No test files cluttering root
- Professional project structure
- Easier for new contributors

## Verification

Run this to verify the migration:
```bash
# Should show 10 files in tests folder
ls -1 tests/ | wc -l

# Should run without errors
bun tests/test-single-tab.ts
bun tests/test-ua-simple.ts
```

Expected output:
```
📊 Number of tabs/pages: 1
✅ SUCCESS: Only 1 tab opened (efficient!)
```

## Notes

- All tests continue to work exactly as before
- Only the location and import paths changed
- No changes to test logic or functionality
- Backward compatibility: N/A (tests are not part of API)

## Support

If you encounter issues:
1. Check import paths are `../src/` not `./src/`
2. Run tests from project root: `bun tests/test-name.ts`
3. See `tests/README.md` for detailed documentation

---

**Migration Date:** 2025-10-07
**Status:** ✅ COMPLETED
