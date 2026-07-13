import pool from './db';

// funcion para registrar un nuevo empleado
export const registrar_empleado = async (nombre: string, apellido: string, fecha_nacimiento: string, telefono: string) => {
    const sql = 'insert into empleados (nombre, apellido, fecha_nacimiento, telefono) values (?, ?, ?, ?)';
    
    try {
        const [resultado]: any = await pool.execute(sql, [nombre, apellido, fecha_nacimiento, telefono]);
        return { success: true, id: resultado.insertid };
    } catch (error) {
        console.error('error al registrar empleado:', error);
        return { success: false, error };
    }
};