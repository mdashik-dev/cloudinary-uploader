import { CloudinaryUploaderError, type ValidationOptions } from '../types/index.js'

const MIME_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/svg+xml': 'svg',
    'image/tiff': 'tiff',
    'image/bmp': 'bmp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'video/quicktime': 'mov',
    'video/x-msvideo': 'avi',
    'application/pdf': 'pdf',
    'application/zip': 'zip',
    'text/plain': 'txt',
    'application/json': 'json',
}

export interface FileMetadata {
    name: string
    sizeMB: number
    mimeType: string
    extension: string
    buffer?: Buffer
}

/** Extract metadata from a File (browser), Buffer, path, or URL */
export async function extractMetadata(
    file: File | Buffer | string,
): Promise<FileMetadata> {
    // Browser File object
    if (typeof File !== 'undefined' && file instanceof File) {
        return {
            name: file.name,
            sizeMB: file.size / (1024 * 1024),
            mimeType: file.type,
            extension: file.name.split('.').pop()?.toLowerCase() ?? '',
        }
    }

    // Node.js Buffer
    if (Buffer.isBuffer(file)) {
        // Detect MIME from magic bytes
        const mimeType = detectMimeFromBuffer(file)
        return {
            name: 'buffer',
            sizeMB: file.length / (1024 * 1024),
            mimeType,
            extension: MIME_TO_EXT[mimeType] ?? '',
            buffer: file,
        }
    }

    // String: file path or URL
    if (typeof file === 'string') {
        if (file.startsWith('http://') || file.startsWith('https://')) {
            // Remote URL — we can't validate size/dimensions without fetching
            const ext = file.split('.').pop()?.split('?')[0]?.toLowerCase() ?? ''
            return {
                name: file.split('/').pop() ?? 'remote',
                sizeMB: 0,
                mimeType: extToMime(ext),
                extension: ext,
            }
        }

        // Local file path — read it
        const { stat, readFile } = await import('node:fs/promises')
        const stats = await stat(file)
        const ext = file.split('.').pop()?.toLowerCase() ?? ''
        const buf = await readFile(file)
        return {
            name: file.split('/').pop() ?? file,
            sizeMB: stats.size / (1024 * 1024),
            mimeType: extToMime(ext),
            extension: ext,
            buffer: buf,
        }
    }

    throw new CloudinaryUploaderError('VALIDATION_ERROR', 'Unsupported file type')
}

/** Run all validation checks against extracted metadata */
export async function validateFile(
    meta: FileMetadata,
    rules: ValidationOptions,
    fileIndex: number,
): Promise<void> {
    const errors: string[] = []

    if (rules.allowedTypes && rules.allowedTypes.length > 0) {
        if (!rules.allowedTypes.includes(meta.mimeType)) {
            errors.push(
                `File type "${meta.mimeType}" is not allowed. Allowed: ${rules.allowedTypes.join(', ')}`,
            )
        }
    }

    if (rules.allowedExtensions && rules.allowedExtensions.length > 0) {
        const normalised = rules.allowedExtensions.map((e) => e.replace(/^\./, '').toLowerCase())
        if (!normalised.includes(meta.extension)) {
            errors.push(
                `Extension ".${meta.extension}" is not allowed. Allowed: ${normalised.join(', ')}`,
            )
        }
    }

    if (rules.maxSizeMB !== undefined && meta.sizeMB > 0) {
        if (meta.sizeMB > rules.maxSizeMB) {
            errors.push(
                `File size ${meta.sizeMB.toFixed(2)} MB exceeds max ${rules.maxSizeMB} MB`,
            )
        }
    }

    if (rules.minSizeMB !== undefined && meta.sizeMB > 0) {
        if (meta.sizeMB < rules.minSizeMB) {
            errors.push(
                `File size ${meta.sizeMB.toFixed(2)} MB is below min ${rules.minSizeMB} MB`,
            )
        }
    }

    // Dimension checks — only for images
    if (
        meta.mimeType.startsWith('image/') &&
        (rules.maxWidth || rules.maxHeight || rules.minWidth || rules.minHeight)
    ) {
        const dims = await getImageDimensions(meta)
        if (dims) {
            if (rules.maxWidth && dims.width > rules.maxWidth)
                errors.push(`Image width ${dims.width}px exceeds max ${rules.maxWidth}px`)
            if (rules.maxHeight && dims.height > rules.maxHeight)
                errors.push(`Image height ${dims.height}px exceeds max ${rules.maxHeight}px`)
            if (rules.minWidth && dims.width < rules.minWidth)
                errors.push(`Image width ${dims.width}px is below min ${rules.minWidth}px`)
            if (rules.minHeight && dims.height < rules.minHeight)
                errors.push(`Image height ${dims.height}px is below min ${rules.minHeight}px`)
        }
    }

    if (errors.length > 0) {
        throw new CloudinaryUploaderError(
            'VALIDATION_ERROR',
            `Validation failed for file "${meta.name}":\n  • ${errors.join('\n  • ')}`,
            errors,
            fileIndex,
        )
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function extToMime(ext: string): string {
    const map: Record<string, string> = {
        jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
        gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
        svg: 'image/svg+xml', tiff: 'image/tiff', bmp: 'image/bmp',
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        avi: 'video/x-msvideo', ogv: 'video/ogg',
        pdf: 'application/pdf', zip: 'application/zip',
        txt: 'text/plain', json: 'application/json',
    }
    return map[ext] ?? 'application/octet-stream'
}

function detectMimeFromBuffer(buf: Buffer): string {
    // Check magic bytes
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif'
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return 'application/pdf'
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return 'video/avi'
    return 'application/octet-stream'
}

async function getImageDimensions(
    meta: FileMetadata,
): Promise<{ width: number; height: number } | null> {
    try {
        // Try to use sharp if available (Node.js)
        const sharp = await import('sharp').catch(() => null)
        if (sharp && meta.buffer) {
            const { width, height } = await sharp.default(meta.buffer).metadata()
            if (width && height) return { width, height }
        }
    } catch {
        // sharp not available — skip dimension check
    }
    return null
}