import { hashPassword, verifyPassword } from './password';
it('salts password hashes and verifies without storing plaintext', async () => {
  const first = await hashPassword('a-long-secret-password');
  const second = await hashPassword('a-long-secret-password');
  expect(first).not.toBe(second);
  expect(first).not.toContain('a-long-secret-password');
  expect(await verifyPassword('a-long-secret-password', first)).toBe(true);
  expect(await verifyPassword('wrong', first)).toBe(false);
});
