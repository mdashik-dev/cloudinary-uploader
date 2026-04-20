import { initCloudinary } from './utils/cloudinary.js'
import { runUpload } from './actions/upload.js'
import { runReplace } from './actions/replace.js'
import { runDelete } from './actions/delete.js'
import { runRename, runGetInfo, runAddTag, runRemoveTag, runGenerateUrl } from './actions/others.js'
import { CloudinaryUploaderError } from './types/index.js'
import type { Action, ActionFilesMap, ActionResultMap, UploaderInput } from './types/index.js'

export async function cloudinaryUploader<A extends Action>(
    input: UploaderInput<A>,
): Promise<ActionResultMap[A]> {
    const {
        config,
        action,
        files,
        options = {},
        validation = {},
        retry = {},
        onProgress,
        parallel = true,
    } = input

    if (!files || files.length === 0) {
        throw new CloudinaryUploaderError(
            'VALIDATION_ERROR',
            'files array must not be empty',
        )
    }

    const cloudinary = initCloudinary(config)

    try {
        switch (action) {
            case 'upload':
                return runUpload(
                    cloudinary,
                    files as ActionFilesMap['upload'],
                    options,
                    validation,
                    retry,
                    onProgress,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'replace':
                return runReplace(
                    cloudinary,
                    files as ActionFilesMap['replace'],
                    options,
                    validation,
                    retry,
                    onProgress,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'delete':
                return runDelete(
                    cloudinary,
                    files as ActionFilesMap['delete'],
                    retry,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'rename':
                return runRename(
                    cloudinary,
                    files as ActionFilesMap['rename'],
                    retry,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'getInfo':
                return runGetInfo(
                    cloudinary,
                    files as ActionFilesMap['getInfo'],
                    retry,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'addTag':
                return runAddTag(
                    cloudinary,
                    files as ActionFilesMap['addTag'],
                    retry,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'removeTag':
                return runRemoveTag(
                    cloudinary,
                    files as ActionFilesMap['removeTag'],
                    retry,
                    parallel,
                ) as Promise<ActionResultMap[A]>

            case 'generateUrl':
                return runGenerateUrl(
                    cloudinary,
                    files as ActionFilesMap['generateUrl'],
                ) as Promise<ActionResultMap[A]>

            default:
                throw new CloudinaryUploaderError(
                    'UNKNOWN_ERROR',
                    `Unknown action: "${String(action)}"`,
                )
        }
    } catch (err) {
        if (err instanceof CloudinaryUploaderError) throw err
        throw new CloudinaryUploaderError(
            'UNKNOWN_ERROR',
            err instanceof Error ? err.message : 'An unexpected error occurred',
            err,
        )
    }
}

// Re-export everything for consumers
export { CloudinaryUploaderError } from './types/index.js'
export type {
    CloudinaryConfig,
    ValidationOptions,
    TransformationOptions,
    UploadOptions,
    RetryOptions,
    ProgressCallback,
    UploaderInput,
    Action,
    ResourceType,
    UploadFileItem,
    ReplaceFileItem,
    DeleteFileItem,
    RenameFileItem,
    GetInfoFileItem,
    TagFileItem,
    GenerateUrlFileItem,
    UploadResult,
    DeleteResult,
    RenameResult,
    AssetInfo,
    TagResult,
    GenerateUrlResult,
    ActionResultMap,
} from './types/index.js'