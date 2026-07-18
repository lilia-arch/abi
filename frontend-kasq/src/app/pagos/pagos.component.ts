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
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse,
  HttpHeaders
} from '@angular/common/http';

import {
  catchError,
  finalize,
  forkJoin,
  of
} from 'rxjs';

/* =====================================================
   INTERFACES
===================================================== */

interface EmpleadoApi {
  IdEmpleado?: number;
  idEmpleado?: number;
  id_empleado?: number;

  NumeroEmpleado?: string;
  numeroEmpleado?: string;
  numero_empleado?: string;

  Nombre?: string;
  nombre?: string;

  ApellidoPaterno?: string;
  apellidoPaterno?: string;
  apellido_paterno?: string;

  ApellidoMaterno?: string;
  apellidoMaterno?: string;
  apellido_materno?: string;

  Foto?: string;
  foto?: string;

  IdDepartamento?: number;
  idDepartamento?: number;
  id_departamento?: number;

  Puesto?: string;
  puesto?: string;

  Banco?: string;
  banco?: string;

  NumeroTarjeta?: string;
  numeroTarjeta?: string;
  numero_tarjeta?: string;

  Salario?: number | string;
  salario?: number | string;
}

interface HoraExtraApi {
  IdEmpleado?: number;
  idEmpleado?: number;
  id_empleado?: number;

  NumeroEmpleado?: string;
  numeroEmpleado?: string;
  numero_empleado?: string;

  TotalPagar?: number | string;
  totalPagar?: number | string;

  TotalPago?: number | string;
  totalPago?: number | string;

  HorasTrabajo?: number | string;
  horasTrabajo?: number | string;

  HorasExtras?: number | string;
  horasExtras?: number | string;

  PagoHora?: number | string;
  pagoHora?: number | string;

  PagoPorHora?: number | string;
  pagoPorHora?: number | string;
}

interface PagoGuardadoApi {
  IdEmpleado?: number;
  idEmpleado?: number;
  id_empleado?: number;

  NumeroEmpleado?: string;
  numeroEmpleado?: string;
  numero_empleado?: string;

  FechaPago?: string | Date;
  fechaPago?: string | Date;

  Estado?: string;
  estado?: string;
}

interface Pago {
  idEmpleado: number;
  numeroEmpleado: string;

  nombre: string;
  foto: string;

  departamento: string;
  puesto: string;

  banco: string;
  ultimosDigitosTarjeta: string;

  sueldoBase: number;
  totalHoras: number;
  pagoHorasExtras: number;
  deducciones: number;
  netoPagar: number;

  fechaPago: string | Date;
  estado: 'Pendiente' | 'Pagado';

  pagando: boolean;
}

interface PayloadPago {
  idEmpleado: number;
  numeroEmpleado: string;
  fechaPago: string;
  estado: 'Pagado';
}

interface RespuestaLista<T> {
  empleados?: T[];
  horasExtras?: T[];
  horas_extras?: T[];
  pagos?: T[];
  data?: T[];
  resultado?: T[];
}

