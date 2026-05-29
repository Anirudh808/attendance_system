import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize S3 Client using environment variables
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const DEFAULT_S3_KEY = 'b2of/AS25-02.jpg';

/**
 * Service to handle AWS S3 profile image operations.
 */
export const s3Service = {
  /**
   * Generates a temporary presigned URL for an object in S3.
   * 
   * @param {string} [key] - S3 object key (defaults to 'b2of/AS25-02.jpg')
   * @param {number} [expiresIn=3600] - Expiration time in seconds
   * @returns {Promise<string>} The presigned URL string
   */
  async getProfileImageUrl(key = DEFAULT_S3_KEY, expiresIn = 3600) {
    try {
      const getObjectCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: key || DEFAULT_S3_KEY,
      });
      return await getSignedUrl(s3Client, getObjectCommand, { expiresIn });
    } catch (error) {
      console.error('Error generating S3 presigned URL:', error);
      throw new Error(`Unable to generate signed URL for profile image: ${error.message}`);
    }
  },

  /**
   * Downloads a profile image from S3 using a presigned URL and returns it as a Buffer.
   * 
   * @param {string} url - S3 presigned URL
   * @returns {Promise<Buffer>} Binary file buffer
   */
  async downloadProfileImage(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      console.error('Error downloading profile image from S3:', error);
      throw new Error(`Failed to download profile image from S3: ${error.message}`);
    }
  }
};
