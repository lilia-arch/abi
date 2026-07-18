'use strict';

require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const morgan = require('morgan');
const winston = require('winston');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const {
    body,
    param,
    query,
    validationResult
} = require('express-validator');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

const PUERTO = Number(process.env.PORT) || 3000;
const ENTORNO = process.env.NODE_ENV || 'development';
const esProduccion = ENTORNO === 'production';

/* =====================================================
   CARPETAS
===================================================== */

const logsPath = path.join(__dirname, 'logs');
const uploadsPath = path.join(__dirname, 'uploads');

if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, {
        recursive: true
    });
}

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, {
        recursive: true
    });
}

/* =====================================================
   WINSTON Y ARCHIVOS DE LOGS
===================================================== */

const formatoLog = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',

    format: formatoLog,

    transports: [
        new winston.transports.Console(),

        new winston.transports.File({
            filename: path.join(
                logsPath,
                'access.log'
            ),
            level: 'info',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        }),

        new winston.transports.File({
            filename: path.join(
                logsPath,
                'security.log'
            ),
            level: 'warn',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        }),

        new winston.transports.File({
            filename: path.join(
                logsPath,
                'error.log'
            ),
            level: 'error',
            maxsize: 5 * 1024 * 1024,
            maxFiles: 5
        })
    ]
});

/* =====================================================
   FUNCIONES GENERALES
===================================================== */

function obtenerIp(req) {
    return (
        req.ip ||
        req.socket?.remoteAddress ||
        'IP_DESCONOCIDA'
    );
}

function sanitizarTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    if (typeof valor !== 'string') {
        return valor;
    }

    return valor
        .replace(
            /<script\b[^>]*>[\s\S]*?<\/script>/gi,
            ''
        )
        .replace(
            /<style\b[^>]*>[\s\S]*?<\/style>/gi,
            ''
        )
        .replace(
            /<[^>]+>/g,
            ''
        )
        .replace(
            /javascript:/gi,
            ''
        )
        .replace(
            /vbscript:/gi,
            ''
        )
        .replace(
            /data:text\/html/gi,
            ''
        )
        .replace(
            /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
            ''
        )
        .trim();
}

function convertirVacioANull(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    if (
        typeof valor === 'string' &&
        valor.trim() === ''
    ) {
        return null;
    }

    if (typeof valor === 'string') {
        return sanitizarTexto(valor);
    }

    return valor;
}

function numeroONull(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ''
    ) {
        return null;
    }

    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : null;
}

function crearErrorCors(mensaje) {
    const error = new Error(mensaje);

    error.status = 403;
    error.tipo = 'CORS';

    return error;
}

/* =====================================================
   RESPUESTA DE VALIDACIONES
===================================================== */

function responderErroresValidacion(req, res) {
    const errores = validationResult(req);

    if (errores.isEmpty()) {
        return false;
    }

    if (req.file) {
        eliminarArchivoFoto(
            req.file.filename
        );
    }

    const erroresSeguros = errores
        .array()
        .map((error) => ({
            campo:
                error.path ||
                error.param ||
                'desconocido',

            mensaje:
                error.msg
        }));

    logger.warn({
        evento: 'VALIDACION_RECHAZADA',
        metodo: req.method,
        ruta: req.originalUrl,
        ip: obtenerIp(req),
        errores: erroresSeguros,
        nivel: 'MEDIO',
        accion: 'SOLICITUD_RECHAZADA'
    });

    res.status(400).json({
        mensaje:
            'Existen datos no válidos.',

        errores:
            erroresSeguros
    });

    return true;
}

/* =====================================================
   HELMET Y CSP
===================================================== */

const frontendUrl =
    process.env.FRONTEND_URL || '';

const backendUrl =
    process.env.BACKEND_URL || '';

const conexionesPermitidas = [
    "'self'",
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    frontendUrl,
    backendUrl
].filter(Boolean);

app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: [
                    "'self'"
                ],

                scriptSrc: [
                    "'self'"
                ],

                styleSrc: [
                    "'self'",
                    "'unsafe-inline'"
                ],

                imgSrc: [
                    "'self'",
                    'data:',
                    'blob:'
                ],

                connectSrc:
                    conexionesPermitidas,

                fontSrc: [
                    "'self'",
                    'data:'
                ],

                objectSrc: [
                    "'none'"
                ],

                mediaSrc: [
                    "'self'"
                ],

                frameSrc: [
                    "'none'"
                ],

                frameAncestors: [
                    "'none'"
                ],

                baseUri: [
                    "'self'"
                ],

                formAction: [
                    "'self'"
                ],

                upgradeInsecureRequests:
                    esProduccion
                        ? []
                        : null
            }
        },

        crossOriginResourcePolicy: {
            policy: 'cross-origin'
        },

        referrerPolicy: {
            policy:
                'strict-origin-when-cross-origin'
        }
    })
);

/* =====================================================
   CORS RESTRINGIDO
===================================================== */

const origenesDesdeEnv = (
    process.env.ALLOWED_ORIGINS || ''
)
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);

const origenesPermitidos = [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    ...origenesDesdeEnv
];

const opcionesCors = {
    origin: (
        origin,
        callback
    ) => {
        /*
         * En desarrollo permite Postman y ZAP
         * cuando no existe encabezado Origin.
         */
        if (
            !origin &&
            !esProduccion
        ) {
            return callback(
                null,
                true
            );
        }

        if (
            origin &&
            origenesPermitidos.includes(
                origin
            )
        ) {
            return callback(
                null,
                true
            );
        }

        logger.warn({
            evento:
                'ORIGEN_CORS_BLOQUEADO',
            origen:
                origin || null,
            nivel:
                'MEDIO',
            accion:
                'SOLICITUD_RECHAZADA'
        });

        return callback(
            crearErrorCors(
                'El origen no está permitido.'
            )
        );
    },

    credentials: true,

    methods: [
        'GET',
        'POST',
        'PUT',
        'DELETE',
        'OPTIONS'
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With'
    ],

    exposedHeaders: [
        'RateLimit-Limit',
        'RateLimit-Remaining',
        'RateLimit-Reset',
        'X-Total-Count',
        'X-Page',
        'X-Limit'
    ],

    optionsSuccessStatus: 204
};

app.use(
    cors(opcionesCors)
);

/* =====================================================
   RATE LIMIT GENERAL
===================================================== */

const limiteGeneral = rateLimit({
    windowMs:
        15 * 60 * 1000,

    limit:
        Number(
            process.env.RATE_LIMIT_MAX
        ) || 200,

    standardHeaders:
        'draft-7',

    legacyHeaders:
        false,

    skip: (req) => {
        return req.method === 'OPTIONS';
    },

    handler: (
        req,
        res
    ) => {
        logger.warn({
            evento:
                'RATE_LIMIT_EXCEDIDO',

            metodo:
                req.method,

            ruta:
                req.originalUrl,

            ip:
                obtenerIp(req),

            nivel:
                'ALTO',

            accion:
                'SOLICITUD_BLOQUEADA'
        });

        return res.status(429).json({
            mensaje:
                'Demasiadas solicitudes. Intenta nuevamente más tarde.'
        });
    }
});

