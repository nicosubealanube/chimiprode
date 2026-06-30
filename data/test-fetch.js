import db from '../src/lib/db.js';

// 1. Crear un partido futuro de prueba
await db.execute("DELETE FROM matches WHERE equipo_a = 'Argentina Test'");
const insertRes = await db.execute({
  sql: "INSERT INTO matches (equipo_a, equipo_b, grupo_fase, fecha_hora, estado) VALUES (?, ?, ?, ?, ?)",
  args: ['Argentina Test', 'Francia Test', '16avos de Final', '2026-07-05T20:00:00', 'pendiente']
});
const futureMatchId = insertRes.lastInsertRowid;
console.log('Match futuro creado con ID:', futureMatchId);

// 2. Intentar guardar predicción mediante fetch
const payload = {
  dni: '28898084',
  predictions: [
    { matchId: 1, golesA: '1', golesB: '2' }, // Partido pasado (ID 1)
    { matchId: Number(futureMatchId), golesA: '3', golesB: '0' } // Partido futuro
  ]
};

console.log('Enviando payload:', JSON.stringify(payload));
const res = await fetch('http://localhost:3005/api/predictions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', data);

// 3. Consultar qué se guardó en la base de datos
const savedPreds = await db.execute({
  sql: 'SELECT * FROM predictions WHERE user_dni = ? AND match_id = ?',
  args: ['28898084', Number(futureMatchId)]
});
console.log('Predicciones guardadas en DB para el futuro:', savedPreds.rows);
process.exit(0);
