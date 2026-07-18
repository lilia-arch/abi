import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse
} from '@angular/common/http';

import {
  forkJoin,
  catchError,
  of
} from 'rxjs';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    HttpClientModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  private readonly api = '/api';

  empleados: any[] = [];
  horasExtras: any[] = [];
  pagos: any[] = [];

  cargando = false;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {

    if (!this.tieneSesionValida()) {
      this.cerrarSesion();
      return;
    }

    this.cargarDatos();
  }

  // =====================================
  // VALIDAR SESIÓN
  // =====================================

  private tieneSesionValida(): boolean {

    const token =
      localStorage.getItem('token');

    return token === 'KASQ-TOKEN';
  }

  // =====================================
  // CERRAR SESIÓN
  // =====================================

  cerrarSesion(): void {

    localStorage.removeItem('token');
    sessionStorage.removeItem('token');

    this.empleados = [];
    this.horasExtras = [];
    this.pagos = [];

    this.router.navigate(['/']);
  }

  // =====================================
  // MANEJAR ERRORES HTTP
  // =====================================

  private manejarErrorHttp(
    error: HttpErrorResponse,
    recurso: string
  ): void {

    if (
      error.status === 401 ||
      error.status === 403
    ) {
      this.cerrarSesion();
      return;
    }

    if (error.status === 0) {
      console.error(
        `No se pudo conectar con el servidor al cargar ${recurso}.`
      );

      return;
    }

    console.error(
      `Error al cargar ${recurso}. Código: ${error.status}`
    );
  }

  // =====================================
  // CARGAR TODO EL DASHBOARD
  // =====================================

  cargarDatos(): void {

    if (!this.tieneSesionValida()) {
      this.cerrarSesion();
      return;
    }

    this.cargando = true;

    forkJoin({
      empleados: this.http
        .get<any>(
          `${this.api}/empleados`
        )
        .pipe(
          catchError(
            (
              error: HttpErrorResponse
            ) => {

              this.manejarErrorHttp(
                error,
                'empleados'
              );

              return of([]);
            }
          )
        ),

      horasExtras: this.http
        .get<any>(
          `${this.api}/horas-extras`
        )
        .pipe(
          catchError(
            (
              error: HttpErrorResponse
            ) => {

              this.manejarErrorHttp(
                error,
                'horas extras'
              );

              return of([]);
            }
          )
        ),

      pagos: this.http
        .get<any>(
          `${this.api}/pagos`
        )
        .pipe(
          catchError(
            (
              error: HttpErrorResponse
            ) => {

              this.manejarErrorHttp(
                error,
                'pagos'
              );

              return of([]);
            }
          )
        )
    }).subscribe({
      next: (respuesta) => {

        if (!this.tieneSesionValida()) {
          this.cerrarSesion();
          return;
        }

        this.empleados =
          this.convertirArreglo(
            respuesta.empleados,
            [
              'empleados',
              'data',
              'resultado',
              'results'
            ]
          );

        this.horasExtras =
          this.convertirArreglo(
            respuesta.horasExtras,
            [
              'horasExtras',
              'horas_extras',
              'data',
              'resultado',
              'results'
            ]
          );

        this.pagos =
          this.convertirArreglo(
            respuesta.pagos,
            [
              'pagos',
              'data',
              'resultado',
              'results'
            ]
          );

        this.cargando = false;
      },

      error: (
        error: HttpErrorResponse
      ) => {

        this.manejarErrorHttp(
          error,
          'dashboard'
        );

        this.empleados = [];
        this.horasExtras = [];
        this.pagos = [];
        this.cargando = false;
      }
    });
  }

  // =====================================
  // OBTENER EMPLEADOS
  // =====================================

  obtenerEmpleados(): void {

    if (!this.tieneSesionValida()) {
      this.cerrarSesion();
      return;
    }

    this.http
      .get<any>(
        `${this.api}/empleados`
      )
      .subscribe({
        next: (data) => {

          this.empleados =
            this.convertirArreglo(
              data,
              [
                'empleados',
                'data',
                'resultado',
                'results'
              ]
            );
        },

        error: (
          error: HttpErrorResponse
        ) => {

          this.manejarErrorHttp(
            error,
            'empleados'
          );

          this.empleados = [];
        }
      });
  }

  // =====================================
  // OBTENER HORAS EXTRAS
  // =====================================

  obtenerHorasExtras(): void {

    if (!this.tieneSesionValida()) {
      this.cerrarSesion();
      return;
    }

    this.http
      .get<any>(
        `${this.api}/horas-extras`
      )
      .subscribe({
        next: (data) => {

          this.horasExtras =
            this.convertirArreglo(
              data,
              [
                'horasExtras',
                'horas_extras',
                'data',
                'resultado',
                'results'
              ]
            );
        },

        error: (
          error: HttpErrorResponse
        ) => {

          this.manejarErrorHttp(
            error,
            'horas extras'
          );

          this.horasExtras = [];
        }
      });
  }

  // =====================================
  // OBTENER PAGOS
  // =====================================

  obtenerPagos(): void {

    if (!this.tieneSesionValida()) {
      this.cerrarSesion();
      return;
    }

    this.http
      .get<any>(
        `${this.api}/pagos`
      )
      .subscribe({
        next: (data) => {

          this.pagos =
            this.convertirArreglo(
              data,
              [
                'pagos',
                'data',
                'resultado',
                'results'
              ]
            );
        },

        error: (
          error: HttpErrorResponse
        ) => {

          this.manejarErrorHttp(
            error,
            'pagos'
          );

          this.pagos = [];
        }
      });
  }

  // =====================================
  // CONVERTIR RESPUESTA EN ARREGLO
  // =====================================

  private convertirArreglo(
    respuesta: any,
    propiedades: string[]
  ): any[] {

    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (
      !respuesta ||
      typeof respuesta !== 'object'
    ) {
      return [];
    }

    for (
      const propiedad of propiedades
    ) {

      if (
        Object.prototype.hasOwnProperty.call(
          respuesta,
          propiedad
        ) &&
        Array.isArray(
          respuesta[propiedad]
        )
      ) {
        return respuesta[propiedad];
      }
    }

    return [];
  }

  // =====================================
  // DEPARTAMENTO
  // =====================================

  obtenerDepartamento(
    id: any
  ): string {

    switch (Number(id)) {

      case 1:
        return 'Producción';

      case 2:
        return 'Calidad';

      case 3:
        return 'Almacén';

      case 4:
        return 'Mantenimiento';

      case 5:
        return 'Recursos Humanos';

      default:
        return 'Sin departamento';
    }
  }

  // =====================================
  // NOMBRE COMPLETO
  // =====================================

  obtenerNombreCompleto(
    empleado: any
  ): string {

    if (!empleado) {
      return 'Sin nombre';
    }

    const nombreCompleto = [
      empleado.Nombre ??
      empleado.nombre ??
      '',

      empleado.ApellidoPaterno ??
      empleado.apellidoPaterno ??
      empleado.apellido_paterno ??
      '',

      empleado.ApellidoMaterno ??
      empleado.apellidoMaterno ??
      empleado.apellido_materno ??
      ''
    ]
      .map(
        (valor) =>
          String(valor).trim()
      )
      .filter(Boolean)
      .join(' ');

    return nombreCompleto ||
      'Sin nombre';
  }

  // =====================================
  // NOMBRE DEL EMPLEADO DEL PAGO
  // =====================================

  obtenerNombrePago(
    pago: any
  ): string {

    if (!pago) {
      return 'Empleado no encontrado';
    }

    const nombreDirecto =
      pago.NombreEmpleado ??
      pago.nombreEmpleado ??
      pago.NombreCompleto ??
      pago.nombreCompleto;

    if (nombreDirecto) {
      return String(
        nombreDirecto
      ).trim();
    }

    const numeroEmpleado =
      String(
        pago.NumeroEmpleado ??
        pago.numeroEmpleado ??
        ''
      )
        .trim()
        .toUpperCase();

    const idEmpleado =
      Number(
        pago.IdEmpleado ??
        pago.idEmpleado ??
        0
      );

    const empleado =
      this.empleados.find(
        (item) => {

          const numero =
            String(
              item.NumeroEmpleado ??
              item.numeroEmpleado ??
              ''
            )
              .trim()
              .toUpperCase();

          const id =
            Number(
              item.IdEmpleado ??
              item.idEmpleado ??
              0
            );

          return (
            (
              numeroEmpleado !== '' &&
              numero === numeroEmpleado
            ) ||
            (
              idEmpleado > 0 &&
              id === idEmpleado
            )
          );
        }
      );

    if (!empleado) {
      return numeroEmpleado ||
        'Empleado no encontrado';
    }

    return this.obtenerNombreCompleto(
      empleado
    );
  }

  // =====================================
  // FOTO SEGURA
  // =====================================

  fotoEmpleado(
    foto: string
  ): string {

    const fotoPredeterminada =
      '/assets/usuario-default.png';

    if (!foto) {
      return fotoPredeterminada;
    }

    const nombreArchivo =
      String(foto)
        .replace(/\\/g, '/')
        .split('/')
        .pop()
        ?.trim();

    if (!nombreArchivo) {
      return fotoPredeterminada;
    }

    const nombreValido =
      /^[a-zA-Z0-9._-]+\.(jpg|jpeg|png|webp)$/i
        .test(nombreArchivo);

    if (!nombreValido) {
      return fotoPredeterminada;
    }

    return `/uploads/${
      encodeURIComponent(nombreArchivo)
    }`;
  }

  // =====================================
  // TOTAL DE EMPLEADOS
  // =====================================

  totalEmpleados(): number {
    return this.empleados.length;
  }

  // =====================================
  // TOTAL REGISTROS HORAS EXTRAS
  // =====================================

  totalRegistrosHorasExtras(): number {
    return this.horasExtras.length;
  }

  // =====================================
  // TOTAL HORAS EXTRAS
  // =====================================

  totalHorasExtras(): number {

    return this.horasExtras.reduce(
      (
        total,
        hora
      ) => {

        const horas =
          this.convertirNumero(
            hora.HorasTrabajo ??
            hora.horasTrabajo ??
            hora.HorasExtras ??
            hora.horasExtras ??
            hora.CantidadHoras ??
            hora.cantidadHoras ??
            0
          );

        return total + horas;
      },
      0
    );
  }

  // =====================================
  // MONTO HORAS EXTRAS
  // =====================================

  montoTotalHorasExtras(): number {

    return this.horasExtras.reduce(
      (
        total,
        hora
      ) => {

        const totalPagar =
          this.convertirNumero(
            hora.TotalPagar ??
            hora.totalPagar ??
            hora.TotalPago ??
            hora.totalPago ??
            hora.MontoTotal ??
            hora.montoTotal ??
            0
          );

        if (totalPagar > 0) {
          return total + totalPagar;
        }

        const horas =
          this.convertirNumero(
            hora.HorasTrabajo ??
            hora.horasTrabajo ??
            hora.HorasExtras ??
            hora.horasExtras ??
            0
          );

        const pagoHora =
          this.convertirNumero(
            hora.PagoHora ??
            hora.pagoHora ??
            hora.PagoPorHora ??
            hora.pagoPorHora ??
            0
          );

        return (
          total +
          horas * pagoHora
        );
      },
      0
    );
  }

  // =====================================
  // TOTAL DE SUELDOS BASE
  // =====================================

  totalSueldosBase(): number {

    return this.empleados.reduce(
      (
        total,
        empleado
      ) => {

        const salario =
          this.convertirNumero(
            empleado.Salario ??
            empleado.salario ??
            empleado.SueldoBase ??
            empleado.sueldoBase ??
            0
          );

        return total + salario;
      },
      0
    );
  }

  // =====================================
  // TOTAL ESTIMADO DE NÓMINA
  // =====================================

  totalNominaEstimada(): number {

    const totalSueldos =
      this.totalSueldosBase();

    const totalExtras =
      this.montoTotalHorasExtras();

    const deducciones =
      totalSueldos * 0.10;

    return (
      totalSueldos +
      totalExtras -
      deducciones
    );
  }

  // =====================================
  // CANTIDAD DE PAGOS REALIZADOS
  // =====================================

  totalPagosRealizados(): number {

    return this.pagos.filter(
      (pago) => {

        const estado =
          String(
            pago.Estado ??
            pago.estado ??
            ''
          )
            .trim()
            .toLowerCase();

        return estado === 'pagado';
      }
    ).length;
  }

  // =====================================
  // MONTO DE PAGOS REALIZADOS
  // =====================================

  montoPagosRealizados(): number {

    return this.pagos
      .filter(
        (pago) => {

          const estado =
            String(
              pago.Estado ??
              pago.estado ??
              ''
            )
              .trim()
              .toLowerCase();

          return estado === 'pagado';
        }
      )
      .reduce(
        (
          total,
          pago
        ) => {

          const monto =
            this.convertirNumero(
              pago.NetoPagar ??
              pago.netoPagar ??
              pago.Monto ??
              pago.monto ??
              0
            );

          return total + monto;
        },
        0
      );
  }

  // =====================================
  // PAGOS RECIENTES
  // =====================================

  ultimosPagos(): any[] {

    return [...this.pagos]
      .filter(
        (pago) => {

          const estado =
            String(
              pago.Estado ??
              pago.estado ??
              ''
            )
              .trim()
              .toLowerCase();

          return estado === 'pagado';
        }
      )
      .sort(
        (
          pagoA,
          pagoB
        ) => {

          const fechaA =
            new Date(
              pagoA.FechaRegistro ??
              pagoA.fechaRegistro ??
              pagoA.FechaPago ??
              pagoA.fechaPago ??
              0
            ).getTime();

          const fechaB =
            new Date(
              pagoB.FechaRegistro ??
              pagoB.fechaRegistro ??
              pagoB.FechaPago ??
              pagoB.fechaPago ??
              0
            ).getTime();

          return fechaB - fechaA;
        }
      )
      .slice(0, 3);
  }

  // =====================================
  // BANCO DEL PAGO
  // =====================================

  obtenerBancoPago(
    pago: any
  ): string {

    return String(
      pago?.Banco ??
      pago?.banco ??
      'Sin banco'
    );
  }

  // =====================================
  // TARJETA DEL PAGO
  // =====================================

  obtenerTarjetaPago(
    pago: any
  ): string {

    const tarjeta =
      String(
        pago?.NumeroTarjeta ??
        pago?.numeroTarjeta ??
        ''
      )
        .replace(/\D/g, '');

    if (!tarjeta) {
      return 'Sin tarjeta';
    }

    return `**** ${tarjeta.slice(-4)}`;
  }

  // =====================================
  // MONTO DEL PAGO
  // =====================================

  obtenerMontoPago(
    pago: any
  ): number {

    return this.convertirNumero(
      pago?.NetoPagar ??
      pago?.netoPagar ??
      pago?.Monto ??
      pago?.monto ??
      0
    );
  }

  // =====================================
  // FECHA DEL PAGO
  // =====================================

  obtenerFechaPago(
    pago: any
  ): string {

    const fecha =
      pago?.FechaPago ??
      pago?.fechaPago ??
      pago?.FechaRegistro ??
      pago?.fechaRegistro;

    if (!fecha) {
      return 'Sin fecha';
    }

    const fechaConvertida =
      new Date(fecha);

    if (
      Number.isNaN(
        fechaConvertida.getTime()
      )
    ) {
      return 'Sin fecha';
    }

    return fechaConvertida
      .toLocaleDateString(
        'es-MX'
      );
  }

  // =====================================
  // ÚLTIMOS DÍGITOS DE TARJETA
  // =====================================

  obtenerUltimosDigitosTarjeta(
    numeroTarjeta: string
  ): string {

    const tarjeta =
      String(
        numeroTarjeta ?? ''
      )
        .replace(/\D/g, '');

    if (!tarjeta) {
      return 'Sin tarjeta';
    }

    return `**** ${tarjeta.slice(-4)}`;
  }

  // =====================================
  // CONVERTIR A NÚMERO
  // =====================================

  private convertirNumero(
    valor: any
  ): number {

    if (
      valor === null ||
      valor === undefined ||
      valor === ''
    ) {
      return 0;
    }

    if (
      typeof valor === 'number'
    ) {
      return Number.isFinite(valor)
        ? valor
        : 0;
    }

    const valorLimpio =
      String(valor)
        .replace(/MX\$/gi, '')
        .replace(/\$/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '')
        .trim();

    const numero =
      Number(valorLimpio);

    return Number.isFinite(numero)
      ? numero
      : 0;
  }
}