app.use(limiteGeneral);

/* =====================================================
   CONFIGURACIÓN DE EXPRESS
===================================================== */

app.use(
    express.json({
        limit: '1mb',
        strict: true
    })
);

app.use(
    express.urlencoded({
        extended: true,
        limit: '1mb',
        parameterLimit: 100
    })
);

/* =====================================================
   MORGAN
===================================================== */

app.use(
    morgan(
        ':date[iso] :method :url :status :response-time ms IP=:remote-addr',
        {
            stream: {
                write: (mensaje) => {
                    logger.info({
                        evento:
                            'PETICION_HTTP',

                        detalle:
                            mensaje.trim()
                    });
                }
            }
        }
    )
);

/* =====================================================
   DETECCIÓN DE ENTRADAS SOSPECHOSAS
===================================================== */

app.use(
    (
        req,
        res,
        next
    ) => {
        let contenido = '';

        try {
            contenido =
                JSON.stringify({
                    body:
                        req.body || {},

                    query:
                        req.query || {},

                    params:
                        req.params || {}
                });
        } catch (error) {
            logger.warn({
                evento:
                    'ERROR_ANALIZAR_ENTRADA',

                ruta:
                    req.originalUrl,

                ip:
                    obtenerIp(req)
            });

            return next();
        }

        const patronSospechoso =
            /<script|javascript:|vbscript:|onerror\s*=|onload\s*=|union\s+(all\s+)?select|drop\s+table|information_schema|sleep\s*\(|benchmark\s*\(|\/\*/i;

        if (
            patronSospechoso.test(
                contenido
            )
        ) {
            logger.warn({
                evento:
                    'ENTRADA_SOSPECHOSA_BLOQUEADA',

                metodo:
                    req.method,

                ruta:
                    req.originalUrl,

                ip:
                    obtenerIp(req),

                nivel:
                    'ALTO',

                accion:
                    'SOLICITUD_BLOQUEADA'
            });

            return res.status(400).json({
                mensaje:
                    'La solicitud contiene datos no permitidos.'
            });
        }

        next();
    }
);

/* =====================================================
   ARCHIVOS ESTÁTICOS
===================================================== */

app.use(
    '/uploads',
    express.static(
        uploadsPath,
        {
            maxAge: '1d',
            etag: true,
            fallthrough: false,

            setHeaders: (res) => {
                res.setHeader(
                    'X-Content-Type-Options',
                    'nosniff'
                );

                res.setHeader(
                    'Cache-Control',
                    'public, max-age=86400'
                );
            }
        }
    )
);

/* =====================================================
   MYSQL
===================================================== */

const db = mysql.createPool({
    host:
        process.env.DB_HOST ||
        'localhost',

    port:
        Number(
            process.env.DB_PORT
        ) || 3306,

    user:
        process.env.DB_USER ||
        'root',

    password:
        process.env.DB_PASSWORD ||
        '',

    database:
        process.env.DB_NAME ||
        'empresa_db',

    waitForConnections:
        true,

    connectionLimit:
        10,

    queueLimit:
        0,

    enableKeepAlive:
        true,

    keepAliveInitialDelay:
        0,

    charset:
        'utf8mb4'
});

const dbPromise =
    db.promise();

db.getConnection(
    (
        error,
        conexion
    ) => {
        if (error) {
            logger.error({
                evento:
                    'ERROR_MYSQL',

                codigo:
                    error.code,

                mensaje:
                    error.message
            });

            console.error(
                'Error al conectar con MySQL:',
                error.message
            );

            return;
        }

        conexion.release();

        console.log(
            'Conectado a MySQL'
        );

        logger.info({
            evento:
                'MYSQL_CONECTADO'
        });
    }
);

/* =====================================================
   CONFIGURACIÓN DE MULTER
===================================================== */

const extensionesPermitidas = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp'
];

const tiposPermitidos = [
    'image/jpeg',
    'image/png',
    'image/webp'
];

const storage = multer.diskStorage({
    destination: (
        req,
        file,
        callback
    ) => {
        callback(
            null,
            uploadsPath
        );
    },

    filename: (
        req,
        file,
        callback
    ) => {
        const extension = path
            .extname(
                file.originalname
            )
            .toLowerCase();

        const nombreBase = path
            .basename(
                file.originalname,
                extension
            )
            .replace(
                /[^a-zA-Z0-9_-]/g,
                '_'
            )
            .substring(
                0,
                60
            );

        const numeroAleatorio =
            Math.round(
                Math.random() *
                1000000000
            );

        const nombreFinal =
            `${Date.now()}-${numeroAleatorio}-${nombreBase || 'imagen'}${extension}`;

        callback(
            null,
            nombreFinal
        );
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize:
            2 * 1024 * 1024,

        files:
            1,

        fields:
            40,

        fieldNameSize:
            100,

        fieldSize:
            100 * 1024
    },

    fileFilter: (
        req,
        file,
        callback
    ) => {
        const extension = path
            .extname(
                file.originalname
            )
            .toLowerCase();

        const tipoValido =
            tiposPermitidos.includes(
                file.mimetype
            );

        const extensionValida =
            extensionesPermitidas.includes(
                extension
            );

        if (
            tipoValido &&
            extensionValida
        ) {
            return callback(
                null,
                true
            );
        }

        logger.warn({
            evento:
                'ARCHIVO_RECHAZADO',

            archivo:
                sanitizarTexto(
                    file.originalname
                ),

            mimetype:
                file.mimetype,

            ip:
                obtenerIp(req),

            nivel:
                'ALTO',

            accion:
                'ARCHIVO_BLOQUEADO'
        });

        const error = new Error(
            'Solo se permiten imágenes JPG, JPEG, PNG o WEBP.'
        );

        error.status = 400;
        error.tipo =
            'ARCHIVO_NO_PERMITIDO';

        return callback(error);
    }
});

/* =====================================================
   ELIMINAR FOTO
===================================================== */

function eliminarArchivoFoto(
    nombreFoto
) {
    if (!nombreFoto) {
        return;
    }

    const archivoSeguro =
        path.basename(
            nombreFoto
        );

    const rutaFoto =
        path.resolve(
            uploadsPath,
            archivoSeguro
        );

    const carpetaSegura =
        `${path.resolve(uploadsPath)}${path.sep}`;

    if (
        !rutaFoto.startsWith(
            carpetaSegura
        )
    ) {
        logger.warn({
            evento:
                'RUTA_ARCHIVO_NO_SEGURA',

            archivo:
                archivoSeguro
        });

        return;
    }

    fs.unlink(
        rutaFoto,
        (error) => {
            if (
                error &&
                error.code !== 'ENOENT'
            ) {
                logger.error({
                    evento:
                        'ERROR_ELIMINAR_FOTO',

                    mensaje:
                        error.message
                });
            }
        }
    );
}

/* =====================================================
   VALIDACIONES DE EMPLEADO
===================================================== */

const validarEmpleado = [
    body('nombre')
        .trim()
        .notEmpty()
        .withMessage(
            'El nombre es obligatorio.'
        )
        .isLength({
            min: 2,
            max: 100
        })
        .withMessage(
            'El nombre debe tener entre 2 y 100 caracteres.'
        ),

    body('apellidoPaterno')
        .trim()
        .notEmpty()
        .withMessage(
            'El apellido paterno es obligatorio.'
        )
        .isLength({
            min: 2,
            max: 100
        })
        .withMessage(
            'El apellido paterno debe tener entre 2 y 100 caracteres.'
        ),

    body('apellidoMaterno')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        }),

    body('fechaNacimiento')
        .optional({
            checkFalsy: true
        })
        .isISO8601()
        .withMessage(
            'La fecha de nacimiento no es válida.'
        ),

    body('edad')
        .optional({
            checkFalsy: true
        })
        .isInt({
            min: 0,
            max: 120
        })
        .withMessage(
            'La edad debe estar entre 0 y 120.'
        ),

    body('celular')
        .optional({
            checkFalsy: true
        })
        .trim()
        .matches(
            /^[0-9+\-\s()]{7,20}$/
        )
        .withMessage(
            'El celular no es válido.'
        ),

    body('direccion')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 500
        })
        .withMessage(
            'La dirección es demasiado larga.'
        ),

    body('correo')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isEmail()
        .withMessage(
            'El correo no es válido.'
        )
        .normalizeEmail(),

    body('estadoCivil')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 50
        }),

    body('genero')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 30
        }),

    body('puesto')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        }),

    body('salario')
        .optional({
            checkFalsy: true
        })
        .isFloat({
            min: 0,
            max: 10000000
        })
        .withMessage(
            'El salario no es válido.'
        ),

    body('idDepartamento')
        .notEmpty()
        .withMessage(
            'El departamento es obligatorio.'
        )
        .isInt({
            min: 1
        })
        .withMessage(
            'El departamento no es válido.'
        ),

    body('numeroEmpleado')
        .trim()
        .notEmpty()
        .withMessage(
            'El número de empleado es obligatorio.'
        )
        .isLength({
            min: 1,
            max: 30
        })
        .matches(
            /^[a-zA-Z0-9_-]+$/
        )
        .withMessage(
            'El número de empleado solo puede contener letras, números, guiones y guion bajo.'
        ),

    body('fechaIngreso')
        .optional({
            checkFalsy: true
        })
        .isISO8601()
        .withMessage(
            'La fecha de ingreso no es válida.'
        ),

    body('turno')
        .optional({
            checkFalsy: true
        })
        .isIn([
            'Matutino',
            'Vespertino',
            'Nocturno'
        ])
        .withMessage(
            'El turno no es válido.'
        ),

    body('estado')
        .optional({
            checkFalsy: true
        })
        .isIn([
            'Activo',
            'Inactivo',
            'Vacaciones',
            'Baja'
        ])
        .withMessage(
            'El estado no es válido.'
        ),

    body('tipoContrato')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        }),

    body('horasLaboralesDia')
        .optional({
            checkFalsy: true
        })
        .isInt({
            min: 1,
            max: 24
        })
        .withMessage(
            'Las horas laborales deben estar entre 1 y 24.'
        ),

    body('banco')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        }),

    body('numeroTarjeta')
        .optional({
            checkFalsy: true
        })
        .matches(
            /^[0-9]{12,19}$/
        )
        .withMessage(
            'La tarjeta debe contener entre 12 y 19 dígitos.'
        ),

    body('clabeInterbancaria')
        .optional({
            checkFalsy: true
        })
        .matches(
            /^[0-9]{18}$/
        )
        .withMessage(
            'La CLABE debe tener exactamente 18 dígitos.'
        ),

    body('titularCuenta')
        .optional({
            checkFalsy: true
        })
        .trim()
        .isLength({
            max: 100
        })
];

