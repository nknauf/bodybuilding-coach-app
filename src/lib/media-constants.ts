export const MEDIA_LIMITS = {
  IMAGE: 10 * 1024 * 1024,
  VIDEO: 100 * 1024 * 1024,
  caption: 200,
} as const;
export const MEDIA_TYPES = {
  "image/jpeg": { type: "IMAGE", extension: "jpg" },
  "image/png": { type: "IMAGE", extension: "png" },
  "image/webp": { type: "IMAGE", extension: "webp" },
  "video/mp4": { type: "VIDEO", extension: "mp4" },
  "video/quicktime": { type: "VIDEO", extension: "mov" },
  "video/webm": { type: "VIDEO", extension: "webm" },
} as const;
