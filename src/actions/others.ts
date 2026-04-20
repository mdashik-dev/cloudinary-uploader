import type { v2 as Cloudinary } from 'cloudinary'
import { CloudinaryUploaderError } from '../types/index.js'
import type {
    RenameFileItem,
    GetInfoFileItem,
    TagFileItem,
    GenerateUrlFileItem,
    RetryOptions,
    RenameResult,
    AssetInfo,
    TagResult,
    GenerateUrlResult,
} from '../types/index.js'
import { withRetry } from '../utils/retry.js'

// ─── Rename ────────────────────────────────────────────────────────────────

export async function runRename(
    cloudinary: typeof Cloudinary,
    files: RenameFileItem[],
    retry: RetryOptions = {},
    parallel = true,
): Promise<RenameResult[]> {
    const process = async (item: RenameFileItem, index: number): Promise<RenameResult> =>
        withRetry(
            async () => {
                const result = await cloudinary.uploader.rename(
                    item.fromPublicId,
                    item.toPublicId,
                    { overwrite: item.overwrite ?? false },
                )
                if (!result.public_id) {
                    throw new CloudinaryUploaderError(
                        'RENAME_ERROR',
                        `Failed to rename "${item.fromPublicId}" to "${item.toPublicId}"`,
                        result,
                        index,
                    )
                }
                return {
                    fromPublicId: item.fromPublicId,
                    toPublicId: result.public_id as string,
                    url: result.url as string,
                    secureUrl: result.secure_url as string,
                }
            },
            retry,
            index,
        )

    if (parallel) return Promise.all(files.map((item, i) => process(item, i)))
    const results: RenameResult[] = []
    for (let i = 0; i < files.length; i++) results.push(await process(files[i]!, i))
    return results
}

// ─── Get Info ──────────────────────────────────────────────────────────────

export async function runGetInfo(
    cloudinary: typeof Cloudinary,
    files: GetInfoFileItem[],
    retry: RetryOptions = {},
    parallel = true,
): Promise<AssetInfo[]> {
    const process = async (item: GetInfoFileItem, index: number): Promise<AssetInfo> =>
        withRetry(
            async () => {
                const r = await cloudinary.api.resource(item.publicId, {
                    resource_type: item.resourceType ?? 'image',
                }) as Record<string, unknown>
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
                }
            },
            retry,
            index,
        )

    if (parallel) return Promise.all(files.map((item, i) => process(item, i)))
    const results: AssetInfo[] = []
    for (let i = 0; i < files.length; i++) results.push(await process(files[i]!, i))
    return results
}

// ─── Add Tag ───────────────────────────────────────────────────────────────

export async function runAddTag(
    cloudinary: typeof Cloudinary,
    files: TagFileItem[],
    retry: RetryOptions = {},
    parallel = true,
): Promise<TagResult[]> {
    const process = async (item: TagFileItem, index: number): Promise<TagResult> =>
        withRetry(
            async () => {
                const result = await cloudinary.uploader.add_tag(
                    item.tags.join(','),
                    [item.publicId],
                    { resource_type: item.resourceType ?? 'image' },
                ) as Record<string, unknown>

                if (!result['public_ids']) {
                    throw new CloudinaryUploaderError(
                        'TAG_ERROR',
                        `Failed to add tags to "${item.publicId}"`,
                        result,
                        index,
                    )
                }
                return { publicId: item.publicId, tags: item.tags }
            },
            retry,
            index,
        )

    if (parallel) return Promise.all(files.map((item, i) => process(item, i)))
    const results: TagResult[] = []
    for (let i = 0; i < files.length; i++) results.push(await process(files[i]!, i))
    return results
}

// ─── Remove Tag ────────────────────────────────────────────────────────────

export async function runRemoveTag(
    cloudinary: typeof Cloudinary,
    files: TagFileItem[],
    retry: RetryOptions = {},
    parallel = true,
): Promise<TagResult[]> {
    const process = async (item: TagFileItem, index: number): Promise<TagResult> =>
        withRetry(
            async () => {
                const result = await cloudinary.uploader.remove_tag(
                    item.tags.join(','),
                    [item.publicId],
                    { resource_type: item.resourceType ?? 'image' },
                ) as Record<string, unknown>

                if (!result['public_ids']) {
                    throw new CloudinaryUploaderError(
                        'TAG_ERROR',
                        `Failed to remove tags from "${item.publicId}"`,
                        result,
                        index,
                    )
                }
                return { publicId: item.publicId, tags: item.tags }
            },
            retry,
            index,
        )

    if (parallel) return Promise.all(files.map((item, i) => process(item, i)))
    const results: TagResult[] = []
    for (let i = 0; i < files.length; i++) results.push(await process(files[i]!, i))
    return results
}

// ─── Generate URL ──────────────────────────────────────────────────────────

export async function runGenerateUrl(
    cloudinary: typeof Cloudinary,
    files: GenerateUrlFileItem[],
): Promise<GenerateUrlResult[]> {
    return files.map((item) => {
        const transformation = item.transformation
            ? [
                {
                    width: item.transformation.width,
                    height: item.transformation.height,
                    crop: item.transformation.crop,
                    quality: item.transformation.quality,
                    fetch_format: item.transformation.format ?? 'auto',
                    gravity: item.transformation.gravity,
                    effect: item.transformation.effect,
                },
            ]
            : undefined

        const urlOptions: Record<string, unknown> = {
            resource_type: item.resourceType ?? 'image',
            transformation,
            secure: true,
        }

        if (item.signed && item.expiresIn) {
            urlOptions['sign_url'] = true
            urlOptions['expires_at'] = Math.floor(Date.now() / 1000) + item.expiresIn
        }

        const url = cloudinary.url(item.publicId, urlOptions)
        return { publicId: item.publicId, url }
    })
}