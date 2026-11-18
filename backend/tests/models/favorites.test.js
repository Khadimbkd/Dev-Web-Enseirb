import { createRequire } from 'node:module';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// URL factice : le pool ne se connecte qu'à la première requête, qui est simulée ici.
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

const require = createRequire(import.meta.url);
const pool = require('../../src/db/pool');
const { listFavorites, addFavorite, removeFavorite } = require('../../src/models/favorites');

const createdAt = new Date('2026-01-01');

// Faux client de transaction : répond selon le début de la requête SQL.
function fakeClient(overrides = {}) {
  const handlers = {
    BEGIN: () => ({}),
    'INSERT INTO media': () => ({ rows: [{ id: 7 }] }),
    'INSERT INTO favorites': () => ({ rows: [{ id: 9, created_at: createdAt }] }),
    COMMIT: () => ({}),
    ROLLBACK: () => ({}),
    ...overrides,
  };
  const query = vi.fn(async (sql) => {
    const key = Object.keys(handlers).find((k) => sql.trim().startsWith(k));
    return handlers[key]();
  });
  return { query, release: vi.fn() };
}

function executedStatements(client) {
  return client.query.mock.calls.map(([sql]) => sql.trim().split(/\s+/).slice(0, 3).join(' '));
}

describe('favorites model', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('listFavorites', () => {
    it('renvoie les favoris de l\'utilisateur en camelCase', async () => {
      const query = vi.spyOn(pool, 'query').mockResolvedValue({
        rows: [{ id: 3, tmdb_id: 603, type: 'movie', rating: 5, comment: 'top', created_at: createdAt }],
      });

      const favorites = await listFavorites(1);

      expect(query.mock.calls[0][1]).toEqual([1]);
      expect(favorites).toEqual([
        { id: 3, tmdbId: 603, type: 'movie', rating: 5, comment: 'top', createdAt },
      ]);
    });

    it('renvoie un tableau vide si l\'utilisateur n\'a aucun favori', async () => {
      vi.spyOn(pool, 'query').mockResolvedValue({ rows: [] });

      expect(await listFavorites(1)).toEqual([]);
    });
  });

  describe('addFavorite', () => {
    let client;

    beforeEach(() => {
      client = fakeClient();
      vi.spyOn(pool, 'connect').mockResolvedValue(client);
    });

    it('crée le média puis le favori dans une transaction validée', async () => {
      const favorite = await addFavorite(1, { tmdbId: 603, type: 'movie', rating: 4, comment: 'bien' });

      expect(executedStatements(client)).toEqual([
        'BEGIN',
        'INSERT INTO media',
        'INSERT INTO favorites',
        'COMMIT',
      ]);
      expect(client.query.mock.calls[1][1]).toEqual([603, 'movie']);
      expect(client.query.mock.calls[2][1]).toEqual([1, 7, 4, 'bien']);
      expect(client.release).toHaveBeenCalledOnce();
      expect(favorite).toEqual({
        id: 9,
        tmdbId: 603,
        type: 'movie',
        rating: 4,
        comment: 'bien',
        createdAt,
      });
    });

    it('met rating et comment à null par défaut', async () => {
      const favorite = await addFavorite(1, { tmdbId: 603, type: 'movie' });

      expect(client.query.mock.calls[2][1]).toEqual([1, 7, null, null]);
      expect(favorite.rating).toBeNull();
      expect(favorite.comment).toBeNull();
    });

    it('annule la transaction et renvoie 409 en cas de doublon', async () => {
      client = fakeClient({
        'INSERT INTO favorites': () => {
          throw Object.assign(new Error('duplicate'), { code: '23505' });
        },
      });
      pool.connect.mockResolvedValue(client);

      await expect(addFavorite(1, { tmdbId: 603, type: 'movie' })).rejects.toMatchObject({
        status: 409,
        code: 'FAVORITE_ALREADY_EXISTS',
      });
      expect(executedStatements(client)).toContain('ROLLBACK');
      expect(executedStatements(client)).not.toContain('COMMIT');
      expect(client.release).toHaveBeenCalledOnce();
    });

    it('annule la transaction et relance les autres erreurs', async () => {
      const dbError = new Error('connection lost');
      client = fakeClient({
        'INSERT INTO media': () => {
          throw dbError;
        },
      });
      pool.connect.mockResolvedValue(client);

      await expect(addFavorite(1, { tmdbId: 603, type: 'movie' })).rejects.toBe(dbError);
      expect(executedStatements(client)).toContain('ROLLBACK');
      expect(client.release).toHaveBeenCalledOnce();
    });
  });

  describe('removeFavorite', () => {
    it('renvoie true quand le favori est supprimé, en filtrant par utilisateur', async () => {
      const query = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 });

      expect(await removeFavorite(9, 1)).toBe(true);
      expect(query.mock.calls[0][1]).toEqual([9, 1]);
      expect(query.mock.calls[0][0]).toContain('user_id = $2');
    });

    it('renvoie false si le favori n\'existe pas ou appartient à un autre utilisateur', async () => {
      vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 0 });

      expect(await removeFavorite(9, 2)).toBe(false);
    });
  });
});
