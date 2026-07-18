import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse
} from '@angular/common/http';

@Component({
  selector: 'app-registrar-hora-extra',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HttpClientModule
  ],
  templateUrl:
    './registrar-hora-extra.component.html',
  styleUrls: [
    './registrar-hora-extra.component.css'
  ]
})
export class RegistrarHoraExtraComponent
  implements OnInit {

  private readonly apiEmpleados =
    '/api/empleados';

  private readonly apiHorasExtras =
    '/api/horas-extras';

  empleados: any[] = [];

  cargandoEmpleados = false;
  guardando = false;

  horaExtra: any =
    this.crearHoraExtraVacia();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.obtenerEmpleados();
  }

  /* =====================================================
     OBTENER EMPLEADOS
  ===================================================== */

  obtenerEmpleados(): void {
    if (this.cargandoEmpleados) {
      return;
    }

    this.cargandoEmpleados = true;

    this.http.get<any[]>(
      `${this.apiEmpleados}?page=1&limit=100`
    ).subscribe({
      next: (data: any[]) => {
        console.log(
          'Empleados obtenidos:',
          data
        );

        this.empleados =
          Array.isArray(data)
            ? data
            : [];

        this.cargandoEmpleados = false;
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al cargar empleados:',
          error
        );

        console.error(
          'Respuesta del backend:',
          error.error
        );

        this.empleados = [];
        this.cargandoEmpleados = false;

        alert(
          this.obtenerMensajeError(
            error,
            'No fue posible cargar los empleados.'
          )
        );
      }
    });
  }

  /* =====================================================
     SELECCIONAR EMPLEADO
  ===================================================== */

  seleccionarEmpleado(): void {
    const numeroSeleccionado =
      String(
        this.horaExtra.numeroEmpleado ||
        ''
      ).trim();

    const empleado =
      this.empleados.find(
        (item: any) => {
          const numeroEmpleado =
            String(
              item.NumeroEmpleado ??
              item.numeroEmpleado ??
              ''
            ).trim();

          return (
            numeroEmpleado ===
            numeroSeleccionado
          );
        }
      );

    if (!empleado) {
      this.horaExtra.nombreEmpleado = '';
      this.horaExtra.departamento = '';
      this.horaExtra.turno = '';

      return;
    }

    const nombre =
      empleado.Nombre ??
      empleado.nombre ??
      '';

    const apellidoPaterno =
      empleado.ApellidoPaterno ??
      empleado.apellidoPaterno ??
      '';

    const apellidoMaterno =
      empleado.ApellidoMaterno ??
      empleado.apellidoMaterno ??
      '';

    this.horaExtra.nombreEmpleado = [
      nombre,
      apellidoPaterno,
      apellidoMaterno
    ]
      .filter(
        (valor) =>
          Boolean(
            String(valor || '').trim()
          )
      )
      .join(' ')
      .trim();

    const idDepartamento =
      empleado.IdDepartamento ??
      empleado.idDepartamento;

    this.horaExtra.departamento =
      this.obtenerDepartamento(
        idDepartamento
      );

    const turnoEmpleado =
      empleado.Turno ??
      empleado.turno ??
      '';

    /*
      La base de datos guarda:

      Matutino
      Vespertino
      Nocturno

      El formulario muestra:

      1er Turno
      2do Turno
      3er Turno
    */
    this.horaExtra.turno =
      this.convertirTurnoParaFormulario(
        turnoEmpleado
      );
  }

  /* =====================================================
     OBTENER NOMBRE DEL DEPARTAMENTO
  ===================================================== */

  obtenerDepartamento(id: any): string {
    const numero = Number(id);

    const departamentos: {
      [key: number]: string
    } = {
      1: 'Producción',
      2: 'Calidad',
      3: 'Almacén',
      4: 'Recursos Humanos',
      5: 'Administración',
      6: 'Ventas'
    };

    return (
      departamentos[numero] ||
      'Sin departamento'
    );
  }

  /* =====================================================
     CALCULAR TOTAL
  ===================================================== */

  calcularTotal(): number {
    const horas = Number(
      this.horaExtra.horasTrabajo
    );

    const pago = Number(
      this.horaExtra.pagoHora
    );

    if (
      !Number.isFinite(horas) ||
      !Number.isFinite(pago)
    ) {
      return 0;
    }

    return Number(
      (
        horas * pago
      ).toFixed(2)
    );
  }

  /* =====================================================
     GUARDAR HORA EXTRA
  ===================================================== */

  guardarHoraExtra(): void {
    if (this.guardando) {
      return;
    }

    if (
      !this.validarFormulario()
    ) {
      return;
    }

    const turnoBackend =
      this.convertirTurnoParaBackend(
        this.horaExtra.turno
      );

    /*
      Se envían únicamente los campos que
      el server.js necesita para registrar
      una hora extra.
    */
    const datos = {
      numeroEmpleado:
        String(
          this.horaExtra.numeroEmpleado
        ).trim(),

      fecha:
        String(
          this.horaExtra.fecha
        ).trim(),

      tipoHoraExtra:
        String(
          this.horaExtra.tipoHoraExtra
        ).trim(),

      turno:
        turnoBackend,

      horasTrabajo:
        Number(
          this.horaExtra.horasTrabajo
        ),

      pagoHora:
        Number(
          this.horaExtra.pagoHora
        )
    };

    console.log(
      'Datos enviados al backend:',
      datos
    );

    this.guardando = true;

    this.http.post<any>(
      this.apiHorasExtras,
      datos
    ).subscribe({
      next: (respuesta) => {
        console.log(
          'Hora extra guardada:',
          respuesta
        );

        const total =
          respuesta?.totalPagar ??
          this.calcularTotal();

        alert(
          `${
            respuesta?.mensaje ||
            'Hora extra guardada correctamente.'
          }\n\nTotal a pagar: $${Number(
            total
          ).toFixed(2)}`
        );

        this.horaExtra =
          this.crearHoraExtraVacia();

        this.guardando = false;
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error completo al guardar la hora extra:',
          error
        );

        console.error(
          'Respuesta del backend:',
          error.error
        );

        alert(
          this.obtenerMensajeError(
            error,
            'Error al guardar la hora extra.'
          )
        );

        this.guardando = false;
      }
    });
  }

  /* =====================================================
     VALIDAR FORMULARIO
  ===================================================== */

  private validarFormulario(): boolean {
    const numeroEmpleado =
      String(
        this.horaExtra.numeroEmpleado ||
        ''
      ).trim();

    if (!numeroEmpleado) {
      alert(
        'Selecciona un empleado.'
      );

      return false;
    }

    if (
      !/^[a-zA-Z0-9_-]{1,30}$/.test(
        numeroEmpleado
      )
    ) {
      alert(
        'El número de empleado no es válido.'
      );

      return false;
    }

    const fecha =
      String(
        this.horaExtra.fecha ||
        ''
      ).trim();

    if (!fecha) {
      alert(
        'Selecciona la fecha.'
      );

      return false;
    }

    if (
      !this.esFechaValida(fecha)
    ) {
      alert(
        'La fecha seleccionada no es válida.'
      );

      return false;
    }

    const tipoHoraExtra =
      String(
        this.horaExtra.tipoHoraExtra ||
        ''
      ).trim();

    if (!tipoHoraExtra) {
      alert(
        'Selecciona el tipo de hora extra.'
      );

      return false;
    }

    if (
      tipoHoraExtra.length < 2 ||
      tipoHoraExtra.length > 100
    ) {
      alert(
        'El tipo de hora extra no es válido.'
      );

      return false;
    }

    const turno =
      this.convertirTurnoParaBackend(
        this.horaExtra.turno
      );

    const turnosValidos = [
      'Matutino',
      'Vespertino',
      'Nocturno'
    ];

    if (
      !turnosValidos.includes(turno)
    ) {
      alert(
        'Selecciona un turno válido.'
      );

      return false;
    }

    const horasTrabajo =
      Number(
        this.horaExtra.horasTrabajo
      );

    if (
      !Number.isFinite(
        horasTrabajo
      ) ||
      horasTrabajo < 0.5 ||
      horasTrabajo > 24
    ) {
      alert(
        'Las horas de trabajo deben estar entre 0.5 y 24.'
      );

      return false;
    }

    const pagoHora =
      Number(
        this.horaExtra.pagoHora
      );

    if (
      !Number.isFinite(pagoHora) ||
      pagoHora < 0 ||
      pagoHora > 100000
    ) {
      alert(
        'El pago por hora no es válido.'
      );

      return false;
    }

    return true;
  }

  /* =====================================================
     CONVERTIR TURNO PARA EL BACKEND
  ===================================================== */

  private convertirTurnoParaBackend(
    turno: any
  ): string {
    const valor =
      String(
        turno || ''
      ).trim();

    const equivalencias: {
      [key: string]: string
    } = {
      '1er Turno': 'Matutino',
      'Primer Turno': 'Matutino',
      'Matutino': 'Matutino',

      '2do Turno': 'Vespertino',
      'Segundo Turno': 'Vespertino',
      'Vespertino': 'Vespertino',

      '3er Turno': 'Nocturno',
      'Tercer Turno': 'Nocturno',
      'Nocturno': 'Nocturno'
    };

    return (
      equivalencias[valor] ||
      valor
    );
  }

  /* =====================================================
     CONVERTIR TURNO PARA EL FORMULARIO
  ===================================================== */

  private convertirTurnoParaFormulario(
    turno: any
  ): string {
    const valor =
      String(
        turno || ''
      ).trim();

    const equivalencias: {
      [key: string]: string
    } = {
      'Matutino': '1er Turno',
      'Vespertino': '2do Turno',
      'Nocturno': '3er Turno',

      '1er Turno': '1er Turno',
      '2do Turno': '2do Turno',
      '3er Turno': '3er Turno'
    };

    return (
      equivalencias[valor] ||
      valor
    );
  }

  /* =====================================================
     VALIDAR FECHA
  ===================================================== */

  private esFechaValida(
    fecha: string
  ): boolean {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        fecha
      )
    ) {
      return false;
    }

    const fechaConvertida =
      new Date(
        `${fecha}T00:00:00`
      );

    return !Number.isNaN(
      fechaConvertida.getTime()
    );
  }

  /* =====================================================
     CANCELAR
  ===================================================== */

  cancelar(): void {
    this.router.navigate([
      '/dashboard'
    ]);
  }

  /* =====================================================
     MENSAJES DE ERROR
  ===================================================== */

  private obtenerMensajeError(
    error: HttpErrorResponse,
    mensajePredeterminado: string
  ): string {
    if (error.status === 0) {
      return (
        'No se pudo conectar con el backend.\n\n' +
        'Verifica que:\n' +
        '1. node server.js esté encendido.\n' +
        '2. El backend esté usando el puerto 3000.\n' +
        '3. El proxy.conf.json esté configurado.\n' +
        '4. Angular se haya iniciado con npm start.'
      );
    }

    if (error.status === 400) {
      if (
        Array.isArray(
          error.error?.errores
        ) &&
        error.error.errores.length > 0
      ) {
        const detalles =
          error.error.errores
            .map(
              (item: any) => {
                const campo =
                  item.campo ||
                  'campo';

                const mensaje =
                  item.mensaje ||
                  'Dato no válido.';

                return (
                  `${campo}: ${mensaje}`
                );
              }
            )
            .join('\n');

        return (
          `${
            error.error?.mensaje ||
            'Existen datos no válidos.'
          }\n\n${detalles}`
        );
      }

      return (
        error.error?.mensaje ||
        error.error?.error ||
        'Los datos enviados no son válidos.'
      );
    }

    if (error.status === 403) {
      return (
        error.error?.mensaje ||
        'La solicitud fue bloqueada por la configuración de seguridad o CORS.'
      );
    }

    if (error.status === 404) {
      return (
        error.error?.mensaje ||
        'No se encontró el empleado o la ruta solicitada.'
      );
    }

    if (error.status === 409) {
      return (
        error.error?.mensaje ||
        'El registro ya existe.'
      );
    }

    if (error.status === 413) {
      return (
        error.error?.mensaje ||
        'La solicitud supera el tamaño permitido.'
      );
    }

    if (error.status === 429) {
      return (
        error.error?.mensaje ||
        'Se realizaron demasiadas solicitudes. Espera unos minutos.'
      );
    }

    if (error.status >= 500) {
      return (
        error.error?.mensaje ||
        error.error?.error ||
        'El backend tuvo un error al guardar en MySQL.'
      );
    }

    if (
      error.error?.mensaje
    ) {
      return error.error.mensaje;
    }

    if (
      error.error?.error
    ) {
      return error.error.error;
    }

    if (
      typeof error.error ===
      'string'
    ) {
      return error.error;
    }

    return mensajePredeterminado;
  }

  /* =====================================================
     CREAR HORA EXTRA VACÍA
  ===================================================== */

  private crearHoraExtraVacia(): any {
    return {
      numeroEmpleado: '',
      nombreEmpleado: '',
      departamento: '',
      fecha: '',
      tipoHoraExtra: '',
      turno: '',

      /*
        Tu captura muestra 3 horas.
        Puedes dejar 8 si quieres que
        aparezcan 8 por defecto.
      */
      horasTrabajo: 8,

      pagoHora: 100
    };
  }
}