import type { v2 as Cloudinary } from 'cloudinary'
import { CloudinaryUploaderError } from '../types/index.js'
import type {
    UploadFileItem,
    UploadOptions,
    ValidationOptions,
    RetryOptions,
    ProgressCallback,
    UploadResult,
} from '../types/index.js'
import { extractMetadata, validateFile } from '../utils/validate.js'
import { withRetry } from '../utils/retry.js'

export async function runUpload(
    cloudinary: typeof Cloudinary,
    files: UploadFileItem[],
    options: UploadOptions = {},
    validation: ValidationOptions = {},
    retry: RetryOptions = {},
    onProgress?: ProgressCallback,
    parallel = true,
): Promise<UploadResult[]> {
    const process = async (item: UploadFileItem, index: number): Promise<UploadResult> => {
        // 1. Validate
        if (Object.keys(validation).length > 0) {
            const meta = await extractMetadata(item.file)
            await validateFile(meta, validation, index)
        }

        // 2. Upload with retry
        return withRetry(
            async () => {
                onProgress?.({ percent: 0, fileIndex: index, total: files.length })

                const uploadOptions: Record<string, unknown> = {
                    folder: item.folder ?? options.folder,
                    public_id: item.publicId,
                    tags: [...(options.tags ?? []), ...(item.tags ?? [])],
                    upload_preset: options.uploadPreset,
                    overwrite: options.overwrite ?? false,
                    resource_type: options.resourceType ?? 'auto',
                    transformation: options.transformation,
                    ...options.cloudinaryOptions,
                }

                // Remove undefined keys
                Object.keys(uploadOptions).forEach(
                    (k) => uploadOptions[k] === undefined && delete uploadOptions[k],
                )

                let result: Awaited<ReturnType<typeof cloudinary.uploader.upload>>

                if (typeof File !== 'undefined' && item.file instanceof File) {
                    // Browser File → convert to base64 data URI
                    const dataUri = await fileToDataUri(item.file)
                    result = await cloudinary.uploader.upload(dataUri, uploadOptions)
                } else {
                    // Buffer, path, or URL
                    const source =
                        Buffer.isBuffer(item.file)
                            ? `data:application/octet-stream;base64,${item.file.toString('base64')}`
                            : (item.file as string)
                    result = await cloudinary.uploader.upload(source, uploadOptions)
                }

                onProgress?.({ percent: 100, fileIndex: index, total: files.length })

                return mapUploadResult(result)
            },
            retry,
            index,
        )
    }

    if (parallel) {
        return Promise.all(files.map((item, i) => process(item, i)))
    }

    const results: UploadResult[] = []
    for (let i = 0; i < files.length; i++) {
        results.push(await process(files[i]!, i))
    }
    return results
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function fileToDataUri(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new CloudinaryUploaderError('UPLOAD_ERROR', 'Failed to read file'))
        reader.readAsDataURL(file)
    })
}

function mapUploadResult(r: Record<string, unknown>): UploadResult {
    return {
        publicId: r['public_id'] as string,
        url: r['url'] as string,
        secureUrl: r['secure_url'] as string,
        format: r['format'] as string,
        resourceType: r['resource_type'] as string,
        width: r['width'] as number | undefined,
        height: r['height'] as number | undefined,
        bytes: r['bytes'] as number,
        duration: r['duration'] as number | undefined,
        createdAt: r['created_at'] as string,
        tags: (r['tags'] as string[]) ?? [],
        folder: r['folder'] as string | undefined,
        originalFilename: r['original_filename'] as string | undefined,
    }
}