@Component({
  selector: 'app-pagos',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    HttpClientModule
  ],

  templateUrl:
    './pagos.component.html',

  styleUrls: [
    './pagos.component.css'
  ]
})
export class PagosComponent
implements OnInit {

  private readonly api =
    '/api';

  private readonly limiteMaximoPago =
    10_000_000;

  empleados: EmpleadoApi[] = [];
  horasExtras: HoraExtraApi[] = [];

  pagos: Pago[] = [];
  pagosFiltrados: Pago[] = [];

  cargando = false;
  pagandoTodos = false;

  buscarEmpleado = '';
  estadoSeleccionado = '';
  departamentoSeleccionado = '';

  mensaje = '';

  tipoMensaje:
    '' |
    'exito' |
    'error' = '';

  constructor(
    private readonly http:
      HttpClient,

    private readonly router:
      Router
  ) {}

  ngOnInit(): void {
    if (!this.verificarSesion()) {
      return;
    }

    this.cargarDatos();
  }

  /* =====================================================
     VERIFICAR SESIÓN
  ===================================================== */

  private verificarSesion(): boolean {
    const token =
      this.obtenerToken();

    if (!token) {
      this.limpiarSesion();

      void this.router.navigate(
        ['/login']
      );

      return false;
    }

    return true;
  }

  /* =====================================================
     OBTENER TOKEN
  ===================================================== */

  private obtenerToken(): string {
    const token =
      sessionStorage.getItem(
        'token'
      ) ??
      localStorage.getItem(
        'token'
      ) ??
      sessionStorage.getItem(
        'kasq_token'
      ) ??
      localStorage.getItem(
        'kasq_token'
      ) ??
      '';

    return token.trim();
  }

  /* =====================================================
     HEADERS DE AUTORIZACIÓN
  ===================================================== */

  private obtenerHeaders():
  HttpHeaders {
    return new HttpHeaders({
      'Content-Type':
        'application/json',

      Authorization:
        `Bearer ${this.obtenerToken()}`
    });
  }

  /* =====================================================
     CERRAR SESIÓN
  ===================================================== */

  cerrarSesion(): void {
    this.limpiarSesion();

    void this.router.navigate(
      ['/login']
    );
  }

  private cerrarSesionPorSeguridad():
  void {
    this.mostrarMensaje(
      'Tu sesión terminó o no tienes permiso para realizar esta acción.',
      'error'
    );

    this.limpiarSesion();

    window.setTimeout(
      () => {
        void this.router.navigate(
          ['/login']
        );
      },
      900
    );
  }

  private limpiarSesion(): void {
    const claves = [
      'token',
      'kasq_token',
      'usuario',
      'rol',
      'user',
      'auth'
    ];

    for (const clave of claves) {
      sessionStorage.removeItem(
        clave
      );

      localStorage.removeItem(
        clave
      );
    }
  }

  /* =====================================================
     MANEJAR 401 Y 403
  ===================================================== */

  private manejarErrorAutenticacion(
    error: HttpErrorResponse
  ): boolean {
    if (
      error.status === 401 ||
      error.status === 403
    ) {
      this.cerrarSesionPorSeguridad();

      return true;
    }

    return false;
  }

  /* =====================================================
     CARGAR DATOS
  ===================================================== */

  cargarDatos(): void {
    if (
      this.cargando ||
      !this.verificarSesion()
    ) {
      return;
    }

    this.cargando = true;
    this.mensaje = '';
    this.tipoMensaje = '';

    const headers =
      this.obtenerHeaders();

    forkJoin({
      empleados:
        this.http.get<
          EmpleadoApi[] |
          RespuestaLista<EmpleadoApi>
        >(
          `${this.api}/empleados`,
          { headers }
        )
        .pipe(
          catchError(
            (
              error:
              HttpErrorResponse
            ) => {
              if (
                this.manejarErrorAutenticacion(
                  error
                )
              ) {
                return of([]);
              }

              this.mostrarMensaje(
                this.obtenerMensajeError(
                  error,
                  'No fue posible cargar los empleados.'
                ),
                'error'
              );

              return of([]);
            }
          )
        ),

      horasExtras:
        this.http.get<
          HoraExtraApi[] |
          RespuestaLista<HoraExtraApi>
        >(
          `${this.api}/horas-extras`,
          { headers }
        )
        .pipe(
          catchError(
            (
              error:
              HttpErrorResponse
            ) => {
              if (
                this.manejarErrorAutenticacion(
                  error
                )
              ) {
                return of([]);
              }

              this.mostrarMensaje(
                this.obtenerMensajeError(
                  error,
                  'No fue posible cargar las horas extras.'
                ),
                'error'
              );

              return of([]);
            }
          )
        ),

      pagosGuardados:
        this.http.get<
          PagoGuardadoApi[] |
          RespuestaLista<PagoGuardadoApi>
        >(
          `${this.api}/pagos`,
          { headers }
        )
        .pipe(
          catchError(
            (
              error:
              HttpErrorResponse
            ) => {
              if (
                this.manejarErrorAutenticacion(
                  error
                )
              ) {
                return of([]);
              }

              if (
                error.status !== 404
              ) {
                this.mostrarMensaje(
                  this.obtenerMensajeError(
                    error,
                    'No fue posible cargar los pagos registrados.'
                  ),
                  'error'
                );
              }

              return of([]);
            }
          )
        )
    })
    .pipe(
      finalize(
        () => {
          this.cargando = false;
        }
      )
    )
    .subscribe({
      next: (
        respuesta
      ) => {
        this.empleados =
          this.convertirArreglo(
            respuesta.empleados,
            [
              'empleados',
              'data',
              'resultado'
            ]
          );

        this.horasExtras =
          this.convertirArreglo(
            respuesta.horasExtras,
            [
              'horasExtras',
              'horas_extras',
              'data',
              'resultado'
            ]
          );

        const pagosGuardados =
          this.convertirArreglo(
            respuesta.pagosGuardados,
            [
              'pagos',
              'data',
              'resultado'
            ]
          );

        this.generarPagos(
          pagosGuardados
        );
      },

      error: (
        error:
        HttpErrorResponse
      ) => {
        if (
          this.manejarErrorAutenticacion(
            error
          )
        ) {
          return;
        }

        this.mostrarMensaje(
          'Ocurrió un error inesperado al cargar los pagos.',
          'error'
        );
      }
    });
  }
    /* =====================================================
     GENERAR PAGOS
  ===================================================== */

  generarPagos(
    pagosGuardados:
      PagoGuardadoApi[]
  ): void {

    const pagosCalculados:
      Pago[] = [];

    for (
      const empleado
      of this.empleados
    ) {
      const idEmpleado =
        this.normalizarId(
          empleado.IdEmpleado ??
          empleado.idEmpleado ??
          empleado.id_empleado
        );

      const numeroEmpleado =
        this.normalizarNumeroEmpleado(
          empleado.NumeroEmpleado ??
          empleado.numeroEmpleado ??
          empleado.numero_empleado
        );

      if (
        !idEmpleado ||
        !numeroEmpleado
      ) {
        continue;
      }

      const sueldoBase =
        this.convertirNumeroLimitado(
          empleado.Salario ??
          empleado.salario ??
          0,
          0,
          this.limiteMaximoPago
        );

      const extrasEmpleado =
        this.obtenerHorasExtrasEmpleado(
          idEmpleado,
          numeroEmpleado
        );

      const pagoHorasExtras =
        this.calcularPagoHorasExtras(
          extrasEmpleado
        );

      const totalHoras =
        this.calcularTotalHoras(
          extrasEmpleado
        );

      const deducciones =
        this.redondearMoneda(
          sueldoBase * 0.10
        );

      const netoPagar =
        this.redondearMoneda(
          sueldoBase +
          pagoHorasExtras -
          deducciones
        );

      if (
        netoPagar < 0 ||
        netoPagar >
          this.limiteMaximoPago
      ) {
        continue;
      }

      const pagoExistente =
        this.buscarPagoExistente(
          pagosGuardados,
          idEmpleado,
          numeroEmpleado
        );

      const numeroTarjeta =
        this.normalizarTexto(
          empleado.NumeroTarjeta ??
          empleado.numeroTarjeta ??
          empleado.numero_tarjeta,
          30
        );

      pagosCalculados.push({
        idEmpleado,

        numeroEmpleado,

        nombre:
          this.obtenerNombreCompleto(
            empleado
          ),

        foto:
          this.normalizarRutaFoto(
            empleado.Foto ??
            empleado.foto
          ),

        departamento:
          this.obtenerDepartamento(
            empleado.IdDepartamento ??
            empleado.idDepartamento ??
            empleado.id_departamento
          ),

        puesto:
          this.normalizarTexto(
            empleado.Puesto ??
            empleado.puesto ??
            'Sin puesto',
            80
          ),

        banco:
          this.normalizarTexto(
            empleado.Banco ??
            empleado.banco ??
            'Sin banco',
            50
          ),

        ultimosDigitosTarjeta:
          this.extraerUltimosDigitos(
            numeroTarjeta
          ),

        sueldoBase,

        totalHoras,

        pagoHorasExtras,

        deducciones,

        netoPagar,

        fechaPago:
          pagoExistente?.FechaPago ??
          pagoExistente?.fechaPago ??
          new Date(),

        estado:
          this.normalizarEstadoPago(
            pagoExistente?.Estado ??
            pagoExistente?.estado ??
            'Pendiente'
          ),

        pagando: false
      });
    }

    this.pagos =
      pagosCalculados;

    this.pagosFiltrados = [
      ...pagosCalculados
    ];
  }

  /* =====================================================
     BUSCAR HORAS EXTRAS
  ===================================================== */

  private obtenerHorasExtrasEmpleado(
    idEmpleado: number,
    numeroEmpleado: string
  ): HoraExtraApi[] {

    return this.horasExtras.filter(
      (
        hora:
        HoraExtraApi
      ) => {

        const idHora =
          this.normalizarId(
            hora.IdEmpleado ??
            hora.idEmpleado ??
            hora.id_empleado
          );

        const numeroHora =
          this.normalizarNumeroEmpleado(
            hora.NumeroEmpleado ??
            hora.numeroEmpleado ??
            hora.numero_empleado
          );

        const coincideId =
          idHora ===
          idEmpleado;

        const coincideNumero =
          numeroHora !== '' &&
          numeroHora ===
          numeroEmpleado;

        return (
          coincideId ||
          coincideNumero
        );
      }
    );
  }

  /* =====================================================
     CALCULAR PAGO DE HORAS EXTRAS
  ===================================================== */

  private calcularPagoHorasExtras(
    registros:
      HoraExtraApi[]
  ): number {

    let total = 0;

    for (
      const registro
      of registros
    ) {
      const totalBackend =
        this.convertirNumeroLimitado(
          registro.TotalPagar ??
          registro.totalPagar ??
          registro.TotalPago ??
          registro.totalPago ??
          0,
          0,
          this.limiteMaximoPago
        );

      if (
        totalBackend > 0
      ) {
        total += totalBackend;
      } else {
        const horas =
          this.convertirNumeroLimitado(
            registro.HorasTrabajo ??
            registro.horasTrabajo ??
            registro.HorasExtras ??
            registro.horasExtras ??
            0,
            0,
            500
          );

        const pagoHora =
          this.convertirNumeroLimitado(
            registro.PagoHora ??
            registro.pagoHora ??
            registro.PagoPorHora ??
            registro.pagoPorHora ??
            0,
            0,
            100_000
          );

        total +=
          horas * pagoHora;
      }

      if (
        total >
        this.limiteMaximoPago
      ) {
        return 0;
      }
    }

    return this.redondearMoneda(
      total
    );
  }

  /* =====================================================
     CALCULAR TOTAL DE HORAS
  ===================================================== */

  private calcularTotalHoras(
    registros:
      HoraExtraApi[]
  ): number {

    let total = 0;

    for (
      const registro
      of registros
    ) {
      total +=
        this.convertirNumeroLimitado(
          registro.HorasTrabajo ??
          registro.horasTrabajo ??
          registro.HorasExtras ??
          registro.horasExtras ??
          0,
          0,
          500
        );

      if (
        total > 10_000
      ) {
        return 0;
      }
    }

    return this.redondearMoneda(
      total
    );
  }

  /* =====================================================
     BUSCAR PAGO EXISTENTE
  ===================================================== */

  private buscarPagoExistente(
    pagosGuardados:
      PagoGuardadoApi[],
    idEmpleado: number,
    numeroEmpleado: string
  ): PagoGuardadoApi |
     undefined {

    return pagosGuardados.find(
      (
        pago:
        PagoGuardadoApi
      ) => {

        const idPago =
          this.normalizarId(
            pago.IdEmpleado ??
            pago.idEmpleado ??
            pago.id_empleado
          );

        const numeroPago =
          this.normalizarNumeroEmpleado(
            pago.NumeroEmpleado ??
            pago.numeroEmpleado ??
            pago.numero_empleado
          );

        return (
          idPago ===
            idEmpleado ||
          (
            numeroPago !== '' &&
            numeroPago ===
              numeroEmpleado
          )
        );
      }
    );
  }

  /* =====================================================
     PAGAR UN EMPLEADO
  ===================================================== */

  pagarEmpleado(
    pago: Pago
  ): void {

    if (
      pago.pagando ||
      pago.estado ===
        'Pagado' ||
      this.pagandoTodos
    ) {
      return;
    }

    if (
      !this.verificarSesion()
    ) {
      return;
    }

    if (
      !this.validarPago(
        pago
      )
    ) {
      this.mostrarMensaje(
        'Los datos del pago no son válidos.',
        'error'
      );

      return;
    }

    const confirmar =
      window.confirm(
        `¿Deseas registrar el pago de ${pago.nombre} por ${this.formatearMoneda(pago.netoPagar)}?`
      );

    if (!confirmar) {
      return;
    }

    pago.pagando = true;

    const datosPago:
      PayloadPago = {

      idEmpleado:
        pago.idEmpleado,

      numeroEmpleado:
        pago.numeroEmpleado,

      fechaPago:
        this.formatearFechaMysql(
          new Date()
        ),

      estado:
        'Pagado'
    };

    this.http.post<{
      mensaje?: string;
    }>(
      `${this.api}/pagos`,
      datosPago,
      {
        headers:
          this.obtenerHeaders()
      }
    )
    .pipe(
      finalize(
        () => {
          pago.pagando =
            false;
        }
      )
    )
    .subscribe({
      next: (
        respuesta
      ) => {

        pago.estado =
          'Pagado';

        pago.fechaPago =
          new Date();

        this.mostrarMensaje(
          this.normalizarTexto(
            respuesta?.mensaje,
            200
          ) ||
          'Pago registrado correctamente.',
          'exito'
        );
      },

      error: (
        error:
        HttpErrorResponse
      ) => {

        if (
          this.manejarErrorAutenticacion(
            error
          )
        ) {
          return;
        }

        this.mostrarMensaje(
          this.obtenerMensajeError(
            error,
            'No fue posible registrar el pago.'
          ),
          'error'
        );
      }
    });
  }

  /* =====================================================
     PAGAR TODOS
  ===================================================== */

  pagarTodos(): void {

    if (
      this.pagandoTodos ||
      this.cargando
    ) {
      return;
    }

    if (
      !this.verificarSesion()
    ) {
      return;
    }

    const pendientes =
      this.pagosFiltrados
        .filter(
          (
            pago:
            Pago
          ) =>
            pago.estado !==
              'Pagado'
        )
        .filter(
          (
            pago:
            Pago
          ) =>
            this.validarPago(
              pago
            )
        );

    if (
      pendientes.length === 0
    ) {
      this.mostrarMensaje(
        'No hay pagos pendientes válidos.',
        'error'
      );

      return;
    }

    const confirmar =
      window.confirm(
        `¿Deseas registrar ${pendientes.length} pagos pendientes?`
      );

    if (!confirmar) {
      return;
    }

    this.pagandoTodos =
      true;

    const fechaActual =
      this.formatearFechaMysql(
        new Date()
      );

    const datos:
      PayloadPago[] =
      pendientes.map(
        (
          pago:
          Pago
        ) => ({
          idEmpleado:
            pago.idEmpleado,

          numeroEmpleado:
            pago.numeroEmpleado,

          fechaPago:
            fechaActual,

          estado:
            'Pagado'
        })
      );

    this.http.post<{
      mensaje?: string;
      registrosInsertados?: number;
    }>(
      `${this.api}/pagos-multiples`,
      {
        pagos: datos
      },
      {
        headers:
          this.obtenerHeaders()
      }
    )
    .pipe(
      finalize(
        () => {
          this.pagandoTodos =
            false;
        }
      )
    )
    .subscribe({
      next: (
        respuesta
      ) => {

        for (
          const pago
          of pendientes
        ) {
          pago.estado =
            'Pagado';

          pago.fechaPago =
            new Date();
        }

        this.mostrarMensaje(
          this.normalizarTexto(
            respuesta?.mensaje,
            200
          ) ||
          'Todos los pagos fueron registrados.',
          'exito'
        );
      },

      error: (
        error:
        HttpErrorResponse
      ) => {

        if (
          this.manejarErrorAutenticacion(
            error
          )
        ) {
          return;
        }

        this.mostrarMensaje(
          this.obtenerMensajeError(
            error,
            'No fue posible registrar todos los pagos.'
          ),
          'error'
        );
      }
    });
  }

  /* =====================================================
     VALIDAR PAGO
  ===================================================== */

  private validarPago(
    pago: Pago
  ): boolean {

    if (
      !Number.isInteger(
        pago.idEmpleado
      ) ||
      pago.idEmpleado <= 0
    ) {
      return false;
    }

    if (
      !this.normalizarNumeroEmpleado(
        pago.numeroEmpleado
      )
    ) {
      return false;
    }

    const cantidades = [
      pago.sueldoBase,
      pago.totalHoras,
      pago.pagoHorasExtras,
      pago.deducciones,
      pago.netoPagar
    ];

    const cantidadesValidas =
      cantidades.every(
        (
          cantidad:
          number
        ) =>
          Number.isFinite(
            cantidad
          ) &&
          cantidad >= 0 &&
          cantidad <=
            this.limiteMaximoPago
      );

    if (
      !cantidadesValidas
    ) {
      return false;
    }

    const netoEsperado =
      this.redondearMoneda(
        pago.sueldoBase +
        pago.pagoHorasExtras -
        pago.deducciones
      );

    return (
      Math.abs(
        netoEsperado -
        pago.netoPagar
      ) < 0.01
    );
  }
    /* =====================================================
     FILTRAR PAGOS
  ===================================================== */

  filtrarPagos(): void {
    const busqueda =
      this.normalizarTexto(
        this.buscarEmpleado,
        100
      ).toLowerCase();

    const estado =
      this.normalizarTexto(
        this.estadoSeleccionado,
        20
      );

    const departamento =
      this.normalizarTexto(
        this.departamentoSeleccionado,
        80
      );

    this.pagosFiltrados =
      this.pagos.filter(
        (
          pago:
          Pago
        ) => {
          const nombre =
            pago.nombre
              .toLowerCase();

          const numeroEmpleado =
            pago.numeroEmpleado
              .toLowerCase();

          const coincideBusqueda =
            !busqueda ||
            nombre.includes(
              busqueda
            ) ||
            numeroEmpleado.includes(
              busqueda
            );

          const coincideEstado =
            !estado ||
            pago.estado ===
              estado;

          const coincideDepartamento =
            !departamento ||
            pago.departamento ===
              departamento;

          return (
            coincideBusqueda &&
            coincideEstado &&
            coincideDepartamento
          );
        }
      );
  }

  limpiarFiltros(): void {
    this.buscarEmpleado = '';
    this.estadoSeleccionado = '';
    this.departamentoSeleccionado = '';

    this.pagosFiltrados = [
      ...this.pagos
    ];
  }

  /* =====================================================
     TOTALES
  ===================================================== */

  totalPagos(): number {
    return this.pagosFiltrados.length;
  }

  totalPagados(): number {
    return this.pagosFiltrados.filter(
      (
        pago:
        Pago
      ) =>
        pago.estado ===
          'Pagado'
    ).length;
  }

  totalPendientes(): number {
    return this.pagosFiltrados.filter(
      (
        pago:
        Pago
      ) =>
        pago.estado !==
          'Pagado'
    ).length;
  }

  montoTotal(): number {
    return this.redondearMoneda(
      this.pagosFiltrados.reduce(
        (
          total:
          number,
          pago:
          Pago
        ) => {
          if (
            !Number.isFinite(
              pago.netoPagar
            ) ||
            pago.netoPagar < 0 ||
            pago.netoPagar >
              this.limiteMaximoPago
          ) {
            return total;
          }

          return (
            total +
            pago.netoPagar
          );
        },
        0
      )
    );
  }

  montoPagado(): number {
    return this.redondearMoneda(
      this.pagosFiltrados
        .filter(
          (
            pago:
            Pago
          ) =>
            pago.estado ===
              'Pagado'
        )
        .reduce(
          (
            total:
            number,
            pago:
            Pago
          ) => {
            if (
              !Number.isFinite(
                pago.netoPagar
              ) ||
              pago.netoPagar < 0 ||
              pago.netoPagar >
                this.limiteMaximoPago
            ) {
              return total;
            }

            return (
              total +
              pago.netoPagar
            );
          },
          0
        )
    );
  }

  /* =====================================================
     NOMBRE COMPLETO
  ===================================================== */

  obtenerNombreCompleto(
    empleado:
      EmpleadoApi
  ): string {
    const partes = [
      empleado.Nombre ??
      empleado.nombre,

      empleado.ApellidoPaterno ??
      empleado.apellidoPaterno ??
      empleado.apellido_paterno,

      empleado.ApellidoMaterno ??
      empleado.apellidoMaterno ??
      empleado.apellido_materno
    ]
      .map(
        (
          valor:
          unknown
        ) =>
          this.normalizarTexto(
            valor,
            50
          )
      )
      .filter(
        (
          valor:
          string
        ) =>
          valor !== ''
      );

    return (
      partes.join(' ') ||
      'Empleado sin nombre'
    );
  }

  /* =====================================================
     DEPARTAMENTO
  ===================================================== */

  obtenerDepartamento(
    id:
      unknown
  ): string {
    const departamentos:
      Record<
        number,
        string
      > = {
        1: 'Producción',
        2: 'Calidad',
        3: 'Almacén',
        4: 'Mantenimiento',
        5: 'Recursos Humanos'
      };

    return (
      departamentos[
        Number(id)
      ] ??
      'Sin departamento'
    );
  }

  /* =====================================================
     FOTO SEGURA
  ===================================================== */

  fotoEmpleado(foto: string): string {
  const ruta = this.normalizarRutaFoto(foto);

  return ruta || 'assets/usuario-default.png';
}

manejarErrorFoto(evento: Event): void {
  const imagen = evento.target as HTMLImageElement;

  imagen.onerror = null;
  imagen.src = 'assets/usuario-default.png';
}

private normalizarRutaFoto(valor: unknown): string {
  const foto = String(valor ?? '')
    .trim()
    .replace(/\\/g, '/');

  if (!foto) {
    return '';
  }

  // Imagen almacenada como URL completa
  if (
    foto.startsWith('http://') ||
    foto.startsWith('https://')
  ) {
    return foto;
  }

  // Imagen dentro de assets
  if (foto.startsWith('/assets/')) {
    return foto;
  }

  if (foto.startsWith('assets/')) {
    return foto;
  }

  // Imagen dentro de uploads
  if (foto.startsWith('/uploads/')) {
    return foto;
  }

  if (foto.startsWith('uploads/')) {
    return `/${foto}`;
  }

  // MySQL solamente devuelve el nombre del archivo
  return `/uploads/${encodeURIComponent(foto)}`;
}
  /* =====================================================
     TARJETA ENMASCARADA
  ===================================================== */

  obtenerUltimosDigitos(
    valor:
      string
  ): string {
    const ultimos =
      this.extraerUltimosDigitos(
        valor
      );

    return ultimos
      ? `**** ${ultimos}`
      : 'Sin tarjeta';
  }

  private extraerUltimosDigitos(
    valor:
      string
  ): string {
    const digitos =
      String(
        valor ?? ''
      ).replace(
        /\D/g,
        ''
      );

    return digitos.length >= 4
      ? digitos.slice(-4)
      : '';
  }

  /* =====================================================
     FECHAS
  ===================================================== */

  formatearFecha(
    fecha:
      string |
      Date
  ): string {
    const fechaConvertida =
      fecha instanceof Date
        ? new Date(
            fecha.getTime()
          )
        : new Date(
            fecha
          );

    if (
      Number.isNaN(
        fechaConvertida.getTime()
      )
    ) {
      return 'Sin fecha';
    }

    return fechaConvertida
      .toLocaleDateString(
        'es-MX',
        {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        }
      );
  }

  private formatearFechaMysql(
    fecha:
      Date
  ): string {
    if (
      !(fecha instanceof Date) ||
      Number.isNaN(
        fecha.getTime()
      )
    ) {
      throw new Error(
        'La fecha del pago no es válida.'
      );
    }

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(
        2,
        '0'
      );

    const dia =
      String(
        fecha.getDate()
      ).padStart(
        2,
        '0'
      );

    return `${anio}-${mes}-${dia}`;
  }

  /* =====================================================
     MONEDA
  ===================================================== */

  formatearMoneda(
    cantidad:
      number
  ): string {
    const monto =
      this.convertirNumeroLimitado(
        cantidad,
        0,
        this.limiteMaximoPago
      );

    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN'
      }
    ).format(
      monto
    );
  }

  /* =====================================================
     NORMALIZAR ID
  ===================================================== */

  private normalizarId(
    valor:
      unknown
  ): number | null {
    const numero =
      Number(valor);

    if (
      !Number.isInteger(
        numero
      ) ||
      numero <= 0
    ) {
      return null;
    }

    return numero;
  }

  /* =====================================================
     NORMALIZAR NÚMERO DE EMPLEADO
  ===================================================== */

  private normalizarNumeroEmpleado(
    valor:
      unknown
  ): string {
    return this.normalizarTexto(
      valor,
      30
    )
      .toUpperCase()
      .replace(
        /[^A-Z0-9_-]/g,
        ''
      );
  }

  /* =====================================================
     NORMALIZAR TEXTO
  ===================================================== */

  private normalizarTexto(
    valor:
      unknown,
    longitudMaxima = 150
  ): string {
    return String(
      valor ?? ''
    )
      .replace(
        /[\u0000-\u001F\u007F]/g,
        ''
      )
      .trim()
      .slice(
        0,
        longitudMaxima
      );
  }

  /* =====================================================
     CONVERTIR NÚMEROS
  ===================================================== */

  private convertirNumeroLimitado(
    valor:
      unknown,
    minimo:
      number,
    maximo:
      number
  ): number {
    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return 0;
    }

    let numero:
      number;

    if (
      typeof valor ===
        'number'
    ) {
      numero = valor;
    } else {
      const limpio =
        String(valor)
          .replace(
            /MX\$/gi,
            ''
          )
          .replace(
            /\$/g,
            ''
          )
          .replace(
            /,/g,
            ''
          )
          .replace(
            /\s/g,
            ''
          );

      numero =
        Number(limpio);
    }

    if (
      !Number.isFinite(
        numero
      ) ||
      numero < minimo ||
      numero > maximo
    ) {
      return 0;
    }

    return this.redondearMoneda(
      numero
    );
  }

  private redondearMoneda(
    valor:
      number
  ): number {
    return (
      Math.round(
        valor * 100
      ) / 100
    );
  }

  /* =====================================================
     CONVERTIR RESPUESTAS A ARREGLO
  ===================================================== */

  private convertirArreglo<T>(
    respuesta:
      T[] |
      RespuestaLista<T> |
      null |
      undefined,
    propiedades:
      string[]
  ): T[] {
    if (
      Array.isArray(
        respuesta
      )
    ) {
      return respuesta;
    }

    if (
      !respuesta ||
      typeof respuesta !==
        'object'
    ) {
      return [];
    }

    const objeto =
      respuesta as
        Record<
          string,
          unknown
        >;

    for (
      const propiedad
      of propiedades
    ) {
      const valor =
        objeto[
          propiedad
        ];

      if (
        Array.isArray(
          valor
        )
      ) {
        return valor as T[];
      }
    }

    return [];
  }

  /* =====================================================
     ESTADO DEL PAGO
  ===================================================== */

  private normalizarEstadoPago(
    valor:
      unknown
  ): 'Pendiente' |
     'Pagado' {
    const estado =
      this.normalizarTexto(
        valor,
        20
      );

    return estado ===
      'Pagado'
      ? 'Pagado'
      : 'Pendiente';
  }

  /* =====================================================
     MENSAJES
  ===================================================== */

  private mostrarMensaje(
    mensaje:
      string,
    tipo:
      'exito' |
      'error'
  ): void {
    const mensajeSeguro =
      this.normalizarTexto(
        mensaje,
        300
      );

    this.mensaje =
      mensajeSeguro;

    this.tipoMensaje =
      tipo;

    window.setTimeout(
      () => {
        if (
          this.mensaje ===
          mensajeSeguro
        ) {
          this.mensaje = '';
          this.tipoMensaje = '';
        }
      },
      5000
    );
  }

  /* =====================================================
     ERRORES DEL BACKEND
  ===================================================== */

  private obtenerMensajeError(
    error:
      HttpErrorResponse,
    mensajePredeterminado:
      string
  ): string {
    if (
      error.status === 0
    ) {
      return 'No fue posible conectar con el servidor.';
    }

    if (
      error.status === 400
    ) {
      return (
        this.extraerMensajeBackend(
          error
        ) ||
        'Los datos enviados no son válidos.'
      );
    }

    if (
      error.status === 404
    ) {
      return 'La ruta solicitada no existe en el backend.';
    }

    if (
      error.status === 409
    ) {
      return (
        this.extraerMensajeBackend(
          error
        ) ||
        'El pago ya fue registrado.'
      );
    }

    if (
      error.status === 413
    ) {
      return 'La solicitud supera el tamaño permitido.';
    }

    if (
      error.status === 429
    ) {
      return 'Se realizaron demasiadas solicitudes. Espera un momento.';
    }

    if (
      error.status >= 500
    ) {
      return 'El servidor presentó un error. Intenta más tarde.';
    }

    return (
      this.extraerMensajeBackend(
        error
      ) ||
      mensajePredeterminado
    );
  }

  private extraerMensajeBackend(
    error:
      HttpErrorResponse
  ): string {
    if (
      !error.error ||
      typeof error.error !==
        'object'
    ) {
      return '';
    }

    const respuesta =
      error.error as
        Record<
          string,
          unknown
        >;

    const mensaje =
      respuesta['mensaje'] ??
      respuesta['message'] ??
      respuesta['error'];

    if (
      typeof mensaje !==
        'string'
    ) {
      return '';
    }

    return this.normalizarTexto(
      mensaje,
      200
    );
  }

  /* =====================================================
     TRACK BY
  ===================================================== */

  trackByEmpleado(
    index:
      number,
    pago:
      Pago
  ): number {
    return pago.idEmpleado;
  }
}