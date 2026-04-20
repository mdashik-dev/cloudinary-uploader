// src/utils/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";

// src/types/index.ts
var CloudinaryUploaderError = class extends Error {
  constructor(code, message, details, fileIndex) {
    super(message);
    this.code = code;
    this.details = details;
    this.fileIndex = fileIndex;
    this.name = "CloudinaryUploaderError";
  }
};

// src/utils/cloudinary.ts
function initCloudinary(config) {
  if (!config.cloud_name || !config.api_key || !config.api_secret) {
    throw new CloudinaryUploaderError(
      "CONFIG_ERROR",
      "Missing required Cloudinary config: cloud_name, api_key, api_secret are all required."
    );
  }
  cloudinary.config({
    cloud_name: config.cloud_name,
    api_key: config.api_key,
    api_secret: config.api_secret,
    secure: config.secure ?? true
  });
  return cloudinary;
}

// src/utils/validate.ts
var MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/bmp": "bmp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "text/plain": "txt",
  "application/json": "json"
};
async function extractMetadata(file) {
  if (typeof File !== "undefined" && file instanceof File) {
    return {
      name: file.name,
      sizeMB: file.size / (1024 * 1024),
      mimeType: file.type,
      extension: file.name.split(".").pop()?.toLowerCase() ?? ""
    };
  }
  if (Buffer.isBuffer(file)) {
    const mimeType = detectMimeFromBuffer(file);
    return {
      name: "buffer",
      sizeMB: file.length / (1024 * 1024),
      mimeType,
      extension: MIME_TO_EXT[mimeType] ?? "",
      buffer: file
    };
  }
  if (typeof file === "string") {
    if (file.startsWith("http://") || file.startsWith("https://")) {
      const ext2 = file.split(".").pop()?.split("?")[0]?.toLowerCase() ?? "";
      return {
        name: file.split("/").pop() ?? "remote",
        sizeMB: 0,
        mimeType: extToMime(ext2),
        extension: ext2
      };
    }
    const { stat, readFile } = await import("fs/promises");
    const stats = await stat(file);
    const ext = file.split(".").pop()?.toLowerCase() ?? "";
    const buf = await readFile(file);
    return {
      name: file.split("/").pop() ?? file,
      sizeMB: stats.size / (1024 * 1024),
      mimeType: extToMime(ext),
      extension: ext,
      buffer: buf
    };
  }
  throw new CloudinaryUploaderError("VALIDATION_ERROR", "Unsupported file type");
}
async function validateFile(meta, rules, fileIndex) {
  const errors = [];
  if (rules.allowedTypes && rules.allowedTypes.length > 0) {
    if (!rules.allowedTypes.includes(meta.mimeType)) {
      errors.push(
        `File type "${meta.mimeType}" is not allowed. Allowed: ${rules.allowedTypes.join(", ")}`
      );
    }
  }
  if (rules.allowedExtensions && rules.allowedExtensions.length > 0) {
    const normalised = rules.allowedExtensions.map((e) => e.replace(/^\./, "").toLowerCase());
    if (!normalised.includes(meta.extension)) {
      errors.push(
        `Extension ".${meta.extension}" is not allowed. Allowed: ${normalised.join(", ")}`
      );
    }
  }
  if (rules.maxSizeMB !== void 0 && meta.sizeMB > 0) {
    if (meta.sizeMB > rules.maxSizeMB) {
      errors.push(
        `File size ${meta.sizeMB.toFixed(2)} MB exceeds max ${rules.maxSizeMB} MB`
      );
    }
  }
  if (rules.minSizeMB !== void 0 && meta.sizeMB > 0) {
    if (meta.sizeMB < rules.minSizeMB) {
      errors.push(
        `File size ${meta.sizeMB.toFixed(2)} MB is below min ${rules.minSizeMB} MB`
      );
    }
  }
  if (meta.mimeType.startsWith("image/") && (rules.maxWidth || rules.maxHeight || rules.minWidth || rules.minHeight)) {
    const dims = await getImageDimensions(meta);
    if (dims) {
      if (rules.maxWidth && dims.width > rules.maxWidth)
        errors.push(`Image width ${dims.width}px exceeds max ${rules.maxWidth}px`);
      if (rules.maxHeight && dims.height > rules.maxHeight)
        errors.push(`Image height ${dims.height}px exceeds max ${rules.maxHeight}px`);
      if (rules.minWidth && dims.width < rules.minWidth)
        errors.push(`Image width ${dims.width}px is below min ${rules.minWidth}px`);
      if (rules.minHeight && dims.height < rules.minHeight)
        errors.push(`Image height ${dims.height}px is below min ${rules.minHeight}px`);
    }
  }
  if (errors.length > 0) {
    throw new CloudinaryUploaderError(
      "VALIDATION_ERROR",
      `Validation failed for file "${meta.name}":
  \u2022 ${errors.join("\n  \u2022 ")}`,
      errors,
      fileIndex
    );
  }
}
function extToMime(ext) {
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    avif: "image/avif",
    svg: "image/svg+xml",
    tiff: "image/tiff",
    bmp: "image/bmp",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    ogv: "video/ogg",
    pdf: "application/pdf",
    zip: "application/zip",
    txt: "text/plain",
    json: "application/json"
  };
  return map[ext] ?? "application/octet-stream";
}
function detectMimeFromBuffer(buf) {
  if (buf[0] === 255 && buf[1] === 216 && buf[2] === 255) return "image/jpeg";
  if (buf[0] === 137 && buf[1] === 80 && buf[2] === 78 && buf[3] === 71) return "image/png";
  if (buf[0] === 71 && buf[1] === 73 && buf[2] === 70) return "image/gif";
  if (buf[0] === 37 && buf[1] === 80 && buf[2] === 68 && buf[3] === 70) return "application/pdf";
  if (buf[0] === 82 && buf[1] === 73 && buf[2] === 70 && buf[3] === 70) return "video/avi";
  return "application/octet-stream";
}
async function getImageDimensions(meta) {
  try {
    const sharp = await import("sharp").catch(() => null);
    if (sharp && meta.buffer) {
      const { width, height } = await sharp.default(meta.buffer).metadata();
      if (width && height) return { width, height };
    }
  } catch {
  }
  return null;
}

