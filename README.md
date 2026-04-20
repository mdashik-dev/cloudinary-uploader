# cloudinary-uploader

A fully-typed TypeScript npm package for Cloudinary — one function, all operations.

## Installation

```bash
npm install cloudinary-uploader
```

## Quick start

```ts
import { cloudinaryUploader } from "cloudinary-uploader";

const config = {
  cloud_name: "your_cloud",
  api_key: "your_api_key",
  api_secret: "your_api_secret",
};
```

---

## Actions

### `upload` — single or multiple files

```ts
const results = await cloudinaryUploader({
  config,
  action: "upload",
  files: [
    { file: "./photo.jpg" },
    { file: "https://example.com/image.png", folder: "remote" },
    { file: buffer, publicId: "my-custom-id", tags: ["avatar"] },
  ],
  options: {
    folder: "uploads",
    tags: ["global-tag"],
    resourceType: "auto",
    transformation: {
      width: 800,
      crop: "scale",
      quality: "auto",
      format: "webp",
    },
  },
  validation: {
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    maxSizeMB: 5,
    maxWidth: 4000,
    maxHeight: 4000,
  },
  retry: { maxRetries: 3, retryDelay: 1000, backoffFactor: 2 },
  onProgress: ({ percent, fileIndex, total }) => {
    console.log(`File ${fileIndex + 1}/${total}: ${percent}%`);
  },
  parallel: true,
});

// results: UploadResult[]
// { publicId, url, secureUrl, format, width, height, bytes, tags, ... }
```

---

### `replace` — overwrite an existing asset

```ts
const results = await cloudinaryUploader({
  config,
  action: "replace",
  files: [{ file: "./new-photo.jpg", publicId: "uploads/my-old-photo" }],
  validation: { maxSizeMB: 10 },
});
```

---

### `delete` — single or bulk delete

```ts
const results = await cloudinaryUploader({
  config,
  action: "delete",
  files: [
    { publicId: "uploads/photo-1" },
    { publicId: "uploads/photo-2" },
    { publicId: "videos/clip-1", resourceType: "video" },
  ],
  parallel: true,
});

// results: DeleteResult[]
// { publicId, result: 'deleted' | 'not found' }
```

---

### `rename` — change a publicId

```ts
const results = await cloudinaryUploader({
  config,
  action: "rename",
  files: [
    {
      fromPublicId: "uploads/old-name",
      toPublicId: "uploads/new-name",
      overwrite: false,
    },
  ],
});

// results: RenameResult[]
// { fromPublicId, toPublicId, url, secureUrl }
```

---

### `getInfo` — fetch asset details

```ts
const results = await cloudinaryUploader({
  config,
  action: "getInfo",
  files: [
    { publicId: "uploads/photo-1" },
    { publicId: "videos/clip-1", resourceType: "video" },
  ],
});

// results: AssetInfo[]
// { publicId, url, secureUrl, format, width, height, bytes, duration, createdAt, tags, ... }
```

---

### `addTag` / `removeTag` — manage tags

```ts
await cloudinaryUploader({
  config,
  action: "addTag",
  files: [{ publicId: "uploads/photo-1", tags: ["featured", "hero"] }],
});

await cloudinaryUploader({
  config,
  action: "removeTag",
  files: [{ publicId: "uploads/photo-1", tags: ["featured"] }],
});

// results: TagResult[]
// { publicId, tags }
```

---

### `generateUrl` — signed or transformed URL

```ts
const results = await cloudinaryUploader({
  config,
  action: "generateUrl",
  files: [
    {
      publicId: "uploads/photo-1",
      transformation: {
        width: 400,
        height: 400,
        crop: "fill",
        quality: "auto",
        format: "webp",
      },
      signed: true,
      expiresIn: 3600, // 1 hour
    },
  ],
});

// results: GenerateUrlResult[]
// { publicId, url }
```

---

## Validation options

| Option              | Type       | Description                                           |
| ------------------- | ---------- | ----------------------------------------------------- |
| `allowedTypes`      | `string[]` | Allowed MIME types e.g. `['image/jpeg', 'video/mp4']` |
| `allowedExtensions` | `string[]` | Allowed extensions e.g. `['jpg', 'png']`              |
| `maxSizeMB`         | `number`   | Max file size in MB                                   |
| `minSizeMB`         | `number`   | Min file size in MB                                   |
| `maxWidth`          | `number`   | Max image width in pixels                             |
| `maxHeight`         | `number`   | Max image height in pixels                            |
| `minWidth`          | `number`   | Min image width in pixels                             |
| `minHeight`         | `number`   | Min image height in pixels                            |

---

## Error handling

```ts
import { cloudinaryUploader, CloudinaryUploaderError } from 'cloudinary-uploader'

try {
  const results = await cloudinaryUploader({ ... })
} catch (err) {
  if (err instanceof CloudinaryUploaderError) {
    console.error(err.code)      // 'VALIDATION_ERROR' | 'UPLOAD_ERROR' | ...
    console.error(err.message)   // Human-readable message
    console.error(err.fileIndex) // Which file failed (for bulk ops)
    console.error(err.details)   // Raw error details
  }
}
```

### Error codes

| Code               | When                                 |
| ------------------ | ------------------------------------ |
| `CONFIG_ERROR`     | Missing or invalid Cloudinary config |
| `VALIDATION_ERROR` | File failed validation checks        |
| `UPLOAD_ERROR`     | Upload failed                        |
| `DELETE_ERROR`     | Delete failed                        |
| `RENAME_ERROR`     | Rename failed                        |
| `TAG_ERROR`        | Tag operation failed                 |
| `INFO_ERROR`       | Could not fetch asset info           |
| `URL_ERROR`        | URL generation failed                |
| `NETWORK_ERROR`    | Network error after all retries      |
| `UNKNOWN_ERROR`    | Unexpected error                     |

---

## Retry options

```ts
retry: {
  maxRetries: 3,       // default: 0
  retryDelay: 1000,    // ms between retries, default: 1000
  backoffFactor: 2,    // multiply delay each retry (exponential), default: 1
}
```

---

## TypeScript

All inputs and outputs are fully typed. The return type automatically matches the `action` you pass:

```ts
// TypeScript knows this returns UploadResult[]
const uploadResults = await cloudinaryUploader({ action: 'upload', ... })

// TypeScript knows this returns DeleteResult[]
const deleteResults = await cloudinaryUploader({ action: 'delete', ... })
```
