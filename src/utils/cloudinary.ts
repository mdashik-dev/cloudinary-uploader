import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryUploaderError, type CloudinaryConfig } from '../types/index.js'

export function initCloudinary(config: CloudinaryConfig): typeof cloudinary {
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
        throw new CloudinaryUploaderError(
            'CONFIG_ERROR',
            'Missing required Cloudinary config: cloud_name, api_key, api_secret are all required.',
        )
    }

    cloudinary.config({
        cloud_name: config.cloud_name,
        api_key: config.api_key,
        api_secret: config.api_secret,
        secure: config.secure ?? true,
    })

    return cloudinary
}