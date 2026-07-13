import express from 'express';
import cors from 'cors';
import path from 'path';
import { registrar_empleado } from './empleadoservice';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Ruta principal: redirige al login si no tiene sesión (esto lo manejaremos en el frontend)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/login.html'));
});

// NUEVA RUTA: Login de RRHH
// Ejemplo de lo que deberías tener en tu server.ts
// Ejemplo de lo que deberías tener en tu server.ts
app.post('/login', (req, res) => {
    const { user, pass } = req.body;
    if (user === 'admin' && pass === '1234') { // <--- AQUÍ ESTÁN TUS CREDENCIALES
        res.status(200).send({ message: 'Login exitoso' });
    } else {
        res.status(401).send({ message: 'Credenciales incorrectas' });
    }
});
// Ruta POST para registrar empleados (mantenemos la que ya funciona)
app.post('/empleados', async (req, res) => {
    try {
        const { nombre, apellido, fecha_nacimiento, telefono } = req.body;
        const resultado = await registrar_empleado(nombre, apellido, fecha_nacimiento, telefono);
        
        if (resultado && resultado.success) {
            res.status(201).json({ mensaje: 'Empleado registrado con éxito' });
        } else {
            res.status(500).json({ mensaje: 'Error interno al registrar' });
        }
    } catch (error) {
        res.status(500).json({ mensaje: 'Error inesperado' });
    }
});

app.listen(3000, () => {
    console.log('Servidor corriendo en http://localhost:3000');
});