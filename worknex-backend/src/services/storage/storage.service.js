const path = require('path');
const { config } = require('../../config/env');
const { LocalStorageAdapter } = require('./local.storage');
const { S3StorageAdapter } = require('./s3.storage');

const adapter = config.storage.driver === 's3'
  ? new S3StorageAdapter({ region: config.storage.awsRegion, bucket: config.storage.s3Bucket })
  : new LocalStorageAdapter(path.resolve(process.cwd(), config.storage.localRoot));

const prefixedKey = (key) => [config.storage.s3Prefix, key]
  .filter(Boolean)
  .join('/')
  .replace(/^\/+/, '');

const normalizeKey = (key) => {
  if (config.storage.driver === 'local' && path.isAbsolute(key)) return key;
  return prefixedKey(key);
};

const put = (key, buffer, contentType) => adapter.put(prefixedKey(key), buffer, contentType);
const get = (key) => adapter.get(normalizeKey(key));
const remove = (key) => adapter.delete(normalizeKey(key));

module.exports = { put, get, remove };