const validarIdEmpleado = [
    param('id')
        .isInt({
            min: 1
        })
        .withMessage(
            'El ID del empleado no es válido.'
        )
];

/* =====================================================
   VALIDACIONES DE HORAS EXTRA
===================================================== */

const validarHoraExtra = [
    body('numeroEmpleado')
        .trim()
        .notEmpty()
        .withMessage(
            'El número de empleado es obligatorio.'
        )
        .isLength({
            max: 30
        })
        .matches(
            /^[a-zA-Z0-9_-]+$/
        )
        .withMessage(
            'El número de empleado no es válido.'
        ),

    body('fecha')
        .notEmpty()
        .withMessage(
            'La fecha es obligatoria.'
        )
        .isISO8601()
        .withMessage(
            'La fecha no es válida.'
        ),

    body('tipoHoraExtra')
        .trim()
        .notEmpty()
        .withMessage(
            'El tipo de hora extra es obligatorio.'
        )
        .isLength({
            min: 2,
            max: 100
        })
        .withMessage(
            'El tipo de hora extra no es válido.'
        ),

    body('turno')
        .optional({
            checkFalsy: true
        })
        .isIn([
            'Matutino',
            'Vespertino',
            'Nocturno'
        ])
        .withMessage(
            'El turno no es válido.'
        ),

    body('horasTrabajo')
        .isFloat({
            min: 0.5,
            max: 24
        })
        .withMessage(
            'Las horas deben estar entre 0.5 y 24.'
        ),

    body('pagoHora')
        .isFloat({
            min: 0,
            max: 100000
        })
        .withMessage(
            'El pago por hora no es válido.'
        )
];

const validarIdHoraExtra = [
    param('id')
        .isInt({
            min: 1
        })
        .withMessage(
            'El ID de la hora extra no es válido.'
        )
];

/* =====================================================
   VALIDACIONES DE PAGINACIÓN
===================================================== */

const validarPaginacion = [
    query('page')
        .optional()
        .isInt({
            min: 1,
            max: 100000
        })
        .withMessage(
            'La página no es válida.'
        ),

    query('limit')
        .optional()
        .isInt({
            min: 1,
            max: 100
        })
        .withMessage(
            'El límite debe estar entre 1 y 100.'
        )
];

/* =====================================================
   RUTA PRINCIPAL
===================================================== */

app.get(
    '/',
    (
        req,
        res
    ) => {
        return res.status(200).json({
            mensaje:
                'Servidor KASQ funcionando correctamente.'
        });
    }
);

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
    '/health',
    async (
        req,
        res
    ) => {
        try {
            await dbPromise.query(
                'SELECT 1'
            );

            return res.status(200).json({
                estado:
                    'activo',

                fecha:
                    new Date().toISOString()
            });
        } catch (error) {
            logger.error({
                evento:
                    'HEALTH_CHECK_FALLIDO',

                mensaje:
                    error.message
            });

            return res.status(503).json({
                estado:
                    'no disponible'
            });
        }
    }
);

