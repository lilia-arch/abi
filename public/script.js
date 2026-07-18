document.getElementById('empleadoForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita que la página se recargue

    const empleado = {
        nombre: document.getElementById('nombre').value,
        apellido: document.getElementById('apellido').value,
        fecha_nacimiento: document.getElementById('fecha_nacimiento').value,
        telefono: document.getElementById('telefono').value
    };

    try {
        const response = await fetch('/empleados', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(empleado)
        });

        if (response.ok) {
            alert('¡Empleado registrado con éxito!');
        } else {
            alert('Error al registrar al empleado.');
        }
    } catch (error) {
        console.error('Error de conexión:', error);
    }
});