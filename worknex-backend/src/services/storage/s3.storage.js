const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

class S3StorageAdapter {
  constructor({ region, bucket }) {
    this.bucket = bucket;
    this.client = new S3Client({ region });
  }

  async put(key, buffer, contentType) {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    }));
    return key;
  }

  async get(key) {
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return Buffer.from(await response.Body.transformToByteArray());
  }

  async delete(key) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

module.exports = { S3StorageAdapter };
