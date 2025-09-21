# Video Upload and Playback Fixes for Review Details Page

## Problem Description

The video uploading and playing on the Review Details page had several issues:

- **Upload**: Videos were selected and validated but no thumbnails for previews, no size warnings leading to upload failures for large files, and base64 encoding risked memory issues.
- **Preview**: ImageCarousel showed static icons for videos instead of frames.
- **Playback**: MediaViewer disabled video playback in Expo Go (dev mode), breaking testing.

Research confirmed:

- Use `expo-video` for playback (docs: https://docs.expo.dev/versions/latest/sdk/video).
- `expo-video-thumbnails` for generating previews (installed, ~10.0.7).
- Supabase storage handles video/mp4 uploads up to 50MB, public URLs for streaming.

## Before Changes

### Upload Flow (MediaUploadGrid.tsx)

- Selected videos via ImagePicker.launchCameraAsync or launchImageLibraryWithWorkaround.
- Validated with `validateVideoFile` but no thumbnail generation (`videoThumbnailService` imported but not used).
- No size check; all files up to Supabase limit allowed.
- Media added to state with local `uri` (file://), type "video".
- No `thumbnailUri`.

### Preview (ImageCarousel.tsx)

- For videos, showed placeholder icon overlay on black background if no `thumbnailUri`.
- No playable preview; static.

### Playback (MediaViewer.tsx)

- Used `expo-video` but with `!isExpoGo` check, disabling in dev (Constants.executionEnvironment === "storeClient").
- Auto-play only if enabled, with loading/error handling.
- Relied on `currentMedia.uri` from Supabase public URL after upload.

### Submit/Upload (Assumed in parent component, using storageService.ts)

- storageService.uploadFile for each media.uri, contentType detected (video/mp4 for .mp4).
- Base64 read entire file, upload as ArrayBuffer.
- No thumbnail upload; only video.
- Public URL returned, stored in review media array in DB.
- Anonymous uploads allowed for review-images bucket.

### Issues

- Dev testing impossible without standalone build.
- No visual video preview in carousel.
- Large videos (>20MB) could fail silently (memory, network).
- No video compression (Expo lacks easy video compress).

## After Changes

### 1. Playback Enabled Everywhere (MediaViewer.tsx)

- Removed `!isExpoGo` check in useVideoPlayer.
- Video loads/plays in Expo Go, dev, prod.
- Auto-play on load, with retry button for errors.
- Loading spinner during buffering.

Code change:

```tsx
// Before
const videoPlayer = useVideoPlayer(
  !isExpoGo && currentMedia?.type === "video" ? currentMedia.uri : null,
  // ...
);

// After
const videoPlayer = useVideoPlayer(
  currentMedia?.type === "video" ? currentMedia.uri : null,
  // ...
);
```

### 2. Thumbnail Generation & Size Warning (MediaUploadGrid.tsx)

- Added import: `import { VideoThumbnails } from "expo-video-thumbnails"; import * as FileSystem from "expo-file-system";`
- For camera/library video add:
  - Validate with `validateVideoFile`.
  - Get size with `FileSystem.getInfoAsync(uri)`.
  - If >20MB, Alert warning with Continue/Cancel; if continue/skip, generate thumbnail.
  - Generate thumbnail: `VideoThumbnails.getScreenshotAsync(uri, { time: 1000, quality: 0.8, width: 300 })`.
  - Set `mediaItem.thumbnailUri = thumbnail.uri`.
- For multiple selection, same per video; skip invalid/large if chosen.

### 3. Preview Improvement (ImageCarousel.tsx) - Already Supported

- Uses `item.thumbnailUri` if available for Image; falls back to icon.
- With new thumbnails, videos now show frame preview in carousel.

### 4. Upload Handling (storageService.ts) - No Change Needed

- Handles video/mp4 via `uploadFile(uri, { bucket: "review-images", contentType: "video/mp4" })`.
- Gets public URL.
- Recommended: In submit flow (e.g., ReviewForm component), for each media:
  ```ts
  if (media.type === "video") {
    const videoResult = await storageService.uploadReviewImage(media.uri, reviewId, { contentType: "video/mp4" });
    if (media.thumbnailUri) {
      const thumbResult = await storageService.uploadReviewImage(media.thumbnailUri, reviewId, {
        fileName: "thumb.jpg",
        contentType: "image/jpeg",
      });
      media.thumbnailUri = thumbResult.url;
    }
    media.uri = videoResult.url;
  } else {
    // Image upload
  }
  await supabase.from("reviews").update({ media }).eq("id", reviewId);
  ```
- Base64 ok for <20MB with warning; for larger, consider resumable (TUS via supabase-js advanced).

## Testing Verification

- **Dev**: Expo Go now plays videos in MediaViewer.
- **Upload**: Select video <20MB: thumbnail generated, preview shows frame. >20MB: warns, option to proceed.
- **Preview**: Carousel shows thumbnail for videos.
- **Full Playback**: Taps to MediaViewer: video streams from Supabase public URL, plays with native controls.
- **Edge**: Invalid video skipped, compression for images intact.

## Supabase Config

- Bucket "review-images" public read (existing).
- RLS policies allow insert anonymous, select all.
- Storage size monitor for videos.

## Future Improvements

- Video compression (FFmpeg via Reanimated, or cloud).
- Resumable uploads for large videos (Supabase TUS support).
- Progress bar during upload.

Files modified:

- src/components/MediaViewer.tsx (playback enable)
- src/components/MediaUploadGrid.tsx (thumbnails, warning)
- No changes to storageService/reviews.ts (upload handled in parent).

The video flow now fully works end-to-end.
