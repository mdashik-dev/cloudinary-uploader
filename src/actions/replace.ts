import type { v2 as Cloudinary } from 'cloudinary'
import type {
    ReplaceFileItem,
    UploadOptions,
    ValidationOptions,
    RetryOptions,
    ProgressCallback,
    UploadResult,
} from '../types/index.js'
import { runUpload } from './upload.js'

export async function runReplace(
    cloudinary: typeof Cloudinary,
    files: ReplaceFileItem[],
    options: UploadOptions = {},
    validation: ValidationOptions = {},
    retry: RetryOptions = {},
    onProgress?: ProgressCallback,
    parallel = true,
): Promise<UploadResult[]> {
    // Replace = upload with overwrite: true + forced publicId
    const uploadItems = files.map((item) => ({
        file: item.file,
        publicId: item.publicId,
    }))

    return runUpload(
        cloudinary,
        uploadItems,
        { ...options, overwrite: true },
        validation,
        retry,
        onProgress,
        parallel,
    )
}