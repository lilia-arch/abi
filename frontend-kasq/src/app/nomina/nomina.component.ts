import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse
} from '@angular/common/http';

import {
  forkJoin,
  of,
  catchError
} from 'rxjs';

@Component({
  selector: 'app-nomina',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    HttpClientModule
  ],
  templateUrl: './nomina.component.html',
  styleUrls: ['./nomina.component.css']
})
export class NominaComponent implements OnInit {

  private readonly api = '/api';

  empleados: any[] = [];
  horasExtras: any[] = [];
  nominas: any[] = [];
  nominasFiltradas: any[] = [];

  cargando = false;
  generando = false;

  mesSeleccionado = '';
  departamentoSeleccionado = '';
  estadoSeleccionado = '';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  /*
   * Ahora se espera a que empleados y horas extras
   * terminen de cargar antes de calcular la nómina.
   */
  cargarDatos(): void {
    this.cargando = true;

    forkJoin({
      empleados: this.http
        .get<any>(`${this.api}/empleados`)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error(
              'Error al obtener empleados:',
              error
            );

            return of([]);
          })
        ),

      horasExtras: this.http
        .get<any>(`${this.api}/horas-extras`)
        .pipe(
          catchError((error: HttpErrorResponse) => {
            console.error(
              'Error al obtener horas extras:',
              error
            );

            return of([]);
          })
        )
    }).subscribe({
      next: (respuesta) => {
        /*
         * Permite recibir:
         * [...]
         *
         * o:
         * {
         *   empleados: [...]
         * }
         */
        this.empleados = this.convertirArreglo(
          respuesta.empleados,
          [
            'empleados',
            'data',
            'resultado',
            'results'
          ]
        );

        /*
         * Permite recibir:
         * [...]
         *
         * o:
         * {
         *   horasExtras: [...]
         * }
         */
        this.horasExtras = this.convertirArreglo(
          respuesta.horasExtras,
          [
            'horasExtras',
            'horas_extras',
            'data',
            'resultado',
            'results'
          ]
        );

        console.log(
          'Empleados cargados:',
          this.empleados
        );

        console.log(
          'Horas extras cargadas:',
          this.horasExtras
        );

        this.generarNominasLocales();
        this.cargando = false;
      },

      error: (error: HttpErrorResponse) => {
        console.error(
          'Error al cargar los datos:',
          error
        );

        this.empleados = [];
        this.horasExtras = [];
        this.nominas = [];
        this.nominasFiltradas = [];

        this.cargando = false;
      }
    });
  }

  /*
   * Se conserva esta función por si la utilizas
   * desde otra parte del componente.
   */
  obtenerEmpleados(): void {
    this.http
      .get<any>(`${this.api}/empleados`)
      .subscribe({
        next: (data) => {
          this.empleados = this.convertirArreglo(
            data,
            [
              'empleados',
              'data',
              'resultado',
              'results'
            ]
          );

          this.generarNominasLocales();
          this.cargando = false;
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            'Error al obtener empleados:',
            error
          );

          this.empleados = [];
          this.nominas = [];
          this.nominasFiltradas = [];
          this.cargando = false;
        }
      });
  }

  /*
   * Se conserva esta función por si la utilizas
   * desde otra parte del componente.
   */
  obtenerHorasExtras(): void {
    this.http
      .get<any>(`${this.api}/horas-extras`)
      .subscribe({
        next: (data) => {
          this.horasExtras = this.convertirArreglo(
            data,
            [
              'horasExtras',
              'horas_extras',
              'data',
              'resultado',
              'results'
            ]
          );

          console.log(
            'Horas extras obtenidas:',
            this.horasExtras
          );

          if (this.empleados.length > 0) {
            this.generarNominasLocales();
          }
        },

        error: (error: HttpErrorResponse) => {
          console.error(
            'Error al obtener horas extras:',
            error
          );

          this.horasExtras = [];

          if (this.empleados.length > 0) {
            this.generarNominasLocales();
          }
        }
      });
  }

  generarNominasLocales(): void {
    this.nominas = this.empleados.map(
      (empleado) => {

        const numeroEmpleado =
          this.normalizarNumeroEmpleado(
            empleado.NumeroEmpleado ??
            empleado.numeroEmpleado ??
            empleado.numero_empleado ??
            ''
          );

        const idEmpleado = Number(
          empleado.IdEmpleado ??
          empleado.idEmpleado ??
          empleado.id_empleado ??
          0
        );

        const sueldoBase = this.convertirNumero(
          empleado.Salario ??
          empleado.salario ??
          empleado.Sueldo ??
          empleado.sueldo ??
          empleado.SueldoBase ??
          empleado.sueldoBase ??
          0
        );

        /*
         * Busca las horas extras por:
         *
         * 1. Número de empleado.
         * 2. Id del empleado.
         *
         * Esto evita que falle cuando un valor llega como
         * número y otro como texto.
         */
        const extrasEmpleado =
          this.horasExtras.filter((hora) => {

            const numeroHora =
              this.normalizarNumeroEmpleado(
                hora.NumeroEmpleado ??
                hora.numeroEmpleado ??
                hora.numero_empleado ??
                hora.NoEmpleado ??
                hora.noEmpleado ??
                ''
              );

            const idEmpleadoHora = Number(
              hora.IdEmpleado ??
              hora.idEmpleado ??
              hora.id_empleado ??
              0
            );

            const coincideNumero =
              numeroEmpleado !== '' &&
              numeroHora !== '' &&
              numeroHora === numeroEmpleado;

            const coincideId =
              idEmpleado > 0 &&
              idEmpleadoHora > 0 &&
              idEmpleadoHora === idEmpleado;

            return coincideNumero || coincideId;
          });

        console.log(
          `Horas extras del empleado ${numeroEmpleado}:`,
          extrasEmpleado
        );

        const totalHorasExtras =
          extrasEmpleado.reduce(
            (total, hora) => {

              /*
               * Primero busca si el backend ya envía
               * el total calculado.
               */
              const totalPagar =
                this.convertirNumero(
                  hora.TotalPagar ??
                  hora.totalPagar ??
                  hora.TotalPago ??
                  hora.totalPago ??
                  hora.MontoTotal ??
                  hora.montoTotal ??
                  hora.PagoTotal ??
                  hora.pagoTotal ??
                  0
                );

              if (totalPagar > 0) {
                return total + totalPagar;
              }

              /*
               * Si no existe TotalPagar, calcula:
               *
               * horas trabajadas × pago por hora
               */
              const horas =
                this.convertirNumero(
                  hora.HorasTrabajo ??
                  hora.horasTrabajo ??
                  hora.HorasExtras ??
                  hora.horasExtras ??
                  hora.CantidadHoras ??
                  hora.cantidadHoras ??
                  hora.NumeroHoras ??
                  hora.numeroHoras ??
                  0
                );

              const pagoHora =
                this.convertirNumero(
                  hora.PagoHora ??
                  hora.pagoHora ??
                  hora.PagoPorHora ??
                  hora.pagoPorHora ??
                  hora.PrecioHora ??
                  hora.precioHora ??
                  hora.CostoHora ??
                  hora.costoHora ??
                  0
                );

              return total + horas * pagoHora;
            },
            0
          );

        const deducciones = sueldoBase * 0.1;

        const netoPagar =
          sueldoBase +
          totalHorasExtras -
          deducciones;

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
              empleado.idDepartamento ??
              empleado.id_departamento
            ),

          puesto:
            empleado.Puesto ??
            empleado.puesto ??
            'Sin puesto',

          sueldoBase,

          horasExtras:
            totalHorasExtras,

          cantidadRegistrosHorasExtras:
            extrasEmpleado.length,

          deducciones,

          netoPagar,

          fechaPago:
            new Date(),

          estado:
            empleado.Estado ??
            empleado.estado ??
            'Activo',

          banco:
            empleado.Banco ??
            empleado.banco ??
            'Sin banco',

          numeroTarjeta:
            empleado.NumeroTarjeta ??
            empleado.numeroTarjeta ??
            empleado.numero_tarjeta ??
            ''
        };
      }
    );

    this.nominasFiltradas = [
      ...this.nominas
    ];

    console.log(
      'Nóminas calculadas:',
      this.nominas
    );
  }

  /*
   * Convierte respuestas del backend en arreglos.
   */
  private convertirArreglo(
    respuesta: any,
    propiedades: string[]
  ): any[] {

    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (!respuesta) {
      return [];
    }

    for (const propiedad of propiedades) {
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

  /*
   * Quita espacios y convierte a mayúsculas.
   *
   * Ejemplo:
   * " emp-001 " se convierte en "EMP-001".
   */
  private normalizarNumeroEmpleado(
    valor: any
  ): string {
    return String(valor ?? '')
      .trim()
      .toUpperCase();
  }

  /*
   * Convierte números incluso cuando llegan como:
   *
   * "$1,600.00"
   * "MX$1,600.00"
   * "1600"
   */
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

    const limpio = String(valor)
      .replace(/MX\$/gi, '')
      .replace(/\$/g, '')
      .replace(/,/g, '')
      .replace(/\s/g, '')
      .trim();

    const numero = Number(limpio);

    return Number.isFinite(numero)
      ? numero
      : 0;
  }

  filtrarNominas(): void {
    this.nominasFiltradas =
      this.nominas.filter((nomina) => {

        const coincideDepartamento =
          !this.departamentoSeleccionado ||
          nomina.departamento ===
            this.departamentoSeleccionado;

        const coincideEstado =
          !this.estadoSeleccionado ||
          nomina.estado ===
            this.estadoSeleccionado;

        return (
          coincideDepartamento &&
          coincideEstado
        );
      });
  }

  limpiarFiltros(): void {
    this.mesSeleccionado = '';
    this.departamentoSeleccionado = '';
    this.estadoSeleccionado = '';

    this.nominasFiltradas = [
      ...this.nominas
    ];
  }

  generarNomina(): void {
    if (this.generando) {
      return;
    }

    if (this.nominas.length === 0) {
      alert(
        'No hay empleados para generar la nómina'
      );
      return;
    }

    this.generando = true;

    const datos = this.nominas.map(
      (nomina) => ({
        numeroEmpleado:
          nomina.numeroEmpleado,

        sueldoBase:
          nomina.sueldoBase,

        horasExtras:
          nomina.horasExtras,

        deducciones:
          nomina.deducciones,

        netoPagar:
          nomina.netoPagar,

        fechaPago:
          this.formatearFechaMysql(
            nomina.fechaPago
          ),

        estado: 'Pendiente'
      })
    );

    this.http
      .post<any>(
        `${this.api}/nominas`,
        { nominas: datos }
      )
      .subscribe({
        next: (respuesta) => {
          console.log(
            'Nómina generada:',
            respuesta
          );

          alert(
            'Nómina generada correctamente'
          );

          this.generando = false;
        },

        error: (
          error: HttpErrorResponse
        ) => {
          console.error(
            'Error al generar nómina:',
            error
          );

          let mensaje =
            'No se pudo generar la nómina';

          if (error.status === 0) {
            mensaje =
              'No se pudo conectar con el backend.';
          } else if (
            error.status === 404
          ) {
            mensaje =
              'No existe la ruta POST /nominas en el backend.';
          } else if (
            error.error?.mensaje
          ) {
            mensaje =
              error.error.mensaje;
          }

          alert(mensaje);
          this.generando = false;
        }
      });
  }

  obtenerNombreCompleto(
    empleado: any
  ): string {
    return [
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
      .filter(Boolean)
      .join(' ');
  }

  obtenerDepartamento(
    id: any
  ): string {
    const numero = Number(id);

    if (numero === 1) {
      return 'Producción';
    }

    if (numero === 2) {
      return 'Calidad';
    }

    if (numero === 3) {
      return 'Almacén';
    }

    if (numero === 4) {
      return 'Mantenimiento';
    }

    if (numero === 5) {
      return 'Recursos Humanos';
    }

    return 'Sin departamento';
  }

  fotoEmpleado(
    foto: string
  ): string {
    if (!foto) {
      return 'https://i.pravatar.cc/50';
    }

    if (
      foto.startsWith(
        '/uploads/'
      )
    ) {
      return foto;
    }

    if (
      foto.startsWith(
        'uploads/'
      )
    ) {
      return `/${foto}`;
    }

    return `/uploads/${foto}`;
  }

  totalNominas(): number {
    return this.nominasFiltradas.length;
  }

  montoTotal(): number {
    return this.nominasFiltradas.reduce(
      (total, nomina) =>
        total +
        Number(
          nomina.netoPagar || 0
        ),
      0
    );
  }

  totalEmpleados(): number {
    return this.nominasFiltradas.length;
  }

  obtenerUltimosDigitos(
    numeroTarjeta: string
  ): string {
    if (!numeroTarjeta) {
      return 'Sin tarjeta';
    }

    return `**** ${numeroTarjeta.slice(-4)}`;
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

  private formatearFechaMysql(
    fecha: Date
  ): string {
    const anio =
      fecha.getFullYear();

    const mes = String(
      fecha.getMonth() + 1
    ).padStart(2, '0');

    const dia = String(
      fecha.getDate()
    ).padStart(2, '0');

    return `${anio}-${mes}-${dia}`;
  }
}