import { createRequire } from 'node:module';
import { describe, it, expect, vi, afterEach } from 'vitest';

// Valeurs de test : le pool est simulé, aucune connexion réelle n'est ouverte.
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const require = createRequire(import.meta.url);
const request = require('supertest');
const jwt = require('jsonwebtoken');
const pool = require('../../src/db/pool');
const app = require('../../src/app');

const USER_ID = 1;
const auth = `Bearer ${jwt.sign({ sub: USER_ID }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' })}`;
const createdAt = new Date('2026-01-01T00:00:00.000Z');

// Faux client de transaction pour addFavorite.
function fakeClient({ failFavoriteInsert } = {}) {
  const query = vi.fn(async (sql) => {
    if (sql.trim().startsWith('INSERT INTO media')) return { rows: [{ id: 7 }] };
    if (sql.trim().startsWith('INSERT INTO favorites')) {
      if (failFavoriteInsert) throw failFavoriteInsert;
      return { rows: [{ id: 9, created_at: createdAt }] };
    }
    return {};
  });
  return { query, release: vi.fn() };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authentification des routes /me/favorites', () => {
  it.each([
    ['get', '/me/favorites'],
    ['post', '/me/favorites'],
    ['delete', '/me/favorites/1'],
  ])('%s %s sans token renvoie 401', async (method, url) => {
    const res = await request(app)[method](url);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('refuse un token expiré', async () => {
    const expired = jwt.sign(
      { sub: USER_ID, exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_ACCESS_SECRET
    );

    const res = await request(app).get('/me/favorites').set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

describe('GET /me/favorites', () => {
  it('renvoie 200 avec les favoris de l\'utilisateur du token', async () => {
    const query = vi.spyOn(pool, 'query').mockResolvedValue({
      rows: [{ id: 3, tmdb_id: 603, type: 'movie', rating: 5, comment: null, created_at: createdAt }],
    });

    const res = await request(app).get('/me/favorites').set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 3, tmdbId: 603, type: 'movie', rating: 5, comment: null, createdAt: createdAt.toISOString() },
    ]);
    expect(query.mock.calls[0][1]).toEqual([USER_ID]);
  });

  it('renvoie 500 sans détail interne si la base échoue', async () => {
    vi.spyOn(pool, 'query').mockRejectedValue(new Error('connection refused at 10.0.0.1'));

    const res = await request(app).get('/me/favorites').set('Authorization', auth);

    expect(res.status).toBe(500);
    expect(res.body.error).toEqual({ message: 'Erreur serveur', code: 'INTERNAL_ERROR' });
  });
});

describe('POST /me/favorites', () => {
  it('renvoie 201 avec le favori créé pour l\'utilisateur du token', async () => {
    const client = fakeClient();
    vi.spyOn(pool, 'connect').mockResolvedValue(client);

    const res = await request(app)
      .post('/me/favorites')
      .set('Authorization', auth)
      .send({ tmdbId: 603, type: 'movie', rating: 4, comment: '  top  ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 9,
      tmdbId: 603,
      type: 'movie',
      rating: 4,
      comment: 'top',
      createdAt: createdAt.toISOString(),
    });
    const favoriteInsert = client.query.mock.calls.find(([sql]) => sql.includes('INSERT INTO favorites'));
    expect(favoriteInsert[1]).toEqual([USER_ID, 7, 4, 'top']);
  });

  it.each([
    ['body vide', {}],
    ['tmdbId en texte', { tmdbId: '603', type: 'movie' }],
    ['tmdbId négatif', { tmdbId: -1, type: 'movie' }],
    ['type inconnu', { tmdbId: 603, type: 'book' }],
    ['rating hors limites', { tmdbId: 603, type: 'movie', rating: 6 }],
    ['comment trop long', { tmdbId: 603, type: 'movie', comment: 'x'.repeat(501) }],
    ['userId injecté', { tmdbId: 603, type: 'movie', userId: 2 }],
  ])('renvoie 400 si l\'entrée est invalide (%s)', async (_label, body) => {
    const connect = vi.spyOn(pool, 'connect');

    const res = await request(app).post('/me/favorites').set('Authorization', auth).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(connect).not.toHaveBeenCalled();
  });

  it('renvoie 409 si le favori existe déjà', async () => {
    const duplicate = Object.assign(new Error('duplicate'), { code: '23505' });
    vi.spyOn(pool, 'connect').mockResolvedValue(fakeClient({ failFavoriteInsert: duplicate }));

    const res = await request(app)
      .post('/me/favorites')
      .set('Authorization', auth)
      .send({ tmdbId: 603, type: 'movie' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FAVORITE_ALREADY_EXISTS');
  });
});

describe('DELETE /me/favorites/:id', () => {
  it('renvoie 204 quand le favori de l\'utilisateur est supprimé', async () => {
    const query = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 });

    const res = await request(app).delete('/me/favorites/9').set('Authorization', auth);

    expect(res.status).toBe(204);
    expect(res.text).toBe('');
    expect(query.mock.calls[0][1]).toEqual([9, USER_ID]);
  });

  it('renvoie 404 si le favori n\'existe pas ou appartient à un autre utilisateur', async () => {
    vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 0 });

    const res = await request(app).delete('/me/favorites/9').set('Authorization', auth);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('FAVORITE_NOT_FOUND');
  });

  it.each(['abc', '0', '-1', '1.5', '99999999999'])('renvoie 400 pour l\'id %s', async (id) => {
    const query = vi.spyOn(pool, 'query');

    const res = await request(app).delete(`/me/favorites/${id}`).set('Authorization', auth);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(query).not.toHaveBeenCalled();
  });
});