// src/utils/retry.ts
async function withRetry(fn, options = {}, fileIndex) {
  const maxRetries = options.maxRetries ?? 0;
  const retryDelay = options.retryDelay ?? 1e3;
  const backoffFactor = options.backoffFactor ?? 1;
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (err instanceof CloudinaryUploaderError && err.code === "VALIDATION_ERROR") {
        throw err;
      }
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(backoffFactor, attempt);
        await sleep(delay);
      }
    }
  }
  if (lastError instanceof CloudinaryUploaderError) throw lastError;
  throw new CloudinaryUploaderError(
    "NETWORK_ERROR",
    lastError instanceof Error ? lastError.message : "Unknown error after retries",
    lastError,
    fileIndex
  );
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/actions/upload.ts
async function runUpload(cloudinary2, files, options = {}, validation = {}, retry = {}, onProgress, parallel = true) {
  const process = async (item, index) => {
    if (Object.keys(validation).length > 0) {
      const meta = await extractMetadata(item.file);
      await validateFile(meta, validation, index);
    }
    return withRetry(
      async () => {
        onProgress?.({ percent: 0, fileIndex: index, total: files.length });
        const uploadOptions = {
          folder: item.folder ?? options.folder,
          public_id: item.publicId,
          tags: [...options.tags ?? [], ...item.tags ?? []],
          upload_preset: options.uploadPreset,
          overwrite: options.overwrite ?? false,
          resource_type: options.resourceType ?? "auto",
          transformation: options.transformation,
          ...options.cloudinaryOptions
        };
        Object.keys(uploadOptions).forEach(
          (k) => uploadOptions[k] === void 0 && delete uploadOptions[k]
        );
        let result;
        if (typeof File !== "undefined" && item.file instanceof File) {
          const dataUri = await fileToDataUri(item.file);
          result = await cloudinary2.uploader.upload(dataUri, uploadOptions);
        } else {
          const source = Buffer.isBuffer(item.file) ? `data:application/octet-stream;base64,${item.file.toString("base64")}` : item.file;
          result = await cloudinary2.uploader.upload(source, uploadOptions);
        }
        onProgress?.({ percent: 100, fileIndex: index, total: files.length });
        return mapUploadResult(result);
      },
      retry,
      index
    );
  };
  if (parallel) {
    return Promise.all(files.map((item, i) => process(item, i)));
  }
  const results = [];
  for (let i = 0; i < files.length; i++) {
    results.push(await process(files[i], i));
  }
  return results;
}
function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new CloudinaryUploaderError("UPLOAD_ERROR", "Failed to read file"));
    reader.readAsDataURL(file);
  });
}
function mapUploadResult(r) {
  return {
    publicId: r["public_id"],
    url: r["url"],
    secureUrl: r["secure_url"],
    format: r["format"],
    resourceType: r["resource_type"],
    width: r["width"],
    height: r["height"],
    bytes: r["bytes"],
    duration: r["duration"],
    createdAt: r["created_at"],
    tags: r["tags"] ?? [],
    folder: r["folder"],
    originalFilename: r["original_filename"]
  };
}

