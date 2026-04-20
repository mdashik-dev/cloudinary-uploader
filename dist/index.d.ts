import { UploadApiOptions } from 'cloudinary';

interface CloudinaryConfig {
    cloud_name: string;
    api_key: string;
    api_secret: string;
    /** Optional: override Cloudinary API base URL */
    secure?: boolean;
}
interface ValidationOptions {
    /** Allowed MIME types e.g. ['image/jpeg', 'image/png', 'video/mp4'] */
    allowedTypes?: string[];
    /** Allowed file extensions e.g. ['jpg', 'png', 'webp'] */
    allowedExtensions?: string[];
    /** Max file size in MB */
    maxSizeMB?: number;
    /** Min file size in MB */
    minSizeMB?: number;
    /** Max image width in pixels (images only) */
    maxWidth?: number;
    /** Max image height in pixels (images only) */
    maxHeight?: number;
    /** Min image width in pixels (images only) */
    minWidth?: number;
    /** Min image height in pixels (images only) */
    minHeight?: number;
}
interface TransformationOptions {
    width?: number;
    height?: number;
    crop?: 'scale' | 'fill' | 'fit' | 'limit' | 'thumb' | 'crop' | 'pad';
    quality?: 'auto' | 'auto:best' | 'auto:eco' | number;
    format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png' | 'gif' | 'mp4' | 'webm';
    gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
    effect?: string;
    /** Fetch URL — apply transformations on fetch */
    fetch_format?: string;
}
/** For action: 'upload' */
interface UploadFileItem {
    /** File object (browser), Buffer, local file path, or remote URL */
    file: File | Buffer | string;
    /** Override publicId for this specific file */
    publicId?: string;
    /** Override folder for this specific file */
    folder?: string;
    /** Tags for this specific file */
    tags?: string[];
}
/** For action: 'replace' */
interface ReplaceFileItem {
    /** New file to upload */
    file: File | Buffer | string;
    /** Existing asset's publicId to overwrite */
    publicId: string;
}
/** For action: 'delete' */
interface DeleteFileItem {
    publicId: string;
    /** Default: 'image'. Use 'video' or 'raw' if needed */
    resourceType?: ResourceType;
}
/** For action: 'rename' */
interface RenameFileItem {
    fromPublicId: string;
    toPublicId: string;
    /** Overwrite toPublicId if it already exists */
    overwrite?: boolean;
}
/** For action: 'getInfo' */
interface GetInfoFileItem {
    publicId: string;
    resourceType?: ResourceType;
}
/** For action: 'addTag' | 'removeTag' */
interface TagFileItem {
    publicId: string;
    tags: string[];
    resourceType?: ResourceType;
}
/** For action: 'generateUrl' */
interface GenerateUrlFileItem {
    publicId: string;
    resourceType?: ResourceType;
    transformation?: TransformationOptions;
    /** Generate a signed URL with expiry */
    signed?: boolean;
    /** Expiry in seconds from now (only with signed: true) */
    expiresIn?: number;
}
type ResourceType = 'image' | 'video' | 'raw' | 'auto';
type ActionFilesMap = {
    upload: UploadFileItem[];
    replace: ReplaceFileItem[];
    delete: DeleteFileItem[];
    rename: RenameFileItem[];
    getInfo: GetInfoFileItem[];
    addTag: TagFileItem[];
    removeTag: TagFileItem[];
    generateUrl: GenerateUrlFileItem[];
};
type Action = keyof ActionFilesMap;
interface UploadOptions {
    /** Target folder in Cloudinary */
    folder?: string;
    /** Global tags applied to all files */
    tags?: string[];
    /** Cloudinary upload preset */
    uploadPreset?: string;
    /** Overwrite existing asset (for upload action) */
    overwrite?: boolean;
    /** Resource type hint */
    resourceType?: ResourceType;
    /** Apply transformation on upload */
    transformation?: TransformationOptions;
    /** Pass through any extra Cloudinary upload options */
    cloudinaryOptions?: Partial<UploadApiOptions>;
}
interface RetryOptions {
    /** Number of retries on failure. Default: 0 */
    maxRetries?: number;
    /** Delay between retries in ms. Default: 1000 */
    retryDelay?: number;
    /** Multiply delay by this factor each retry. Default: 1 (no backoff) */
    backoffFactor?: number;
}
type ProgressCallback = (progress: {
    /** 0–100 */
    percent: number;
    /** Which file index (for bulk uploads) */
    fileIndex: number;
    /** Total files being processed */
    total: number;
    /** Bytes uploaded so far */
    bytesUploaded?: number;
    /** Total bytes */
    bytesTotal?: number;
}) => void;
type UploaderInput<A extends Action = Action> = {
    /** Cloudinary credentials */
    config: CloudinaryConfig;
    /** Action to perform */
    action: A;
    /** Files to process — type depends on action */
    files: ActionFilesMap[A];
    /** Upload options (for upload / replace actions) */
    options?: UploadOptions;
    /** Validation rules (for upload / replace actions) */
    validation?: ValidationOptions;
    /** Retry config */
    retry?: RetryOptions;
    /** Progress callback */
    onProgress?: ProgressCallback;
    /** Run all files in parallel. Default: true */
    parallel?: boolean;
};
interface UploadResult {
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    resourceType: string;
    width?: number;
    height?: number;
    bytes: number;
    duration?: number;
    createdAt: string;
    tags: string[];
    folder?: string;
    originalFilename?: string;
}
interface DeleteResult {
    publicId: string;
    result: 'deleted' | 'not found';
}
interface RenameResult {
    fromPublicId: string;
    toPublicId: string;
    url: string;
    secureUrl: string;
}
interface AssetInfo {
    publicId: string;
    url: string;
    secureUrl: string;
    format: string;
    resourceType: string;
    width?: number;
    height?: number;
    bytes: number;
    duration?: number;
    createdAt: string;
    tags: string[];
    folder?: string;
}
interface TagResult {
    publicId: string;
    tags: string[];
}
interface GenerateUrlResult {
    publicId: string;
    url: string;
}
type ActionResultMap = {
    upload: UploadResult[];
    replace: UploadResult[];
    delete: DeleteResult[];
    rename: RenameResult[];
    getInfo: AssetInfo[];
    addTag: TagResult[];
    removeTag: TagResult[];
    generateUrl: GenerateUrlResult[];
};
type ErrorCode = 'VALIDATION_ERROR' | 'UPLOAD_ERROR' | 'DELETE_ERROR' | 'RENAME_ERROR' | 'TAG_ERROR' | 'INFO_ERROR' | 'URL_ERROR' | 'CONFIG_ERROR' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
declare class CloudinaryUploaderError extends Error {
    readonly code: ErrorCode;
    readonly details?: unknown | undefined;
    readonly fileIndex?: number | undefined;
    constructor(code: ErrorCode, message: string, details?: unknown | undefined, fileIndex?: number | undefined);
}

declare function cloudinaryUploader<A extends Action>(input: UploaderInput<A>): Promise<ActionResultMap[A]>;

export { type Action, type ActionResultMap, type AssetInfo, type CloudinaryConfig, CloudinaryUploaderError, type DeleteFileItem, type DeleteResult, type GenerateUrlFileItem, type GenerateUrlResult, type GetInfoFileItem, type ProgressCallback, type RenameFileItem, type RenameResult, type ReplaceFileItem, type ResourceType, type RetryOptions, type TagFileItem, type TagResult, type TransformationOptions, type UploadFileItem, type UploadOptions, type UploadResult, type UploaderInput, type ValidationOptions, cloudinaryUploader };