/* =====================================================
   REGISTRAR EMPLEADO
===================================================== */

app.post(
    '/empleados',

    upload.single('foto'),

    validarEmpleado,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const empleado =
            req.body || {};

        const foto =
            req.file
                ? req.file.filename
                : null;

        const numeroEmpleado =
            sanitizarTexto(
                empleado.numeroEmpleado
            );

        try {
            const [
                duplicados
            ] = await dbPromise.query(
                `
                    SELECT IdEmpleado
                    FROM empleados
                    WHERE NumeroEmpleado = ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado
                ]
            );

            if (
                duplicados.length > 0
            ) {
                if (foto) {
                    eliminarArchivoFoto(
                        foto
                    );
                }

                logger.warn({
                    evento:
                        'EMPLEADO_DUPLICADO',

                    numeroEmpleado,

                    ip:
                        obtenerIp(req),

                    nivel:
                        'MEDIO'
                });

                return res.status(409).json({
                    mensaje:
                        'El número de empleado ya está registrado.'
                });
            }

            const sql = `
                INSERT INTO empleados
                (
                    Nombre,
                    ApellidoPaterno,
                    ApellidoMaterno,
                    FechaNacimiento,
                    Edad,
                    Celular,
                    Direccion,
                    Correo,
                    EstadoCivil,
                    Genero,
                    Puesto,
                    Salario,
                    IdDepartamento,
                    NumeroEmpleado,
                    FechaIngreso,
                    Turno,
                    Estado,
                    TipoContrato,
                    HorasLaboralesDia,
                    Banco,
                    NumeroTarjeta,
                    ClabeInterbancaria,
                    TitularCuenta,
                    Foto
                )
                VALUES
                (
                    ?,?,?,?,?,?,?,?,?,?,?,?,
                    ?,?,?,?,?,?,?,?,?,?,?,?
                )
            `;

            const valores = [
                sanitizarTexto(
                    empleado.nombre
                ),

                sanitizarTexto(
                    empleado.apellidoPaterno
                ),

                convertirVacioANull(
                    empleado.apellidoMaterno
                ),

                convertirVacioANull(
                    empleado.fechaNacimiento
                ),

                numeroONull(
                    empleado.edad
                ),

                convertirVacioANull(
                    empleado.celular
                ),

                convertirVacioANull(
                    empleado.direccion
                ),

                convertirVacioANull(
                    empleado.correo
                ),

                convertirVacioANull(
                    empleado.estadoCivil
                ),

                convertirVacioANull(
                    empleado.genero
                ),

                convertirVacioANull(
                    empleado.puesto
                ),

                numeroONull(
                    empleado.salario
                ),

                numeroONull(
                    empleado.idDepartamento
                ),

                numeroEmpleado,

                convertirVacioANull(
                    empleado.fechaIngreso
                ),

                convertirVacioANull(
                    empleado.turno
                ),

                convertirVacioANull(
                    empleado.estado
                ) || 'Activo',

                convertirVacioANull(
                    empleado.tipoContrato
                ),

                numeroONull(
                    empleado.horasLaboralesDia
                ) || 9,

                convertirVacioANull(
                    empleado.banco
                ) || 'BANORTE',

                convertirVacioANull(
                    empleado.numeroTarjeta
                ),

                convertirVacioANull(
                    empleado.clabeInterbancaria
                ),

                convertirVacioANull(
                    empleado.titularCuenta
                ),

                foto
            ];

            const [
                resultado
            ] = await dbPromise.query(
                sql,
                valores
            );

            logger.info({
                evento:
                    'EMPLEADO_REGISTRADO',

                id:
                    resultado.insertId,

                numeroEmpleado,

                ip:
                    obtenerIp(req)
            });

            return res.status(201).json({
                mensaje:
                    'Empleado guardado correctamente.',

                id:
                    resultado.insertId
            });
        } catch (error) {
            if (foto) {
                eliminarArchivoFoto(
                    foto
                );
            }

            if (
                error.code ===
                'ER_DUP_ENTRY'
            ) {
                return res.status(409).json({
                    mensaje:
                        'El número de empleado ya está registrado.'
                });
            }

            return next(error);
        }
    }
);

/* =====================================================
   OBTENER EMPLEADOS CON PAGINACIÓN
===================================================== */

app.get(
    '/empleados',

    validarPaginacion,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const pagina =
            Number(
                req.query.page
            ) || 1;

        const limite =
            Number(
                req.query.limit
            ) || 100;

        const offset =
            (
                pagina - 1
            ) * limite;

        try {
            const [
                conteo
            ] = await dbPromise.query(
                `
                    SELECT COUNT(*) AS total
                    FROM empleados
                `
            );

            const [
                empleados
            ] = await dbPromise.query(
                `
                    SELECT
                        IdEmpleado,
                        Foto,
                        Nombre,
                        ApellidoPaterno,
                        ApellidoMaterno,
                        FechaNacimiento,
                        Edad,
                        Celular,
                        Direccion,
                        Correo,
                        EstadoCivil,
                        Genero,
                        Puesto,
                        Salario,
                        IdDepartamento,
                        NumeroEmpleado,
                        FechaIngreso,
                        Turno,
                        Estado,
                        TipoContrato,
                        HorasLaboralesDia,
                        Banco,
                        NumeroTarjeta,
                        ClabeInterbancaria,
                        TitularCuenta
                    FROM empleados
                    ORDER BY IdEmpleado DESC
                    LIMIT ?
                    OFFSET ?
                `,
                [
                    limite,
                    offset
                ]
            );

            res.setHeader(
                'X-Total-Count',
                String(
                    conteo[0].total
                )
            );

            res.setHeader(
                'X-Page',
                String(pagina)
            );

            res.setHeader(
                'X-Limit',
                String(limite)
            );

            /*
             * Se devuelve directamente el arreglo para
             * mantener compatibilidad con Angular.
             */
            return res.status(200).json(
                empleados
            );
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   OBTENER EMPLEADO POR ID
===================================================== */

app.get(
    '/empleados/:id',

    validarIdEmpleado,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        try {
            const [
                resultados
            ] = await dbPromise.query(
                `
                    SELECT *
                    FROM empleados
                    WHERE IdEmpleado = ?
                    LIMIT 1
                `,
                [
                    Number(
                        req.params.id
                    )
                ]
            );

            if (
                resultados.length === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'Empleado no encontrado.'
                });
            }

            return res.status(200).json(
                resultados[0]
            );
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   BUSCAR EMPLEADO POR NÚMERO
===================================================== */

app.get(
    '/empleado/:numeroEmpleado',

    param('numeroEmpleado')
        .trim()
        .isLength({
            min: 1,
            max: 30
        })
        .matches(
            /^[a-zA-Z0-9_-]+$/
        )
        .withMessage(
            'El número de empleado no es válido.'
        ),

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const numeroEmpleado =
            sanitizarTexto(
                req.params.numeroEmpleado
            );

        try {
            const [
                resultados
            ] = await dbPromise.query(
                `
                    SELECT *
                    FROM empleados
                    WHERE NumeroEmpleado = ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado
                ]
            );

            if (
                resultados.length === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'Empleado no encontrado.'
                });
            }

            return res.status(200).json(
                resultados[0]
            );
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   ACTUALIZAR EMPLEADO
===================================================== */

