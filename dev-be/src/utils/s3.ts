import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { env } from './env.js'
import { AppError } from './errors.js'

let client: S3Client | null = null

const getClient = () => {
  if (client) return client

  if (!env.S3_REGION || !env.S3_BUCKET_NAME) {
    throw new AppError('S3 configuration is missing', 500)
  }

  client = new S3Client({
    region: env.S3_REGION,
    credentials:
      env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          }
        : undefined,
    endpoint: env.S3_ENDPOINT_URL || undefined,
    forcePathStyle: Boolean(env.S3_ENDPOINT_URL),
  })

  return client
}

export const buildS3Url = (key: string) => {
  if (env.S3_ENDPOINT_URL) {
    return `${env.S3_ENDPOINT_URL.replace(/\/$/, '')}/${env.S3_BUCKET_NAME}/${key}`
  }

  return `https://${env.S3_BUCKET_NAME}.s3.${env.S3_REGION}.amazonaws.com/${key}`
}

export const uploadToS3 = async (params: {
  key: string
  body: Buffer
  contentType: string
}) => {
  const s3 = getClient()

  await s3.send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
    })
  )

  return buildS3Url(params.key)
}

export const deleteFromS3 = async (key: string) => {
  const s3 = getClient()

  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: key,
    })
  )
}
