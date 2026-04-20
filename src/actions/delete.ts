import { v2 as cloudinaryLib } from 'cloudinary'
import { withRetry } from '../utils/retry.js'
import { CloudinaryUploaderError } from '../types/index.js'
import type { DeleteFileItem, DeleteResult, RetryOptions } from '../types/index.js'


export async function runDelete(
    cloudinary: typeof cloudinaryLib,
    files: DeleteFileItem[],
    retry: RetryOptions = {},
    parallel: boolean = true,
): Promise<DeleteResult[]> {

    const deleteLogic = async (file: DeleteFileItem, index: number): Promise<DeleteResult> => {
        try {

            // Using uploader.destroy for single file deletion

            // Invalidate: true is used to clear CDN cache immediately
            const result = await cloudinary.uploader.destroy(file.publicId, {
                resource_type: file.resourceType || 'image',
                invalidate: true,
            })


            // Cloudinary returns { result: 'not found' } if the file is already gone.

            // We treat 'ok' and 'not found' as successful outcomes for a delete action.
            if (result.result !== 'ok' && result.result !== 'not found') {
                throw new Error(`Cloudinary delete failed: ${result.result}`)
            }

            return {
                publicId: file.publicId,
                status: 'success',
                message: result.result === 'not found' ? 'File not found' : 'Deleted successfully',
            }
        } catch (err: any) {

            // If it's already our custom error, rethrow it
            if (err instanceof CloudinaryUploaderError) throw err

            throw new CloudinaryUploaderError(
                'DELETE_ERROR',
                err.message || 'Failed to delete asset',
                err,
                index,
            )
        }
    }

    if (parallel) {

        // Run all deletions concurrently using Promise.all
        return Promise.all(
            files.map((file, index) =>
                withRetry(() => deleteLogic(file, index), retry, index)
            )
        )
    } else {

        // Run deletions sequentially
        const results: DeleteResult[] = []
        for (let i = 0; i < files.length; i++) {
            const res = await withRetry(() => deleteLogic(files[i], i), retry, i)
            results.push(res)
        }
        return results
    }
}