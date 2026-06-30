import db from '../src/lib/db.js';
import { POST } from '../src/app/api/predictions/route.js';

// 1. Crear un partido futuro de prueba
await db.execute("DELETE FROM matches WHERE equipo_a = 'Argentina Test'");
const insertRes = await db.execute({
  sql: "INSERT INTO matches (equipo_a, equipo_b, grupo_fase, fecha_hora, estado) VALUES (?, ?, ?, ?, ?)",
  args: ['Argentina Test', 'Francia Test', '16avos de Final', '2026-07-05T20:00:00', 'pendiente']
});
const futureMatchId = insertRes.lastInsertRowid;
console.log('Match futuro creado con ID:', futureMatchId);

// 2. Simular la llamada a la API
const payload = {
  dni: '28898084',
  predictions: [
    { matchId: 1, golesA: '1', golesB: '2' }, // Partido pasado (ID 1)
    { matchId: Number(futureMatchId), golesA: '3', golesB: '0' } // Partido futuro
  ]
};

console.log('Invocando POST con payload:', JSON.stringify(payload));
const req = new Request('http://localhost/api/predictions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

try {
  const res = await POST(req);
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Response Body:', data);
} catch (err) {
  console.error('Error durante la invocación:', err);
}

// 3. Consultar la base de datos
const savedPreds = await db.execute({
  sql: 'SELECT * FROM predictions WHERE user_dni = ?',
  args: ['28898084']
});
console.log('Predicciones guardadas en DB para el usuario:', savedPreds.rows);

process.exit(0);