// src/actions/replace.ts
async function runReplace(cloudinary2, files, options = {}, validation = {}, retry = {}, onProgress, parallel = true) {
  const uploadItems = files.map((item) => ({
    file: item.file,
    publicId: item.publicId
  }));
  return runUpload(
    cloudinary2,
    uploadItems,
    { ...options, overwrite: true },
    validation,
    retry,
    onProgress,
    parallel
  );
}

// src/actions/delete.ts
async function runDelete(cloudinary2, files, retry = {}, parallel = true) {
  const deleteLogic = async (file, index) => {
    try {
      const result = await cloudinary2.uploader.destroy(file.publicId, {
        resource_type: file.resourceType || "image",
        invalidate: true
      });
      if (result.result !== "ok" && result.result !== "not found") {
        throw new Error(`Cloudinary delete failed: ${result.result}`);
      }
      return {
        publicId: file.publicId,
        status: "success",
        message: result.result === "not found" ? "File not found" : "Deleted successfully"
      };
    } catch (err) {
      if (err instanceof CloudinaryUploaderError) throw err;
      throw new CloudinaryUploaderError(
        "DELETE_ERROR",
        err.message || "Failed to delete asset",
        err,
        index
      );
    }
  };
  if (parallel) {
    return Promise.all(
      files.map(
        (file, index) => withRetry(() => deleteLogic(file, index), retry, index)
      )
    );
  } else {
    const results = [];
    for (let i = 0; i < files.length; i++) {
      const res = await withRetry(() => deleteLogic(files[i], i), retry, i);
      results.push(res);
    }
    return results;
  }
}

