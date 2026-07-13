import { registrar_empleado } from './empleadoservice';
async function probar_registro() {
    const resultado = await registrar_empleado('carlos', 'ramirez', '1995-05-20', '8441234567');
    
    if (resultado.success) {
        console.log('empleado creado con exito, id:', resultado.id);
    }
}

probar_registro();