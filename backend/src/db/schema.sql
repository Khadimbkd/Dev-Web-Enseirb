
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un film ou une série, identifié sur TMDB par (tmdb_id, type).
CREATE TABLE media (
  id      SERIAL PRIMARY KEY,
  tmdb_id INTEGER NOT NULL,
  type    TEXT    NOT NULL CHECK (type IN ('movie', 'tv')),
  UNIQUE (tmdb_id, type)
);

-- Association users <-> media : les favoris d'un utilisateur.
-- La contrainte UNIQUE empêche les doublons (l'API répond 409).
CREATE TABLE favorites (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_id   INTEGER     NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  rating     SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, media_id)
);