// src/actions/others.ts
async function runRename(cloudinary2, files, retry = {}, parallel = true) {
  const process = async (item, index) => withRetry(
    async () => {
      const result = await cloudinary2.uploader.rename(
        item.fromPublicId,
        item.toPublicId,
        { overwrite: item.overwrite ?? false }
      );
      if (!result.public_id) {
        throw new CloudinaryUploaderError(
          "RENAME_ERROR",
          `Failed to rename "${item.fromPublicId}" to "${item.toPublicId}"`,
          result,
          index
        );
      }
      return {
        fromPublicId: item.fromPublicId,
        toPublicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url
      };
    },
    retry,
    index
  );
  if (parallel) return Promise.all(files.map((item, i) => process(item, i)));
  const results = [];
  for (let i = 0; i < files.length; i++) results.push(await process(files[i], i));
  return results;
}
async function runGetInfo(cloudinary2, files, retry = {}, parallel = true) {
  const process = async (item, index) => withRetry(
    async () => {
      const r = await cloudinary2.api.resource(item.publicId, {
        resource_type: item.resourceType ?? "image"
      });
      return {
        publicId: r["public_id"],
        url: r["url"],
        secureUrl: r["secure_url"],
        format: r["format"],
        resourceType: r["resource_type"],
        width: r["width"],
        height: r["height"],
        bytes: r["bytes"],
        duration: r["duration"],
        createdAt: r["created_at"],
        tags: r["tags"] ?? [],
        folder: r["folder"]
      };
    },
    retry,
    index
  );
  if (parallel) return Promise.all(files.map((item, i) => process(item, i)));
  const results = [];
  for (let i = 0; i < files.length; i++) results.push(await process(files[i], i));
  return results;
}
async function runAddTag(cloudinary2, files, retry = {}, parallel = true) {
  const process = async (item, index) => withRetry(
    async () => {
      const result = await cloudinary2.uploader.add_tag(
        item.tags.join(","),
        [item.publicId],
        { resource_type: item.resourceType ?? "image" }
      );
      if (!result["public_ids"]) {
        throw new CloudinaryUploaderError(
          "TAG_ERROR",
          `Failed to add tags to "${item.publicId}"`,
          result,
          index
        );
      }
      return { publicId: item.publicId, tags: item.tags };
    },
    retry,
    index
  );
  if (parallel) return Promise.all(files.map((item, i) => process(item, i)));
  const results = [];
  for (let i = 0; i < files.length; i++) results.push(await process(files[i], i));
  return results;
}
async function runRemoveTag(cloudinary2, files, retry = {}, parallel = true) {
  const process = async (item, index) => withRetry(
    async () => {
      const result = await cloudinary2.uploader.remove_tag(
        item.tags.join(","),
        [item.publicId],
        { resource_type: item.resourceType ?? "image" }
      );
      if (!result["public_ids"]) {
        throw new CloudinaryUploaderError(
          "TAG_ERROR",
          `Failed to remove tags from "${item.publicId}"`,
          result,
          index
        );
      }
      return { publicId: item.publicId, tags: item.tags };
    },
    retry,
    index
  );
  if (parallel) return Promise.all(files.map((item, i) => process(item, i)));
  const results = [];
  for (let i = 0; i < files.length; i++) results.push(await process(files[i], i));
  return results;
}
async function runGenerateUrl(cloudinary2, files) {
  return files.map((item) => {
    const transformation = item.transformation ? [
      {
        width: item.transformation.width,
        height: item.transformation.height,
        crop: item.transformation.crop,
        quality: item.transformation.quality,
        fetch_format: item.transformation.format ?? "auto",
        gravity: item.transformation.gravity,
        effect: item.transformation.effect
      }
    ] : void 0;
    const urlOptions = {
      resource_type: item.resourceType ?? "image",
      transformation,
      secure: true
    };
    if (item.signed && item.expiresIn) {
      urlOptions["sign_url"] = true;
      urlOptions["expires_at"] = Math.floor(Date.now() / 1e3) + item.expiresIn;
    }
    const url = cloudinary2.url(item.publicId, urlOptions);
    return { publicId: item.publicId, url };
  });
}

// src/index.ts
async function cloudinaryUploader(input) {
  const {
    config,
    action,
    files,
    options = {},
    validation = {},
    retry = {},
    onProgress,
    parallel = true
  } = input;
  if (!files || files.length === 0) {
    throw new CloudinaryUploaderError(
      "VALIDATION_ERROR",
      "files array must not be empty"
    );
  }
  const cloudinary2 = initCloudinary(config);
  try {
    switch (action) {
      case "upload":
        return runUpload(
          cloudinary2,
          files,
          options,
          validation,
          retry,
          onProgress,
          parallel
        );
      case "replace":
        return runReplace(
          cloudinary2,
          files,
          options,
          validation,
          retry,
          onProgress,
          parallel
        );
      case "delete":
        return runDelete(
          cloudinary2,
          files,
          retry,
          parallel
        );
      case "rename":
        return runRename(
          cloudinary2,
          files,
          retry,
          parallel
        );
      case "getInfo":
        return runGetInfo(
          cloudinary2,
          files,
          retry,
          parallel
        );
      case "addTag":
        return runAddTag(
          cloudinary2,
          files,
          retry,
          parallel
        );
      case "removeTag":
        return runRemoveTag(
          cloudinary2,
          files,
          retry,
          parallel
        );
      case "generateUrl":
        return runGenerateUrl(
          cloudinary2,
          files
        );
      default:
        throw new CloudinaryUploaderError(
          "UNKNOWN_ERROR",
          `Unknown action: "${String(action)}"`
        );
    }
  } catch (err) {
    if (err instanceof CloudinaryUploaderError) throw err;
    throw new CloudinaryUploaderError(
      "UNKNOWN_ERROR",
      err instanceof Error ? err.message : "An unexpected error occurred",
      err
    );
  }
}
export {
  CloudinaryUploaderError,
  cloudinaryUploader
};
