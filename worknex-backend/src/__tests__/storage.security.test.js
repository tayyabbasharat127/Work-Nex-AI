const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { LocalStorageAdapter } = require('../services/storage/local.storage');
const { isProhibitedAddress } = require('../utils/outboundNetwork');

describe('storage and outbound network security', () => {
  let root;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'worknex-storage-'));
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  test('local adapter stores and reads objects within its root', async () => {
    const adapter = new LocalStorageAdapter(root);
    await adapter.put('org-a/policy.txt', Buffer.from('policy'));
    await expect(adapter.get('org-a/policy.txt')).resolves.toEqual(Buffer.from('policy'));
  });

  test('local adapter rejects path traversal', () => {
    const adapter = new LocalStorageAdapter(root);
    expect(() => adapter.resolve('../secret.txt')).toThrow(/outside/);
  });

  test.each(['127.0.0.1', '169.254.169.254', '0.0.0.0', '::1', 'fe80::1'])(
    'classifies %s as prohibited for outbound integrations',
    (address) => expect(isProhibitedAddress(address)).toBe(true),
  );
});