app.put(
    '/empleados/:id',

    upload.single('foto'),

    validarIdEmpleado,

    validarEmpleado,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const idEmpleado =
            Number(
                req.params.id
            );

        const empleado =
            req.body || {};

        const numeroEmpleado =
            sanitizarTexto(
                empleado.numeroEmpleado
            );

        try {
            const [
                empleadosActuales
            ] = await dbPromise.query(
                `
                    SELECT Foto
                    FROM empleados
                    WHERE IdEmpleado = ?
                    LIMIT 1
                `,
                [
                    idEmpleado
                ]
            );

            if (
                empleadosActuales.length === 0
            ) {
                if (req.file) {
                    eliminarArchivoFoto(
                        req.file.filename
                    );
                }

                return res.status(404).json({
                    mensaje:
                        'Empleado no encontrado.'
                });
            }

            const [
                duplicados
            ] = await dbPromise.query(
                `
                    SELECT IdEmpleado
                    FROM empleados
                    WHERE NumeroEmpleado = ?
                    AND IdEmpleado <> ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado,
                    idEmpleado
                ]
            );

            if (
                duplicados.length > 0
            ) {
                if (req.file) {
                    eliminarArchivoFoto(
                        req.file.filename
                    );
                }

                return res.status(409).json({
                    mensaje:
                        'El número de empleado pertenece a otro registro.'
                });
            }

            const fotoAnterior =
                empleadosActuales[0].Foto;

            const fotoNueva =
                req.file
                    ? req.file.filename
                    : fotoAnterior;

            const sql = `
                UPDATE empleados
                SET
                    Foto = ?,
                    Nombre = ?,
                    ApellidoPaterno = ?,
                    ApellidoMaterno = ?,
                    FechaNacimiento = ?,
                    Edad = ?,
                    Celular = ?,
                    Direccion = ?,
                    Correo = ?,
                    EstadoCivil = ?,
                    Genero = ?,
                    Puesto = ?,
                    Salario = ?,
                    IdDepartamento = ?,
                    NumeroEmpleado = ?,
                    FechaIngreso = ?,
                    Turno = ?,
                    Estado = ?,
                    TipoContrato = ?,
                    HorasLaboralesDia = ?,
                    Banco = ?,
                    NumeroTarjeta = ?,
                    ClabeInterbancaria = ?,
                    TitularCuenta = ?
                WHERE IdEmpleado = ?
            `;

            const valores = [
                fotoNueva,

                sanitizarTexto(
                    empleado.nombre
                ),

                sanitizarTexto(
                    empleado.apellidoPaterno
                ),

                convertirVacioANull(
                    empleado.apellidoMaterno
                ),

                convertirVacioANull(
                    empleado.fechaNacimiento
                ),

                numeroONull(
                    empleado.edad
                ),

                convertirVacioANull(
                    empleado.celular
                ),

                convertirVacioANull(
                    empleado.direccion
                ),

                convertirVacioANull(
                    empleado.correo
                ),

                convertirVacioANull(
                    empleado.estadoCivil
                ),

                convertirVacioANull(
                    empleado.genero
                ),

                convertirVacioANull(
                    empleado.puesto
                ),

                numeroONull(
                    empleado.salario
                ),

                numeroONull(
                    empleado.idDepartamento
                ),

                numeroEmpleado,

                convertirVacioANull(
                    empleado.fechaIngreso
                ),

                convertirVacioANull(
                    empleado.turno
                ),

                convertirVacioANull(
                    empleado.estado
                ) || 'Activo',

                convertirVacioANull(
                    empleado.tipoContrato
                ),

                numeroONull(
                    empleado.horasLaboralesDia
                ) || 9,

                convertirVacioANull(
                    empleado.banco
                ) || 'BANORTE',

                convertirVacioANull(
                    empleado.numeroTarjeta
                ),

                convertirVacioANull(
                    empleado.clabeInterbancaria
                ),

                convertirVacioANull(
                    empleado.titularCuenta
                ),

                idEmpleado
            ];

            const [
                resultado
            ] = await dbPromise.query(
                sql,
                valores
            );

            if (
                resultado.affectedRows === 0
            ) {
                if (req.file) {
                    eliminarArchivoFoto(
                        req.file.filename
                    );
                }

                return res.status(404).json({
                    mensaje:
                        'Empleado no encontrado.'
                });
            }

            if (
                req.file &&
                fotoAnterior
            ) {
                eliminarArchivoFoto(
                    fotoAnterior
                );
            }

            logger.info({
                evento:
                    'EMPLEADO_ACTUALIZADO',

                id:
                    idEmpleado,

                numeroEmpleado,

                ip:
                    obtenerIp(req)
            });

            return res.status(200).json({
                mensaje:
                    'Empleado actualizado correctamente.'
            });
        } catch (error) {
            if (req.file) {
                eliminarArchivoFoto(
                    req.file.filename
                );
            }

            if (
                error.code ===
                'ER_DUP_ENTRY'
            ) {
                return res.status(409).json({
                    mensaje:
                        'El número de empleado ya está registrado.'
                });
            }

            return next(error);
        }
    }
);

/* =====================================================
   ELIMINAR EMPLEADO CON TRANSACCIÓN
===================================================== */

app.delete(
    '/empleados/:id',

    validarIdEmpleado,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const idEmpleado =
            Number(
                req.params.id
            );

        let conexion;

        try {
            conexion =
                await dbPromise.getConnection();

            await conexion.beginTransaction();

            const [
                empleados
            ] = await conexion.query(
                `
                    SELECT
                        Foto,
                        NumeroEmpleado
                    FROM empleados
                    WHERE IdEmpleado = ?
                    LIMIT 1
                `,
                [
                    idEmpleado
                ]
            );

            if (
                empleados.length === 0
            ) {
                await conexion.rollback();
                conexion.release();

                return res.status(404).json({
                    mensaje:
                        'Empleado no encontrado.'
                });
            }

            const foto =
                empleados[0].Foto;

            const numeroEmpleado =
                empleados[0].NumeroEmpleado;

            await conexion.query(
                `
                    DELETE FROM horas_extras
                    WHERE NumeroEmpleado = ?
                `,
                [
                    numeroEmpleado
                ]
            );

            const [
                resultado
            ] = await conexion.query(
                `
                    DELETE FROM empleados
                    WHERE IdEmpleado = ?
                `,
                [
                    idEmpleado
                ]
            );

            if (
                resultado.affectedRows === 0
            ) {
                throw new Error(
                    'No se pudo eliminar el empleado.'
                );
            }

            await conexion.commit();
            conexion.release();
            conexion = null;

            if (foto) {
                eliminarArchivoFoto(
                    foto
                );
            }

            logger.warn({
                evento:
                    'EMPLEADO_ELIMINADO',

                id:
                    idEmpleado,

                numeroEmpleado,

                ip:
                    obtenerIp(req),

                nivel:
                    'MEDIO'
            });

            return res.status(200).json({
                mensaje:
                    'Empleado eliminado correctamente.'
            });
        } catch (error) {
            if (conexion) {
                try {
                    await conexion.rollback();
                } catch (
                    errorRollback
                ) {
                    logger.error({
                        evento:
                            'ERROR_ROLLBACK',

                        mensaje:
                            errorRollback.message
                    });
                }

                conexion.release();
            }

            return next(error);
        }
    }
);

/* =====================================================
   REGISTRAR HORA EXTRA
===================================================== */

app.post(
    '/horas-extras',

    validarHoraExtra,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const horaExtra =
            req.body || {};

        const numeroEmpleado =
            sanitizarTexto(
                horaExtra.numeroEmpleado
            );

        const horasTrabajo =
            Number(
                horaExtra.horasTrabajo
            );

        const pagoHora =
            Number(
                horaExtra.pagoHora
            );

        const totalPagar =
            Number(
                (
                    horasTrabajo *
                    pagoHora
                ).toFixed(2)
            );

        try {
            const [
                empleados
            ] = await dbPromise.query(
                `
                    SELECT IdEmpleado
                    FROM empleados
                    WHERE NumeroEmpleado = ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado
                ]
            );

            if (
                empleados.length === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'El número de empleado no existe.'
                });
            }

            const [
                resultado
            ] = await dbPromise.query(
                `
                    INSERT INTO horas_extras
                    (
                        NumeroEmpleado,
                        Fecha,
                        TipoHoraExtra,
                        Turno,
                        HorasTrabajo,
                        PagoHora,
                        TotalPagar
                    )
                    VALUES
                    (
                        ?,?,?,?,?,?,?
                    )
                `,
                [
                    numeroEmpleado,

                    convertirVacioANull(
                        horaExtra.fecha
                    ),

                    sanitizarTexto(
                        horaExtra.tipoHoraExtra
                    ),

                    convertirVacioANull(
                        horaExtra.turno
                    ),

                    horasTrabajo,

                    pagoHora,

                    totalPagar
                ]
            );

            logger.info({
                evento:
                    'HORA_EXTRA_REGISTRADA',

                numeroEmpleado,

                totalPagar,

                ip:
                    obtenerIp(req)
            });

            return res.status(201).json({
                mensaje:
                    'Hora extra guardada correctamente.',

                id:
                    resultado.insertId,

                totalPagar
            });
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   OBTENER HORAS EXTRA
===================================================== */

