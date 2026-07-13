import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
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
  selector: 'app-pagos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    HttpClientModule
  ],
  templateUrl: './pagos.component.html',
  styleUrls: ['./pagos.component.css']
})
export class PagosComponent implements OnInit {

  private readonly api = '/api';

  empleados: any[] = [];
  horasExtras: any[] = [];
  pagos: any[] = [];
  pagosFiltrados: any[] = [];

  cargando = false;
  pagandoTodos = false;

  buscarEmpleado = '';
  estadoSeleccionado = '';
  departamentoSeleccionado = '';

  constructor(
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  // =====================================
  // CARGAR DATOS
  // =====================================

  cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      empleados: this.http
        .get<any>(`${this.api}/empleados`)
        .pipe(
          catchError(
            (error: HttpErrorResponse) => {
              console.error(
                'Error al cargar empleados:',
                error
              );

              return of([]);
            }
          )
        ),

      horasExtras: this.http
        .get<any>(`${this.api}/horas-extras`)
        .pipe(
          catchError(
            (error: HttpErrorResponse) => {
              console.error(
                'Error al cargar horas extras:',
                error
              );

              return of([]);
            }
          )
        ),

      pagosGuardados: this.http
        .get<any>(`${this.api}/pagos`)
        .pipe(
          catchError(
            (error: HttpErrorResponse) => {
              console.warn(
                'La ruta GET /pagos todavía no está disponible:',
                error
              );

              return of([]);
            }
          )
        )
    }).subscribe({
      next: (respuesta) => {
        this.empleados = this.convertirArreglo(
          respuesta.empleados,
          ['empleados', 'data', 'resultado']
        );

        this.horasExtras = this.convertirArreglo(
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
            ['pagos', 'data', 'resultado']
          );

        this.generarPagos(
          pagosGuardados
        );

        this.cargando = false;
      },

      error: (error) => {
        console.error(
          'Error al cargar pagos:',
          error
        );

        this.cargando = false;
      }
    });
  }

  // =====================================
  // GENERAR PAGOS
  // =====================================

  generarPagos(
    pagosGuardados: any[]
  ): void {

    this.pagos = this.empleados.map(
      (empleado) => {

        const numeroEmpleado =
          this.normalizarNumeroEmpleado(
            empleado.NumeroEmpleado ??
            empleado.numeroEmpleado ??
            ''
          );

        const idEmpleado = Number(
          empleado.IdEmpleado ??
          empleado.idEmpleado ??
          0
        );

        const sueldoBase =
          this.convertirNumero(
            empleado.Salario ??
            empleado.salario ??
            0
          );

        const extrasEmpleado =
          this.horasExtras.filter(
            (hora) => {

              const numeroHora =
                this.normalizarNumeroEmpleado(
                  hora.NumeroEmpleado ??
                  hora.numeroEmpleado ??
                  ''
                );

              const idEmpleadoHora =
                Number(
                  hora.IdEmpleado ??
                  hora.idEmpleado ??
                  0
                );

              const coincideNumero =
                numeroEmpleado !== '' &&
                numeroHora !== '' &&
                numeroEmpleado === numeroHora;

              const coincideId =
                idEmpleado > 0 &&
                idEmpleadoHora > 0 &&
                idEmpleado === idEmpleadoHora;

              return (
                coincideNumero ||
                coincideId
              );
            }
          );

        const pagoHorasExtras =
          extrasEmpleado.reduce(
            (total, hora) => {

              const totalPagar =
                this.convertirNumero(
                  hora.TotalPagar ??
                  hora.totalPagar ??
                  hora.TotalPago ??
                  hora.totalPago ??
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

        const totalHoras =
          extrasEmpleado.reduce(
            (total, hora) => {

              return total +
                this.convertirNumero(
                  hora.HorasTrabajo ??
                  hora.horasTrabajo ??
                  hora.HorasExtras ??
                  hora.horasExtras ??
                  0
                );
            },
            0
          );

        const deducciones =
          sueldoBase * 0.10;

        const netoPagar =
          sueldoBase +
          pagoHorasExtras -
          deducciones;

        const pagoExistente =
          pagosGuardados.find(
            (pago) => {

              const numeroPago =
                this.normalizarNumeroEmpleado(
                  pago.NumeroEmpleado ??
                  pago.numeroEmpleado ??
                  ''
                );

              return (
                numeroPago ===
                numeroEmpleado
              );
            }
          );

        return {
          idEmpleado,

          numeroEmpleado,

          nombre:
            this.obtenerNombreCompleto(
              empleado
            ),

          foto:
            empleado.Foto ??
            empleado.foto ??
            '',

          departamento:
            this.obtenerDepartamento(
              empleado.IdDepartamento ??
              empleado.idDepartamento
            ),

          puesto:
            empleado.Puesto ??
            empleado.puesto ??
            'Sin puesto',

          banco:
            empleado.Banco ??
            empleado.banco ??
            'Sin banco',

          numeroTarjeta:
            empleado.NumeroTarjeta ??
            empleado.numeroTarjeta ??
            '',

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
            pagoExistente?.Estado ??
            pagoExistente?.estado ??
            'Pendiente',

          pagando: false
        };
      }
    );

    this.pagosFiltrados = [
      ...this.pagos
    ];
  }

  // =====================================
  // PAGAR UN EMPLEADO
  // =====================================

  pagarEmpleado(
    pago: any
  ): void {

    if (
      pago.pagando ||
      pago.estado === 'Pagado'
    ) {
      return;
    }

    const confirmar =
      confirm(
        `¿Deseas registrar el pago de ${pago.nombre} por ${this.formatearMoneda(pago.netoPagar)}?`
      );

    if (!confirmar) {
      return;
    }

    pago.pagando = true;

    const datosPago = {
      idEmpleado:
        pago.idEmpleado,

      numeroEmpleado:
        pago.numeroEmpleado,

      sueldoBase:
        pago.sueldoBase,

      horasExtras:
        pago.pagoHorasExtras,

      totalHoras:
        pago.totalHoras,

      deducciones:
        pago.deducciones,

      netoPagar:
        pago.netoPagar,

      banco:
        pago.banco,

      numeroTarjeta:
        pago.numeroTarjeta,

      fechaPago:
        this.formatearFechaMysql(
          new Date()
        ),

      estado:
        'Pagado'
    };

    this.http
      .post<any>(
        `${this.api}/pagos`,
        datosPago
      )
      .subscribe({
        next: (respuesta) => {
          console.log(
            'Pago registrado:',
            respuesta
          );

          pago.estado = 'Pagado';
          pago.fechaPago = new Date();
          pago.pagando = false;

          alert(
            'Pago registrado correctamente'
          );
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al registrar pago:',
            error
          );

          let mensaje =
            'No se pudo registrar el pago';

          if (error.status === 0) {
            mensaje =
              'No se pudo conectar con el backend';
          } else if (
            error.status === 404
          ) {
            mensaje =
              'No existe la ruta POST /api/pagos en el backend';
          } else if (
            error.error?.mensaje
          ) {
            mensaje =
              error.error.mensaje;
          }

          alert(mensaje);

          pago.pagando = false;
        }
      });
  }

  // =====================================
  // PAGAR TODOS
  // =====================================

  pagarTodos(): void {
    const pendientes =
      this.pagosFiltrados.filter(
        (pago) =>
          pago.estado !== 'Pagado'
      );

    if (
      pendientes.length === 0
    ) {
      alert(
        'No hay pagos pendientes'
      );

      return;
    }

    const confirmar =
      confirm(
        `¿Deseas registrar ${pendientes.length} pagos pendientes?`
      );

    if (!confirmar) {
      return;
    }

    this.pagandoTodos = true;

    const datos = pendientes.map(
      (pago) => ({
        idEmpleado:
          pago.idEmpleado,

        numeroEmpleado:
          pago.numeroEmpleado,

        sueldoBase:
          pago.sueldoBase,

        horasExtras:
          pago.pagoHorasExtras,

        totalHoras:
          pago.totalHoras,

        deducciones:
          pago.deducciones,

        netoPagar:
          pago.netoPagar,

        banco:
          pago.banco,

        numeroTarjeta:
          pago.numeroTarjeta,

        fechaPago:
          this.formatearFechaMysql(
            new Date()
          ),

        estado:
          'Pagado'
      })
    );

    this.http
      .post<any>(
        `${this.api}/pagos-multiples`,
        {
          pagos: datos
        }
      )
      .subscribe({
        next: (respuesta) => {
          console.log(
            'Pagos registrados:',
            respuesta
          );

          pendientes.forEach(
            (pago) => {
              pago.estado = 'Pagado';
              pago.fechaPago =
                new Date();
            }
          );

          this.pagandoTodos = false;

          alert(
            'Todos los pagos fueron registrados'
          );
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al registrar pagos:',
            error
          );

          alert(
            'No fue posible registrar todos los pagos'
          );

          this.pagandoTodos = false;
        }
      });
  }

  // =====================================
  // FILTRAR
  // =====================================

  filtrarPagos(): void {
    const busqueda =
      this.buscarEmpleado
        .trim()
        .toLowerCase();

    this.pagosFiltrados =
      this.pagos.filter(
        (pago) => {

          const coincideBusqueda =
            !busqueda ||
            pago.nombre
              .toLowerCase()
              .includes(busqueda) ||
            pago.numeroEmpleado
              .toLowerCase()
              .includes(busqueda);

          const coincideEstado =
            !this.estadoSeleccionado ||
            pago.estado ===
              this.estadoSeleccionado;

          const coincideDepartamento =
            !this.departamentoSeleccionado ||
            pago.departamento ===
              this.departamentoSeleccionado;

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

  // =====================================
  // TOTALES
  // =====================================

  totalPagos(): number {
    return this.pagosFiltrados.length;
  }

  totalPagados(): number {
    return this.pagosFiltrados.filter(
      (pago) =>
        pago.estado === 'Pagado'
    ).length;
  }

  totalPendientes(): number {
    return this.pagosFiltrados.filter(
      (pago) =>
        pago.estado !== 'Pagado'
    ).length;
  }

  montoTotal(): number {
    return this.pagosFiltrados.reduce(
      (total, pago) =>
        total +
        this.convertirNumero(
          pago.netoPagar
        ),
      0
    );
  }

  montoPagado(): number {
    return this.pagosFiltrados
      .filter(
        (pago) =>
          pago.estado === 'Pagado'
      )
      .reduce(
        (total, pago) =>
          total +
          this.convertirNumero(
            pago.netoPagar
          ),
        0
      );
  }

  // =====================================
  // UTILIDADES
  // =====================================

  obtenerNombreCompleto(
    empleado: any
  ): string {

    return [
      empleado.Nombre ??
      empleado.nombre ??
      '',

      empleado.ApellidoPaterno ??
      empleado.apellidoPaterno ??
      '',

      empleado.ApellidoMaterno ??
      empleado.apellidoMaterno ??
      ''
    ]
      .filter(Boolean)
      .join(' ');
  }

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

  fotoEmpleado(
    foto: string
  ): string {

    if (!foto) {
      return 'https://i.pravatar.cc/50';
    }

    if (
      foto.startsWith('http://') ||
      foto.startsWith('https://')
    ) {
      return foto;
    }

    if (
      foto.startsWith('/uploads/')
    ) {
      return foto;
    }

    if (
      foto.startsWith('uploads/')
    ) {
      return `/${foto}`;
    }

    return `/uploads/${foto}`;
  }

  obtenerUltimosDigitos(
    numeroTarjeta: string
  ): string {

    if (!numeroTarjeta) {
      return 'Sin tarjeta';
    }

    return `**** ${String(
      numeroTarjeta
    ).slice(-4)}`;
  }

  formatearFecha(
    fecha: string | Date
  ): string {

    const fechaConvertida =
      new Date(fecha);

    if (
      isNaN(
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

  formatearMoneda(
    cantidad: number
  ): string {

    return new Intl.NumberFormat(
      'es-MX',
      {
        style: 'currency',
        currency: 'MXN'
      }
    ).format(cantidad);
  }

  private normalizarNumeroEmpleado(
    valor: any
  ): string {

    return String(
      valor ?? ''
    )
      .trim()
      .toUpperCase();
  }

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

    const limpio =
      String(valor)
        .replace(/MX\$/gi, '')
        .replace(/\$/g, '')
        .replace(/,/g, '')
        .replace(/\s/g, '');

    const numero =
      Number(limpio);

    return Number.isFinite(numero)
      ? numero
      : 0;
  }

  private convertirArreglo(
    respuesta: any,
    propiedades: string[]
  ): any[] {

    if (
      Array.isArray(respuesta)
    ) {
      return respuesta;
    }

    if (!respuesta) {
      return [];
    }

    for (
      const propiedad of propiedades
    ) {
      if (
        Array.isArray(
          respuesta[propiedad]
        )
      ) {
        return respuesta[propiedad];
      }
    }

    return [];
  }

  private formatearFechaMysql(
    fecha: Date
  ): string {

    const anio =
      fecha.getFullYear();

    const mes =
      String(
        fecha.getMonth() + 1
      ).padStart(2, '0');

    const dia =
      String(
        fecha.getDate()
      ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}