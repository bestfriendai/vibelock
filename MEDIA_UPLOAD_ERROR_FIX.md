# Media Upload Error Fix

## Problem

The app was experiencing a `CodedError` during media upload with the following error:

```
ERROR  ❌ Failed to upload media:
Code: construct.js
  2 | var setPrototypeOf = require("./setPrototypeOf.js");
  3 | function _construct(t, e, r) {
> 4 |   if (isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments);
```

## Root Cause

The error was caused by:

1. **Worklet Context Issues**: Error class construction failing in React Native Worklets/Reanimated contexts
2. **Babel Runtime Helpers**: Complex class inheritance causing issues with `Reflect.construct`
3. **Error Handling in UI Thread**: Error objects being created in worklet contexts where class construction is limited

## Solution Implemented

### 1. Created Worklet-Safe Error Handling (`src/utils/mediaErrorHandling.ts`)

- **`createMediaError()`**: Creates plain objects instead of class instances in worklet contexts
- **`handleMediaUploadError()`**: Safely categorizes errors without complex class construction
- **`showMediaErrorAlert()`**: Uses `runOnJS` to show alerts from worklet contexts
- **`withMediaErrorHandling()`**: Wrapper for media operations with graceful error handling

### 2. Updated Babel Configuration (`babel.config.js`)

- Added `@babel/plugin-transform-classes` with `loose: true` option
- This helps with class construction issues in worklet contexts
- Plugin is positioned before `react-native-reanimated/plugin` (which must be last)

### 3. Enhanced Error Handling in Components

- **MediaUploadGrid**: Now uses worklet-safe error handling
- **StorageService**: Added fallback error handling for class construction failures
- **ReviewsStore**: Uses new media error handling utilities

### 4. Key Features of the Fix

- **Worklet-Safe**: All error handling works in both JS and UI threads
- **Graceful Degradation**: Failed operations don't crash the app
- **User-Friendly Messages**: Clear error messages for different error types
- **Retry Logic**: Built-in retry mechanism for transient errors

## Files Modified

1. **`src/utils/mediaErrorHandling.ts`** (NEW)
   - Worklet-safe error handling utilities
   - Media-specific error categorization
   - Safe error construction and display

2. **`src/utils/errorHandling.ts`**
   - Added worklet-safe error creation functions
   - Enhanced error handling for worklet contexts

3. **`src/components/MediaUploadGrid.tsx`**
   - Updated to use new media error handling
   - Removed complex error class construction in event handlers

4. **`src/services/storageService.ts`**
   - Added fallback error handling for class construction failures
   - More robust error handling in upload operations

5. **`src/state/reviewsStore.ts`**
   - Updated media upload error handling
   - Uses new media error utilities

6. **`babel.config.js`**
   - Added `@babel/plugin-transform-classes` with loose mode
   - Better handling of class construction in worklet contexts

7. **`src/utils/__tests__/mediaErrorHandling.test.ts`** (NEW)
   - Unit tests for the new error handling utilities

## Testing

- Created comprehensive unit tests for media error handling
- Error handling now works in both JS and worklet contexts
- Media upload operations are more resilient to errors

## Benefits

1. **No More Crashes**: Media upload errors no longer crash the app
2. **Better UX**: Users see clear, actionable error messages
3. **Worklet Compatible**: Error handling works in all React Native contexts
4. **Maintainable**: Centralized error handling for media operations
5. **Debuggable**: Better error logging and categorization

## Usage Example

```typescript
// In a worklet context
const handleError = (error: any) => {
  "worklet";
  const mediaError = createMediaError("Upload failed", "UPLOAD_FAILED", true);
  showMediaErrorAlert(mediaError);
};

// In regular JS context
const uploadMedia = async () => {
  const result = await withMediaErrorHandling(() => storageService.uploadFile(uri, options), "media upload");

  if (!result) {
    // Handle graceful failure
    console.log("Upload failed, continuing without media");
  }
};
```

This fix resolves the `CodedError` issue and provides a robust foundation for media upload error handling throughout the app.
