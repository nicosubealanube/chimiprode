import db from '@/lib/db';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'chimi2026';

function isAuthorized(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '').trim();
  return token === ADMIN_PASSWORD;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const usersRes = await db.execute(`
      SELECT 
        dni, 
        nombre, 
        apellido, 
        celular, 
        pago_aprobado, 
        rol, 
        created_at,
        (SELECT COUNT(*) FROM predictions WHERE user_dni = users.dni) as predicciones_cargadas
      FROM users
      ORDER BY created_at DESC
    `);
    const users = usersRes.rows;

    return Response.json({ success: true, users });
  } catch (error) {
    console.error('Error en admin users GET:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { dni, pago_aprobado } = await request.json();

    if (!dni) {
      return Response.json({ error: 'DNI requerido.' }, { status: 400 });
    }

    const cleanPago = pago_aprobado ? 1 : 0;

    const result = await db.execute({
      sql: 'UPDATE users SET pago_aprobado = ? WHERE DNI = ?',
      args: [cleanPago, dni]
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Estado de pago actualizado.' });
  } catch (error) {
    console.error('Error en admin users POST:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'No autorizado.' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const dni = searchParams.get('dni');

    if (!dni) {
      return Response.json({ error: 'DNI requerido.' }, { status: 400 });
    }

    const result = await db.execute({
      sql: 'DELETE FROM users WHERE dni = ?',
      args: [dni]
    });

    if (result.rowsAffected === 0) {
      return Response.json({ error: 'Usuario no encontrado.' }, { status: 404 });
    }

    return Response.json({ success: true, message: 'Usuario eliminado exitosamente.' });
  } catch (error) {
    console.error('Error en admin users DELETE:', error);
    return Response.json({ error: 'Error en el servidor.' }, { status: 500 });
  }
}