app.get(
    '/horas-extras',

    validarPaginacion,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const pagina =
            Number(
                req.query.page
            ) || 1;

        const limite =
            Number(
                req.query.limit
            ) || 100;

        const offset =
            (
                pagina - 1
            ) * limite;

        try {
            const [
                conteo
            ] = await dbPromise.query(
                `
                    SELECT COUNT(*) AS total
                    FROM horas_extras
                `
            );

            const [
                datos
            ] = await dbPromise.query(
                `
                    SELECT *
                    FROM horas_extras
                    ORDER BY
                        Fecha DESC,
                        IdHoraExtra DESC
                    LIMIT ?
                    OFFSET ?
                `,
                [
                    limite,
                    offset
                ]
            );

            res.setHeader(
                'X-Total-Count',
                String(
                    conteo[0].total
                )
            );

            res.setHeader(
                'X-Page',
                String(pagina)
            );

            res.setHeader(
                'X-Limit',
                String(limite)
            );

            return res.status(200).json(
                datos
            );
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   OBTENER HORA EXTRA POR ID
===================================================== */

app.get(
    '/horas-extras/:id',

    validarIdHoraExtra,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        try {
            const [
                datos
            ] = await dbPromise.query(
                `
                    SELECT *
                    FROM horas_extras
                    WHERE IdHoraExtra = ?
                    LIMIT 1
                `,
                [
                    Number(
                        req.params.id
                    )
                ]
            );

            if (
                datos.length === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'Registro de hora extra no encontrado.'
                });
            }

            return res.status(200).json(
                datos[0]
            );
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   ACTUALIZAR HORA EXTRA
===================================================== */

app.put(
    '/horas-extras/:id',

    validarIdHoraExtra,

    validarHoraExtra,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const idHoraExtra =
            Number(
                req.params.id
            );

        const horaExtra =
            req.body || {};

        const numeroEmpleado =
            sanitizarTexto(
                horaExtra.numeroEmpleado
            );

        const horasTrabajo =
            Number(
                horaExtra.horasTrabajo
            );

        const pagoHora =
            Number(
                horaExtra.pagoHora
            );

        const totalPagar =
            Number(
                (
                    horasTrabajo *
                    pagoHora
                ).toFixed(2)
            );

        try {
            const [
                empleados
            ] = await dbPromise.query(
                `
                    SELECT IdEmpleado
                    FROM empleados
                    WHERE NumeroEmpleado = ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado
                ]
            );

            if (
                empleados.length === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'El número de empleado no existe.'
                });
            }

            const [
                resultado
            ] = await dbPromise.query(
                `
                    UPDATE horas_extras
                    SET
                        NumeroEmpleado = ?,
                        Fecha = ?,
                        TipoHoraExtra = ?,
                        Turno = ?,
                        HorasTrabajo = ?,
                        PagoHora = ?,
                        TotalPagar = ?
                    WHERE IdHoraExtra = ?
                `,
                [
                    numeroEmpleado,

                    convertirVacioANull(
                        horaExtra.fecha
                    ),

                    sanitizarTexto(
                        horaExtra.tipoHoraExtra
                    ),

                    convertirVacioANull(
                        horaExtra.turno
                    ),

                    horasTrabajo,

                    pagoHora,

                    totalPagar,

                    idHoraExtra
                ]
            );

            if (
                resultado.affectedRows === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'Registro de hora extra no encontrado.'
                });
            }

            logger.info({
                evento:
                    'HORA_EXTRA_ACTUALIZADA',

                id:
                    idHoraExtra,

                numeroEmpleado,

                totalPagar,

                ip:
                    obtenerIp(req)
            });

            return res.status(200).json({
                mensaje:
                    'Hora extra actualizada correctamente.',

                totalPagar
            });
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   ELIMINAR HORA EXTRA
===================================================== */

app.delete(
    '/horas-extras/:id',

    validarIdHoraExtra,

    async (
        req,
        res,
        next
    ) => {
        if (
            responderErroresValidacion(
                req,
                res
            )
        ) {
            return;
        }

        const idHoraExtra =
            Number(
                req.params.id
            );

        try {
            const [
                resultado
            ] = await dbPromise.query(
                `
                    DELETE FROM horas_extras
                    WHERE IdHoraExtra = ?
                `,
                [
                    idHoraExtra
                ]
            );

            if (
                resultado.affectedRows === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'Registro de hora extra no encontrado.'
                });
            }

            logger.warn({
                evento:
                    'HORA_EXTRA_ELIMINADA',

                id:
                    idHoraExtra,

                ip:
                    obtenerIp(req),

                nivel:
                    'MEDIO'
            });

            return res.status(200).json({
                mensaje:
                    'Hora extra eliminada correctamente.'
            });
        } catch (error) {
            return next(error);
        }
    }
);
/* =====================================================
   OBTENER PAGOS
===================================================== */

app.get(
    '/pagos',

    async (
        req,
        res,
        next
    ) => {
        try {
            const [
                pagos
            ] = await dbPromise.query(
                `
                    SELECT
                        IdPago,
                        IdEmpleado,
                        NumeroEmpleado,
                        SueldoBase,
                        HorasExtras,
                        TotalHoras,
                        Deducciones,
                        NetoPagar,
                        Banco,
                        NumeroTarjeta,
                        FechaPago,
                        Estado,
                        FechaRegistro
                    FROM pagos
                    ORDER BY IdPago DESC
                `
            );

            return res.status(200).json(
                pagos
            );
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   REGISTRAR UN PAGO
===================================================== */

app.post(
    '/pagos',

    async (
        req,
        res,
        next
    ) => {
        const pago =
            req.body || {};

        const numeroEmpleado =
            sanitizarTexto(
                pago.numeroEmpleado
            );

        if (!numeroEmpleado) {
            return res.status(400).json({
                mensaje:
                    'El número de empleado es obligatorio.'
            });
        }

        const sueldoBase =
            Number(
                pago.sueldoBase || 0
            );

        const horasExtras =
            Number(
                pago.horasExtras || 0
            );

        const totalHoras =
            Number(
                pago.totalHoras || 0
            );

        const deducciones =
            Number(
                pago.deducciones || 0
            );

        const netoPagar =
            Number(
                pago.netoPagar || 0
            );

        if (
            !Number.isFinite(sueldoBase) ||
            !Number.isFinite(horasExtras) ||
            !Number.isFinite(totalHoras) ||
            !Number.isFinite(deducciones) ||
            !Number.isFinite(netoPagar) ||
            sueldoBase < 0 ||
            horasExtras < 0 ||
            totalHoras < 0 ||
            deducciones < 0 ||
            netoPagar < 0
        ) {
            return res.status(400).json({
                mensaje:
                    'Los datos del pago no son válidos.'
            });
        }

        const fechaPago =
            convertirVacioANull(
                pago.fechaPago
            ) ||
            new Date()
                .toISOString()
                .slice(0, 10);

        const estado =
            sanitizarTexto(
                pago.estado
            ) ||
            'Pagado';

        try {
            const [
                empleados
            ] = await dbPromise.query(
                `
                    SELECT IdEmpleado
                    FROM empleados
                    WHERE NumeroEmpleado = ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado
                ]
            );

            if (
                empleados.length === 0
            ) {
                return res.status(404).json({
                    mensaje:
                        'El empleado no existe.'
                });
            }

            const [
                pagosExistentes
            ] = await dbPromise.query(
                `
                    SELECT IdPago
                    FROM pagos
                    WHERE NumeroEmpleado = ?
                    AND FechaPago = ?
                    LIMIT 1
                `,
                [
                    numeroEmpleado,
                    fechaPago
                ]
            );

            if (
                pagosExistentes.length > 0
            ) {
                return res.status(409).json({
                    mensaje:
                        'El empleado ya tiene un pago registrado en esta fecha.'
                });
            }

            const [
                resultado
            ] = await dbPromise.query(
                `
                    INSERT INTO pagos
                    (
                        IdEmpleado,
                        NumeroEmpleado,
                        SueldoBase,
                        HorasExtras,
                        TotalHoras,
                        Deducciones,
                        NetoPagar,
                        Banco,
                        NumeroTarjeta,
                        FechaPago,
                        Estado
                    )
                    VALUES
                    (
                        ?,?,?,?,?,?,?,?,?,?,?
                    )
                `,
                [
                    numeroONull(
                        pago.idEmpleado
                    ) ||
                    empleados[0].IdEmpleado,

                    numeroEmpleado,

                    sueldoBase,

                    horasExtras,

                    totalHoras,

                    deducciones,

                    netoPagar,

                    convertirVacioANull(
                        pago.banco
                    ),

                    convertirVacioANull(
                        pago.numeroTarjeta
                    ),

                    fechaPago,

                    estado
                ]
            );

            logger.info({
                evento:
                    'PAGO_REGISTRADO',

                idPago:
                    resultado.insertId,

                numeroEmpleado,

                netoPagar,

                ip:
                    obtenerIp(req)
            });

            return res.status(201).json({
                mensaje:
                    'Pago registrado correctamente.',

                idPago:
                    resultado.insertId
            });
        } catch (error) {
            return next(error);
        }
    }
);

