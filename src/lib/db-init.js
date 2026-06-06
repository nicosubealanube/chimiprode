export async function initDb(db) {
  // Inicializar tablas
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      dni TEXT PRIMARY KEY,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      celular TEXT NOT NULL,
      pago_aprobado INTEGER DEFAULT 0,
      rol TEXT DEFAULT 'user',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipo_a TEXT NOT NULL,
      equipo_b TEXT NOT NULL,
      grupo_fase TEXT NOT NULL,
      fecha_hora TEXT NOT NULL,
      goles_a INTEGER DEFAULT NULL,
      goles_b INTEGER DEFAULT NULL,
      estado TEXT DEFAULT 'pendiente'
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_dni TEXT NOT NULL,
      match_id INTEGER NOT NULL,
      goles_a INTEGER NOT NULL,
      goles_b INTEGER NOT NULL,
      puntos_obtenidos INTEGER DEFAULT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_dni) REFERENCES users(dni) ON DELETE CASCADE,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      UNIQUE(user_dni, match_id)
    );
  `);

  // Precargar partidos si la tabla está vacía
  const res = await db.execute('SELECT COUNT(*) as count FROM matches');
  const count = res.rows[0]?.count ?? res.rows[0]?.['COUNT(*)'] ?? res.rows[0]?.['count(*)'] ?? 0;

  if (Number(count) === 0) {
    const seedMatches = [
      { equipo_a: 'México', equipo_b: 'Sudáfrica', grupo_fase: 'Grupo A', fecha_hora: '2026-06-11T17:00:00' },
      { equipo_a: 'Canadá', equipo_b: 'Bosnia', grupo_fase: 'Grupo B', fecha_hora: '2026-06-12T16:00:00' },
      { equipo_a: 'EE. UU.', equipo_b: 'Paraguay', grupo_fase: 'Grupo D', fecha_hora: '2026-06-12T20:00:00' },
      { equipo_a: 'Argentina', equipo_b: 'Argelia', grupo_fase: 'Grupo J', fecha_hora: '2026-06-16T20:00:00' },
      { equipo_a: 'España', equipo_b: 'Cabo Verde', grupo_fase: 'Grupo H', fecha_hora: '2026-06-14T12:00:00' },
      { equipo_a: 'Brasil', equipo_b: 'Marruecos', grupo_fase: 'Grupo C', fecha_hora: '2026-06-14T18:00:00' },
      { equipo_a: 'Alemania', equipo_b: 'Ecuador', grupo_fase: 'Grupo E', fecha_hora: '2026-06-15T14:00:00' },
      { equipo_a: 'Francia', equipo_b: 'Japón', grupo_fase: 'Grupo F', fecha_hora: '2026-06-16T15:00:00' }
    ];

    const statements = seedMatches.map(m => ({
      sql: `INSERT INTO matches (equipo_a, equipo_b, grupo_fase, fecha_hora)
            VALUES (?, ?, ?, ?)`,
      args: [m.equipo_a, m.equipo_b, m.grupo_fase, m.fecha_hora]
    }));

    await db.batch(statements, "write");
    console.log('Partidos iniciales del Mundial 2026 precargados exitosamente.');
  }
}


