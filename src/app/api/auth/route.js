import db from '@/lib/db';

// Función para normalizar texto (elimina acentos, espacios y pasa a minúsculas)
function normalizeText(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Eliminar todo lo que no sea letras o números
}

export async function POST(request) {
  try {
    const { action, dni, nombre, apellido, celular, nombreCompleto } = await request.json();

    // Validar DNI
    if (!dni || dni.trim() === '') {
      return Response.json({ error: 'El DNI es obligatorio.' }, { status: 400 });
    }
    const cleanDni = dni.trim().replace(/[^0-9a-zA-Z]/g, ''); // Limpiar puntos o guiones

    if (action === 'register') {
      // Validar campos de registro
      if (!nombre || !nombre.trim() || !apellido || !apellido.trim() || !celular || !celular.trim()) {
        return Response.json({ error: 'Todos los campos son obligatorios para el registro.' }, { status: 400 });
      }

      const cleanNombre = nombre.trim();
      const cleanApellido = apellido.trim();
      const cleanCelular = celular.trim();

      // Verificar si ya existe
      const existingUserRes = await db.execute({
        sql: 'SELECT * FROM users WHERE dni = ?',
        args: [cleanDni]
      });
      const existingUser = existingUserRes.rows[0];

      if (existingUser) {
        return Response.json({ error: 'Este DNI ya está registrado. Si ya pagaste, ingresá directamente.' }, { status: 400 });
      }

      // Insertar usuario
      const createdAt = new Date().toISOString();
      await db.execute({
        sql: `INSERT INTO users (dni, nombre, apellido, celular, pago_aprobado, rol, created_at)
              VALUES (?, ?, ?, ?, 0, 'user', ?)`,
        args: [cleanDni, cleanNombre, cleanApellido, cleanCelular, createdAt]
      });

      // Obtener el usuario creado
      const userRes = await db.execute({
        sql: 'SELECT * FROM users WHERE dni = ?',
        args: [cleanDni]
      });
      const user = userRes.rows[0];
      return Response.json({ success: true, user });

    } else if (action === 'login') {
      // Buscar usuario por DNI
      const userRes = await db.execute({
        sql: 'SELECT * FROM users WHERE dni = ?',
        args: [cleanDni]
      });
      const user = userRes.rows[0];

      if (!user) {
        return Response.json({ error: 'Usuario no encontrado. Por favor registrate primero abajo.' }, { status: 404 });
      }

      return Response.json({ success: true, user });
    }

    return Response.json({ error: 'Acción no válida.' }, { status: 400 });
  } catch (error) {
    console.error('Error en API Auth:', error);
    return Response.json({ error: 'Ocurrió un error en el servidor.' }, { status: 500 });
  }
}
