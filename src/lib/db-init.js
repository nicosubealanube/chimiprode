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
      estado TEXT DEFAULT 'pendiente',
      UNIQUE(equipo_a, equipo_b, fecha_hora)
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

  // Migración para corregir duplicaciones existentes de partidos y predicciones
  try {
    await db.executeMultiple(`
      UPDATE OR IGNORE predictions
      SET match_id = (
        SELECT MIN(m2.id)
        FROM matches m2
        JOIN matches m1 ON m1.id = predictions.match_id
        WHERE m2.equipo_a = m1.equipo_a 
          AND m2.equipo_b = m1.equipo_b 
          AND m2.fecha_hora = m1.fecha_hora
      )
      WHERE EXISTS (
        SELECT 1 
        FROM matches m1 
        WHERE m1.id = predictions.match_id
      );

      DELETE FROM matches 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM matches 
        GROUP BY equipo_a, equipo_b, fecha_hora
      );
    `);
  } catch (migrationError) {
    console.error('Error durante la migración de deduplicación:', migrationError);
  }

  // Precargar partidos si la tabla está vacía
  const res = await db.execute('SELECT COUNT(*) as count FROM matches');
  const count = res.rows[0]?.count ?? res.rows[0]?.['COUNT(*)'] ?? res.rows[0]?.['count(*)'] ?? 0;

  if (Number(count) === 0) {
    const GROUPS = {
      'Grupo A': ['México', 'Sudáfrica', 'Corea del Sur', 'República Checa'],
      'Grupo B': ['Canadá', 'Bosnia', 'Qatar', 'Suiza'],
      'Grupo C': ['Brasil', 'Marruecos', 'Haití', 'Escocia'],
      'Grupo D': ['EE. UU.', 'Paraguay', 'Australia', 'Turquía'],
      'Grupo E': ['Alemania', 'Curaçao', 'Costa de Marfil', 'Ecuador'],
      'Grupo F': ['Países Bajos', 'Japón', 'Suecia', 'Túnez'],
      'Grupo G': ['Bélgica', 'Egipto', 'Irán', 'Nueva Zelanda'],
      'Grupo H': ['España', 'Cabo Verde', 'Arabia Saudita', 'Uruguay'],
      'Grupo I': ['Francia', 'Senegal', 'Irak', 'Noruega'],
      'Grupo J': ['Argentina', 'Argelia', 'Austria', 'Jordania'],
      'Grupo K': ['Portugal', 'RD Congo', 'Uzbekistán', 'Colombia'],
      'Grupo L': ['Inglaterra', 'Croacia', 'Ghana', 'Panamá']
    };

    const seedMatches = [];

    // Ronda 1
    const r1Days = {
      'Grupo A': 11, 'Grupo B': 12, 'Grupo C': 13, 'Grupo D': 12,
      'Grupo E': 14, 'Grupo F': 14, 'Grupo G': 15, 'Grupo H': 15,
      'Grupo I': 16, 'Grupo J': 16, 'Grupo K': 17, 'Grupo L': 17
    };
    
    // Ronda 2
    const r2Days = {
      'Grupo A': 16, 'Grupo B': 17, 'Grupo C': 18, 'Grupo D': 18,
      'Grupo E': 19, 'Grupo F': 20, 'Grupo G': 21, 'Grupo H': 21,
      'Grupo I': 22, 'Grupo J': 22, 'Grupo K': 23, 'Grupo L': 23
    };

    // Ronda 3 (Simultáneos)
    const r3Days = {
      'Grupo A': 24, 'Grupo B': 24, 'Grupo C': 24,
      'Grupo D': 25, 'Grupo E': 25, 'Grupo F': 25,
      'Grupo G': 26, 'Grupo H': 26, 'Grupo I': 26,
      'Grupo J': 27, 'Grupo K': 27, 'Grupo L': 27
    };

    for (const [groupName, teams] of Object.entries(GROUPS)) {
      const [t0, t1, t2, t3] = teams;

      // --- RONDA 1 ---
      // Partido 1: t0 vs t1
      let r1Day = r1Days[groupName];
      let time1 = '16:00:00';
      if (groupName === 'Grupo A') time1 = '17:00:00';
      if (groupName === 'Grupo C') time1 = '18:00:00';
      if (groupName === 'Grupo D') time1 = '20:00:00'; // USA vs Paraguay
      if (groupName === 'Grupo J') time1 = '20:00:00'; // Argentina vs Algeria
      
      seedMatches.push({
        equipo_a: t0, equipo_b: t1, grupo_fase: groupName,
        fecha_hora: `2026-06-${String(r1Day).padStart(2, '0')}T${time1}`
      });

      // Partido 2: t2 vs t3
      let r1Day2 = r1Day;
      let time2 = '20:00:00';
      if (groupName === 'Grupo A') time2 = '22:00:00'; // Corea del Sur vs Rep Checa
      if (groupName === 'Grupo D') { r1Day2 = 13; time2 = '21:00:00'; } // Australia vs Turquía el 13
      if (groupName === 'Grupo E') time2 = '18:00:00';
      if (groupName === 'Grupo F') time2 = '21:00:00';
      if (groupName === 'Grupo H') time2 = '18:00:00';

      seedMatches.push({
        equipo_a: t2, equipo_b: t3, grupo_fase: groupName,
        fecha_hora: `2026-06-${String(r1Day2).padStart(2, '0')}T${time2}`
      });

      // --- RONDA 2 ---
      // Partido 3: t0 vs t2
      let r2Day = r2Days[groupName];
      let time3 = '17:00:00';
      seedMatches.push({
        equipo_a: t0, equipo_b: t2, grupo_fase: groupName,
        fecha_hora: `2026-06-${String(r2Day).padStart(2, '0')}T${time3}`
      });

      // Partido 4: t1 vs t3
      let r2Day2 = r2Day;
      if (groupName === 'Grupo A') r2Day2 = 17;
      if (groupName === 'Grupo B') r2Day2 = 18;
      if (groupName === 'Grupo C') r2Day2 = 19;
      if (groupName === 'Grupo D') r2Day2 = 19;
      if (groupName === 'Grupo E') r2Day2 = 20;
      let time4 = '20:00:00';
      seedMatches.push({
        equipo_a: t1, equipo_b: t3, grupo_fase: groupName,
        fecha_hora: `2026-06-${String(r2Day2).padStart(2, '0')}T${time4}`
      });

      // --- RONDA 3 (Simultáneos) ---
      // Partido 5: t0 vs t3
      // Partido 6: t1 vs t2
      let r3Day = r3Days[groupName];
      let time5 = (groupName === 'Grupo A' || groupName === 'Grupo B' || groupName === 'Grupo C' || groupName === 'Grupo G' || groupName === 'Grupo H' || groupName === 'Grupo I') ? '16:00:00' : '20:00:00';
      
      seedMatches.push({
        equipo_a: t0, equipo_b: t3, grupo_fase: groupName,
        fecha_hora: `2026-06-${String(r3Day).padStart(2, '0')}T${time5}`
      });
      seedMatches.push({
        equipo_a: t1, equipo_b: t2, grupo_fase: groupName,
        fecha_hora: `2026-06-${String(r3Day).padStart(2, '0')}T${time5}`
      });
    }

    const statements = seedMatches.map(m => ({
      sql: `INSERT OR IGNORE INTO matches (equipo_a, equipo_b, grupo_fase, fecha_hora)
            VALUES (?, ?, ?, ?)`,
      args: [m.equipo_a, m.equipo_b, m.grupo_fase, m.fecha_hora]
    }));

    await db.batch(statements, "write");
    console.log('Todos los 72 partidos de fase de grupos del Mundial 2026 precargados exitosamente.');
  }
}