/* =====================================================
   REGISTRAR PAGOS MÚLTIPLES
===================================================== */

app.post(
    '/pagos-multiples',

    async (
        req,
        res,
        next
    ) => {
        const pagos =
            req.body?.pagos;

        if (
            !Array.isArray(pagos) ||
            pagos.length === 0
        ) {
            return res.status(400).json({
                mensaje:
                    'Debes enviar una lista de pagos.'
            });
        }

        let conexion;

        try {
            conexion =
                await dbPromise.getConnection();

            await conexion.beginTransaction();

            let cantidadInsertada = 0;

            for (
                const pago of pagos
            ) {
                const numeroEmpleado =
                    sanitizarTexto(
                        pago.numeroEmpleado
                    );

                if (!numeroEmpleado) {
                    throw Object.assign(
                        new Error(
                            'Todos los pagos deben incluir número de empleado.'
                        ),
                        {
                            status: 400
                        }
                    );
                }

                const fechaPago =
                    convertirVacioANull(
                        pago.fechaPago
                    ) ||
                    new Date()
                        .toISOString()
                        .slice(0, 10);

                const [
                    existentes
                ] = await conexion.query(
                    `
                        SELECT IdPago
                        FROM pagos
                        WHERE NumeroEmpleado = ?
                        AND FechaPago = ?
                        LIMIT 1
                    `,
                    [
                        numeroEmpleado,
                        fechaPago
                    ]
                );

                if (
                    existentes.length > 0
                ) {
                    continue;
                }

                await conexion.query(
                    `
                        INSERT INTO pagos
                        (
                            IdEmpleado,
                            NumeroEmpleado,
                            SueldoBase,
                            HorasExtras,
                            TotalHoras,
                            Deducciones,
                            NetoPagar,
                            Banco,
                            NumeroTarjeta,
                            FechaPago,
                            Estado
                        )
                        VALUES
                        (
                            ?,?,?,?,?,?,?,?,?,?,?
                        )
                    `,
                    [
                        numeroONull(
                            pago.idEmpleado
                        ),

                        numeroEmpleado,

                        Number(
                            pago.sueldoBase || 0
                        ),

                        Number(
                            pago.horasExtras || 0
                        ),

                        Number(
                            pago.totalHoras || 0
                        ),

                        Number(
                            pago.deducciones || 0
                        ),

                        Number(
                            pago.netoPagar || 0
                        ),

                        convertirVacioANull(
                            pago.banco
                        ),

                        convertirVacioANull(
                            pago.numeroTarjeta
                        ),

                        fechaPago,

                        sanitizarTexto(
                            pago.estado
                        ) ||
                        'Pagado'
                    ]
                );

                cantidadInsertada++;
            }

            await conexion.commit();
            conexion.release();
            conexion = null;

            logger.info({
                evento:
                    'PAGOS_MULTIPLES_REGISTRADOS',

                cantidad:
                    cantidadInsertada,

                ip:
                    obtenerIp(req)
            });

            return res.status(201).json({
                mensaje:
                    'Pagos registrados correctamente.',

                cantidad:
                    cantidadInsertada
            });
        } catch (error) {
            if (conexion) {
                try {
                    await conexion.rollback();
                } catch (
                    errorRollback
                ) {
                    logger.error({
                        evento:
                            'ERROR_ROLLBACK_PAGOS',

                        mensaje:
                            errorRollback.message
                    });
                }

                conexion.release();
            }

            return next(error);
        }
    }
);
/* =====================================================
   RUTA NO ENCONTRADA
===================================================== */

