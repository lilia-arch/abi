// =====================================================
// PORTAL EMPLEADO - RUTAS
// =====================================================

module.exports = function ({
    app,
    dbPromise,
    jwt,
    bcrypt,
    logger,
    obtenerIp,
    JWT_SECRET,
    JWT_EXPIRES_IN
}) {


// =====================================================
// PERFIL DEL EMPLEADO
// =====================================================

app.get(
    '/empleado/perfil',
    async (req, res, next) => {

        try {

            const token =
                req.headers.authorization?.split(' ')[1];


            if (!token) {

                return res.status(401).json({
                    mensaje: 'Token requerido'
                });

            }


            const datos =
                jwt.verify(
                    token,
                    JWT_SECRET
                );


            const [empleados] =
                await dbPromise.query(

                `
                SELECT
                    IdEmpleado,
                    Nombre,
                    ApellidoPaterno,
                    ApellidoMaterno,
                    Correo,
                    Puesto,
                    Turno,
                    NumeroEmpleado,
                    IdDepartamento
                FROM empleados
                WHERE IdEmpleado = ?
                LIMIT 1
                `,

                [
                    datos.idEmpleado
                ]

            );


            if (empleados.length === 0) {

                return res.status(404).json({
                    mensaje: 'Empleado no encontrado'
                });

            }


            res.json(
                empleados[0]
            );


        } catch(error) {

            next(error);

        }

    }
);




// =====================================================
// PAGOS DEL EMPLEADO
// =====================================================

app.get(
    '/empleado/pagos',
    async (req, res, next) => {

        try {


            const token =
                req.headers.authorization?.split(' ')[1];


            if(!token){

                return res.status(401).json({
                    mensaje:'Token requerido'
                });

            }


            const datos =
                jwt.verify(
                    token,
                    JWT_SECRET
                );



            const [pagos] =
                await dbPromise.query(

                `
                SELECT
                    *
                FROM pagos
                WHERE IdEmpleado = ?
                ORDER BY Fecha DESC
                `,

                [
                    datos.idEmpleado
                ]

            );


            res.json(
                pagos
            );


        } catch(error) {

            next(error);

        }

    }
);




// =====================================================
// HORAS EXTRAS DEL EMPLEADO
// =====================================================

app.get(
    '/empleado/horas-extras',
    async (req, res, next) => {

        try {


            const token =
                req.headers.authorization?.split(' ')[1];


            if(!token){

                return res.status(401).json({
                    mensaje:'Token requerido'
                });

            }


            const datos =
                jwt.verify(
                    token,
                    JWT_SECRET
                );



            const [horas] =
                await dbPromise.query(

                `
                SELECT
                    *
                FROM horas_extras
                WHERE IdEmpleado = ?
                ORDER BY Fecha DESC
                `,

                [
                    datos.idEmpleado
                ]

            );


            res.json(
                horas
            );


        } catch(error) {

            next(error);

        }

    }
);



};