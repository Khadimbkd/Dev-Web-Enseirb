import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// URL factice : le pool ne se connecte qu'à la première requête, qui est simulée ici.
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

const require = createRequire(import.meta.url);
const pool = require('../../src/db/pool');
const { createUser, findUserByEmail, findUserById } = require('../../src/models/users');

const row = { id: 1, email: 'a@b.c', password_hash: 'hash', created_at: new Date('2026-01-01') };

describe('users model', () => {
  let query;

  beforeEach(() => {
    query = vi.spyOn(pool, 'query');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createUser', () => {
    it('insère avec des paramètres, normalise l\'email et n\'expose pas le hash', async () => {
      query.mockResolvedValue({ rows: [row] });

      const user = await createUser('  A@B.C ', 'hash');

      const [sql, params] = query.mock.calls[0];
      expect(params).toEqual(['a@b.c', 'hash']);
      expect(sql).toContain('$1');
      expect(sql).not.toContain('a@b.c');
      expect(user).toEqual({ id: 1, email: 'a@b.c', createdAt: row.created_at });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('renvoie une erreur 409 si l\'email existe déjà', async () => {
      query.mockRejectedValue({ code: '23505' });

      await expect(createUser('a@b.c', 'hash')).rejects.toMatchObject({
        status: 409,
        code: 'EMAIL_ALREADY_USED',
      });
    });

    it('relance les autres erreurs telles quelles', async () => {
      const dbError = new Error('connection lost');
      query.mockRejectedValue(dbError);

      await expect(createUser('a@b.c', 'hash')).rejects.toBe(dbError);
    });
  });

  describe('findUserByEmail', () => {
    it('renvoie l\'utilisateur avec son hash', async () => {
      query.mockResolvedValue({ rows: [row] });

      const user = await findUserByEmail(' A@B.C');

      expect(query.mock.calls[0][1]).toEqual(['a@b.c']);
      expect(user).toEqual({
        id: 1,
        email: 'a@b.c',
        createdAt: row.created_at,
        passwordHash: 'hash',
      });
    });

    it('renvoie null si l\'email est inconnu', async () => {
      query.mockResolvedValue({ rows: [] });

      expect(await findUserByEmail('nobody@b.c')).toBeNull();
    });
  });

  describe('findUserById', () => {
    it('renvoie l\'utilisateur sans le hash', async () => {
      query.mockResolvedValue({ rows: [row] });

      const user = await findUserById(1);

      expect(query.mock.calls[0][1]).toEqual([1]);
      expect(user).toEqual({ id: 1, email: 'a@b.c', createdAt: row.created_at });
      expect(user).not.toHaveProperty('passwordHash');
    });

    it('renvoie null si l\'id est inconnu', async () => {
      query.mockResolvedValue({ rows: [] });

      expect(await findUserById(999)).toBeNull();
    });
  });
});