app.use(
    (
        req,
        res
    ) => {
        logger.warn({
            evento:
                'RUTA_NO_ENCONTRADA',

            metodo:
                req.method,

            ruta:
                req.originalUrl,

            ip:
                obtenerIp(req),

            nivel:
                'BAJO'
        });

        return res.status(404).json({
            mensaje:
                'La ruta solicitada no existe.'
        });
    }
);

/* =====================================================
   MANEJO GLOBAL DE ERRORES
===================================================== */

app.use(
    (
        error,
        req,
        res,
        next
    ) => {
        void next;

        if (
            error instanceof
            multer.MulterError
        ) {
            logger.warn({
                evento:
                    'ERROR_MULTER',

                codigo:
                    error.code,

                mensaje:
                    error.message,

                ip:
                    obtenerIp(req),

                nivel:
                    'MEDIO'
            });

            if (
                error.code ===
                'LIMIT_FILE_SIZE'
            ) {
                return res.status(400).json({
                    mensaje:
                        'La imagen no debe pesar más de 2 MB.'
                });
            }

            if (
                error.code ===
                'LIMIT_FILE_COUNT'
            ) {
                return res.status(400).json({
                    mensaje:
                        'Solo se permite subir una imagen.'
                });
            }

            if (
                error.code ===
                'LIMIT_FIELD_COUNT'
            ) {
                return res.status(400).json({
                    mensaje:
                        'La solicitud contiene demasiados campos.'
                });
            }

            return res.status(400).json({
                mensaje:
                    'Error al procesar la imagen.'
            });
        }

        if (
            error.tipo ===
            'ARCHIVO_NO_PERMITIDO'
        ) {
            return res.status(400).json({
                mensaje:
                    error.message
            });
        }

        if (
            error.tipo === 'CORS' ||
            error.status === 403
        ) {
            logger.warn({
                evento:
                    'ERROR_CORS',

                mensaje:
                    error.message,

                origen:
                    req.headers.origin ||
                    null,

                ip:
                    obtenerIp(req),

                nivel:
                    'MEDIO'
            });

            return res.status(403).json({
                mensaje:
                    'El origen de la solicitud no está permitido.'
            });
        }

        if (
            error.type ===
            'entity.too.large'
        ) {
            logger.warn({
                evento:
                    'SOLICITUD_DEMASIADO_GRANDE',

                ruta:
                    req.originalUrl,

                ip:
                    obtenerIp(req),

                nivel:
                    'MEDIO'
            });

            return res.status(413).json({
                mensaje:
                    'La solicitud supera el tamaño permitido.'
            });
        }

        if (
            error instanceof SyntaxError &&
            error.status === 400 &&
            'body' in error
        ) {
            logger.warn({
                evento:
                    'JSON_INVALIDO',

                ruta:
                    req.originalUrl,

                ip:
                    obtenerIp(req),

                nivel:
                    'MEDIO'
            });

            return res.status(400).json({
                mensaje:
                    'El formato JSON enviado no es válido.'
            });
        }

        logger.error({
            evento:
                'ERROR_SERVIDOR',

            codigo:
                error.code || null,

            mensaje:
                error.message,

            metodo:
                req.method,

            ruta:
                req.originalUrl,

            ip:
                obtenerIp(req)
        });

        console.error(
            'Error del servidor:',
            error
        );

        return res.status(
            error.status || 500
        ).json({
            mensaje:
                error.status &&
                error.status < 500
                    ? error.message
                    : 'Ocurrió un error interno en el servidor.'
        });
    }
);

/* =====================================================
   INICIAR SERVIDOR
===================================================== */

const servidor = app.listen(
    PUERTO,
    '0.0.0.0',
    () => {
        console.log(
            `Servidor iniciado en http://localhost:${PUERTO}`
        );

        console.log(
            'Helmet, CSP, CORS, validaciones, sanitización, rate limit y logs activados.'
        );

        logger.info({
            evento:
                'SERVIDOR_INICIADO',

            puerto:
                PUERTO,

            entorno:
                ENTORNO
        });
    }
);

/* =====================================================
   CIERRE SEGURO DEL SERVIDOR
===================================================== */

async function cerrarServidor(
    senal
) {
    logger.info({
        evento:
            'CIERRE_SERVIDOR',

        senal
    });

    servidor.close(
        async () => {
            try {
                await dbPromise.end();

                logger.info({
                    evento:
                        'MYSQL_CERRADO'
                });
            } catch (error) {
                logger.error({
                    evento:
                        'ERROR_CERRAR_MYSQL',

                    mensaje:
                        error.message
                });
            }

            process.exit(0);
        }
    );

    setTimeout(
        () => {
            process.exit(1);
        },
        10000
    ).unref();
}

process.on(
    'SIGINT',
    () => {
        cerrarServidor(
            'SIGINT'
        );
    }
);

process.on(
    'SIGTERM',
    () => {
        cerrarServidor(
            'SIGTERM'
        );
    }
);

/* =====================================================
   ERRORES DEL PROCESO
===================================================== */

process.on(
    'unhandledRejection',
    (motivo) => {
        logger.error({
            evento:
                'PROMESA_NO_CONTROLADA',

            mensaje:
                motivo instanceof Error
                    ? motivo.message
                    : String(motivo)
        });
    }
);

process.on(
    'uncaughtException',
    (error) => {
        logger.error({
            evento:
                'EXCEPCION_NO_CONTROLADA',

            mensaje:
                error.message,

            stack:
                error.stack
        });

        console.error(
            'Excepción no controlada:',
            error
        );

        process.exit(1);
    }
);
