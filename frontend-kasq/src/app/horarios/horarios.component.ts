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
  RouterLink
} from '@angular/router';

import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse
} from '@angular/common/http';

@Component({
  selector: 'app-horarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HttpClientModule
  ],
  templateUrl: './horarios.component.html',
  styleUrls: [
    './horarios.component.css'
  ]
})
export class HorariosComponent implements OnInit {

  private readonly apiEmpleados =
    '/api/empleados';

  private readonly claveLocalStorage =
    'kasq_horarios';

  busqueda = '';
  departamentoSeleccionado = '';
  turnoSeleccionado = '';
  fechaSeleccionada = '';

  mostrarFormulario = false;
  modoEdicion = false;
  indiceEditando: number | null = null;

  cargando = false;
  guardando = false;

  horarioFormulario: any =
    this.crearHorarioVacio();

  horarios: any[] = [];
  horariosFiltrados: any[] = [];

  constructor(
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.obtenerEmpleados();
  }

  /* =====================================================
     OBTENER EMPLEADOS DEL BACKEND
  ===================================================== */

  obtenerEmpleados(): void {
    if (this.cargando) {
      return;
    }

    this.cargando = true;

    this.http.get<any[]>(
      `${this.apiEmpleados}?page=1&limit=100`
    ).subscribe({
      next: (respuesta: any[]) => {
        const empleados =
          Array.isArray(respuesta)
            ? respuesta
            : [];

        const horariosGuardados =
          this.obtenerHorariosLocales();

        this.horarios = empleados.map(
          (empleado: any) => {
            const idEmpleado =
              Number(
                empleado.IdEmpleado ??
                empleado.idEmpleado ??
                0
              );

            const numeroEmpleado =
              String(
                empleado.NumeroEmpleado ??
                empleado.numeroEmpleado ??
                ''
              ).trim();

            /*
              Si el empleado ya tenía un horario
              editado localmente, se recupera.
            */
            const horarioGuardado =
              horariosGuardados.find(
                (horario: any) =>
                  String(
                    horario.numeroEmpleado
                  ).trim() ===
                  numeroEmpleado
              );

            if (horarioGuardado) {
              return {
                ...horarioGuardado,
                idEmpleado
              };
            }

            return this.convertirEmpleadoAHorario(
              empleado
            );
          }
        );

        this.filtrarHorarios();
        this.cargando = false;
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al obtener empleados:',
          error
        );

        this.horarios =
          this.obtenerHorariosLocales();

        this.filtrarHorarios();
        this.cargando = false;

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
     CONVERTIR EMPLEADO A HORARIO
  ===================================================== */

  private convertirEmpleadoAHorario(
    empleado: any
  ): any {
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

    const nombreCompleto = [
      nombre,
      apellidoPaterno,
      apellidoMaterno
    ]
      .filter(
        (valor: any) =>
          String(valor || '').trim()
      )
      .join(' ')
      .trim();

    const idDepartamento =
      empleado.IdDepartamento ??
      empleado.idDepartamento;

    const turnoBase =
      empleado.Turno ??
      empleado.turno ??
      '';

    const turnoVisible =
      this.convertirTurnoParaFormulario(
        turnoBase
      );

    const horasTurno =
      this.obtenerHorasTurno(
        turnoVisible
      );

    return {
      idEmpleado:
        Number(
          empleado.IdEmpleado ??
          empleado.idEmpleado ??
          0
        ),

      nombre:
        nombreCompleto,

      numeroEmpleado:
        String(
          empleado.NumeroEmpleado ??
          empleado.numeroEmpleado ??
          ''
        ).trim(),

      departamento:
        this.obtenerDepartamento(
          idDepartamento
        ),

      puesto:
        String(
          empleado.Puesto ??
          empleado.puesto ??
          ''
        ).trim(),

      turno:
        turnoVisible,

      horario:
        `${horasTurno.entrada} - ${horasTurno.salida}`,

      horaEntrada:
        horasTurno.entrada24,

      horaSalida:
        horasTurno.salida24,

      horasDia:
        Number(
          empleado.HorasLaboralesDia ??
          empleado.horasLaboralesDia ??
          8
        ),

      dias: [
        'L',
        'M',
        'MI',
        'J',
        'V'
      ],

      estado:
        empleado.Estado ??
        empleado.estado ??
        'Activo',

      foto:
        empleado.Foto ??
        empleado.foto ??
        ''
    };
  }

  /* =====================================================
     CREAR HORARIO VACÍO
  ===================================================== */

  crearHorarioVacio(): any {
    return {
      idEmpleado: null,
      nombre: '',
      numeroEmpleado: '',
      departamento: '',
      puesto: '',
      turno: '',
      horaEntrada: '',
      horaSalida: '',
      horario: '',
      horasDia: 8,
      dias: [],
      estado: 'Activo',
      foto: ''
    };
  }

  /* =====================================================
     FILTRAR HORARIOS
  ===================================================== */

  filtrarHorarios(): void {
    const texto =
      String(
        this.busqueda || ''
      )
        .toLowerCase()
        .trim();

    this.horariosFiltrados =
      this.horarios.filter(
        (horario: any) => {
          const nombre =
            String(
              horario.nombre || ''
            ).toLowerCase();

          const numeroEmpleado =
            String(
              horario.numeroEmpleado || ''
            ).toLowerCase();

          const puesto =
            String(
              horario.puesto || ''
            ).toLowerCase();

          const coincideBusqueda =
            !texto ||
            nombre.includes(texto) ||
            numeroEmpleado.includes(texto) ||
            puesto.includes(texto);

          const coincideDepartamento =
            !this.departamentoSeleccionado ||
            horario.departamento ===
              this.departamentoSeleccionado;

          const coincideTurno =
            !this.turnoSeleccionado ||
            horario.turno ===
              this.turnoSeleccionado;

          return (
            coincideBusqueda &&
            coincideDepartamento &&
            coincideTurno
          );
        }
      );
  }

  /* =====================================================
     LIMPIAR FILTROS
  ===================================================== */

  limpiarFiltros(): void {
    this.busqueda = '';
    this.departamentoSeleccionado = '';
    this.turnoSeleccionado = '';
    this.fechaSeleccionada = '';

    this.filtrarHorarios();
  }

  /* =====================================================
     ACTUALIZAR
  ===================================================== */

  actualizarHorarios(): void {
    this.obtenerEmpleados();
  }

  /* =====================================================
     TOTALES
  ===================================================== */

  totalTurnos(): number {
    const turnos =
      this.horarios
        .map(
          (horario: any) =>
            horario.turno
        )
        .filter(Boolean);

    return new Set(turnos).size;
  }

  totalEmpleados(): number {
    return this.horarios.length;
  }

  totalHoras(): number {
    return this.horarios.reduce(
      (
        total: number,
        horario: any
      ) =>
        total +
        Number(
          horario.horasDia || 0
        ),
      0
    );
  }

  /* =====================================================
     ABRIR NUEVO HORARIO
  ===================================================== */

  abrirFormularioNuevo(): void {
    this.modoEdicion = false;
    this.indiceEditando = null;

    this.horarioFormulario =
      this.crearHorarioVacio();

    this.mostrarFormulario = true;

    document.body.style.overflow =
      'hidden';
  }

  /* =====================================================
     EDITAR HORARIO
  ===================================================== */

  editarHorario(
    horario: any,
    indiceFiltrado?: number
  ): void {
    const indiceReal =
      this.horarios.findIndex(
        (item: any) =>
          String(
            item.numeroEmpleado
          ) ===
          String(
            horario.numeroEmpleado
          )
      );

    if (indiceReal < 0) {
      alert(
        'No fue posible encontrar el horario.'
      );

      return;
    }

    void indiceFiltrado;

    this.modoEdicion = true;
    this.indiceEditando = indiceReal;

    const horas =
      this.extraerHoras(
        horario
      );

    this.horarioFormulario = {
      idEmpleado:
        horario.idEmpleado ?? null,

      nombre:
        horario.nombre ?? '',

      numeroEmpleado:
        horario.numeroEmpleado ?? '',

      departamento:
        horario.departamento ?? '',

      puesto:
        horario.puesto ?? '',

      turno:
        horario.turno ?? '',

      horaEntrada:
        horas.entrada,

      horaSalida:
        horas.salida,

      horario:
        horario.horario ?? '',

      horasDia:
        horario.horasDia ?? 8,

      dias:
        Array.isArray(
          horario.dias
        )
          ? [...horario.dias]
          : [],

      estado:
        horario.estado ?? 'Activo',

      foto:
        horario.foto ?? ''
    };

    this.mostrarFormulario = true;

    document.body.style.overflow =
      'hidden';
  }

  /* =====================================================
     GUARDAR HORARIO
  ===================================================== */

  guardarHorario(): void {
    if (this.guardando) {
      return;
    }

    const horario =
      this.horarioFormulario;

    if (
      !String(
        horario.nombre || ''
      ).trim()
    ) {
      alert(
        'Ingresa o selecciona el empleado.'
      );

      return;
    }

    if (
      !String(
        horario.numeroEmpleado || ''
      ).trim()
    ) {
      alert(
        'El número de empleado es obligatorio.'
      );

      return;
    }

    if (
      !String(
        horario.departamento || ''
      ).trim()
    ) {
      alert(
        'El departamento es obligatorio.'
      );

      return;
    }

    if (
      !String(
        horario.puesto || ''
      ).trim()
    ) {
      alert(
        'El puesto es obligatorio.'
      );

      return;
    }

    if (!horario.turno) {
      alert(
        'Selecciona el turno.'
      );

      return;
    }

    if (
      !horario.horaEntrada ||
      !horario.horaSalida
    ) {
      const horasTurno =
        this.obtenerHorasTurno(
          horario.turno
        );

      horario.horaEntrada =
        horario.horaEntrada ||
        horasTurno.entrada24;

      horario.horaSalida =
        horario.horaSalida ||
        horasTurno.salida24;
    }

    const horasDia =
      Number(
        horario.horasDia
      );

    if (
      !Number.isFinite(horasDia) ||
      horasDia < 1 ||
      horasDia > 24
    ) {
      alert(
        'Las horas por día deben estar entre 1 y 24.'
      );

      return;
    }

    if (
      !Array.isArray(horario.dias) ||
      horario.dias.length === 0
    ) {
      alert(
        'Selecciona al menos un día laboral.'
      );

      return;
    }

    this.guardando = true;

    const nuevoHorario = {
      idEmpleado:
        horario.idEmpleado ?? null,

      nombre:
        String(
          horario.nombre
        ).trim(),

      numeroEmpleado:
        String(
          horario.numeroEmpleado
        ).trim(),

      departamento:
        String(
          horario.departamento
        ).trim(),

      puesto:
        String(
          horario.puesto
        ).trim(),

      turno:
        String(
          horario.turno
        ).trim(),

      horario:
        `${this.formatearHora(
          horario.horaEntrada
        )} - ${this.formatearHora(
          horario.horaSalida
        )}`,

      horaEntrada:
        horario.horaEntrada,

      horaSalida:
        horario.horaSalida,

      horasDia,

      dias: [
        ...horario.dias
      ],

      estado:
        horario.estado ||
        'Activo',

      foto:
        horario.foto || ''
    };

    if (
      this.modoEdicion &&
      this.indiceEditando !== null
    ) {
      this.horarios[
        this.indiceEditando
      ] = nuevoHorario;
    } else {
      const duplicado =
        this.horarios.some(
          (item: any) =>
            String(
              item.numeroEmpleado
            ) ===
            String(
              nuevoHorario.numeroEmpleado
            )
        );

      if (duplicado) {
        alert(
          'Este empleado ya tiene un horario registrado.'
        );

        this.guardando = false;
        return;
      }

      this.horarios.push(
        nuevoHorario
      );
    }

    this.guardarHorariosLocales();
    this.filtrarHorarios();

    this.guardando = false;

    alert(
      this.modoEdicion
        ? 'Horario actualizado correctamente.'
        : 'Horario guardado correctamente.'
    );

    this.cerrarFormulario();
  }

  /* =====================================================
     ELIMINAR HORARIO
  ===================================================== */

  eliminarHorario(
    horario: any
  ): void {
    const confirmar =
      window.confirm(
        `¿Deseas eliminar el horario de ${
          horario.nombre ||
          'este empleado'
        }?`
      );

    if (!confirmar) {
      return;
    }

    this.horarios =
      this.horarios.filter(
        (item: any) =>
          String(
            item.numeroEmpleado
          ) !==
          String(
            horario.numeroEmpleado
          )
      );

    this.guardarHorariosLocales();
    this.filtrarHorarios();

    alert(
      'Horario eliminado correctamente.'
    );
  }

  /* =====================================================
     CAMBIAR TURNO
  ===================================================== */

  cambiarTurno(): void {
    const datos =
      this.obtenerHorasTurno(
        this.horarioFormulario.turno
      );

    this.horarioFormulario.horaEntrada =
      datos.entrada24;

    this.horarioFormulario.horaSalida =
      datos.salida24;

    this.horarioFormulario.horasDia =
      8;
  }

  /* =====================================================
     SELECCIONAR DÍAS
  ===================================================== */

  cambiarDia(
    dia: string
  ): void {
    const dias =
      Array.isArray(
        this.horarioFormulario.dias
      )
        ? this.horarioFormulario.dias
        : [];

    if (dias.includes(dia)) {
      this.horarioFormulario.dias =
        dias.filter(
          (item: string) =>
            item !== dia
        );
    } else {
      this.horarioFormulario.dias = [
        ...dias,
        dia
      ];
    }
  }

  diaSeleccionado(
    dia: string
  ): boolean {
    return (
      Array.isArray(
        this.horarioFormulario.dias
      ) &&
      this.horarioFormulario.dias.includes(
        dia
      )
    );
  }

  /* =====================================================
     CERRAR FORMULARIO
  ===================================================== */

  cerrarFormulario(): void {
    this.mostrarFormulario = false;

    this.horarioFormulario =
      this.crearHorarioVacio();

    this.indiceEditando = null;
    this.modoEdicion = false;

    document.body.style.overflow =
      '';
  }

  cerrarDesdeFondo(
    event: MouseEvent
  ): void {
    if (
      event.target ===
      event.currentTarget
    ) {
      this.cerrarFormulario();
    }
  }

  /* =====================================================
     DEPARTAMENTOS
  ===================================================== */

  obtenerDepartamento(
    id: any
  ): string {
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
      departamentos[Number(id)] ||
      'Sin departamento'
    );
  }

  /* =====================================================
     TURNOS
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
      Matutino: '1er Turno',
      Vespertino: '2do Turno',
      Nocturno: '3er Turno',

      '1er Turno': '1er Turno',
      '2do Turno': '2do Turno',
      '3er Turno': '3er Turno'
    };

    return (
      equivalencias[valor] ||
      valor
    );
  }

  private obtenerHorasTurno(
    turno: any
  ): {
    entrada: string;
    salida: string;
    entrada24: string;
    salida24: string;
  } {
    const valor =
      String(
        turno || ''
      ).trim();

    if (
      valor === '1er Turno' ||
      valor === 'Matutino'
    ) {
      return {
        entrada: '07:00 AM',
        salida: '03:00 PM',
        entrada24: '07:00',
        salida24: '15:00'
      };
    }

    if (
      valor === '2do Turno' ||
      valor === 'Vespertino'
    ) {
      return {
        entrada: '03:00 PM',
        salida: '11:00 PM',
        entrada24: '15:00',
        salida24: '23:00'
      };
    }

    if (
      valor === '3er Turno' ||
      valor === 'Nocturno'
    ) {
      return {
        entrada: '11:00 PM',
        salida: '07:00 AM',
        entrada24: '23:00',
        salida24: '07:00'
      };
    }

    return {
      entrada: '07:00 AM',
      salida: '03:00 PM',
      entrada24: '07:00',
      salida24: '15:00'
    };
  }

  /* =====================================================
     FORMATEAR HORA
  ===================================================== */

  private formatearHora(
    hora: string
  ): string {
    if (
      !hora ||
      !/^\d{2}:\d{2}$/.test(hora)
    ) {
      return hora || '';
    }

    const partes =
      hora.split(':');

    const horas =
      Number(partes[0]);

    const minutos =
      partes[1];

    const periodo =
      horas >= 12
        ? 'PM'
        : 'AM';

    const horaDoce =
      horas % 12 || 12;

    return `${String(
      horaDoce
    ).padStart(
      2,
      '0'
    )}:${minutos} ${periodo}`;
  }

  private extraerHoras(
    horario: any
  ): {
    entrada: string;
    salida: string;
  } {
    if (
      horario.horaEntrada &&
      horario.horaSalida
    ) {
      return {
        entrada:
          horario.horaEntrada,

        salida:
          horario.horaSalida
      };
    }

    return this.obtenerHorasTurno(
      horario.turno
    );
  }

  /* =====================================================
     LOCAL STORAGE
  ===================================================== */

  private guardarHorariosLocales(): void {
    try {
      localStorage.setItem(
        this.claveLocalStorage,
        JSON.stringify(
          this.horarios
        )
      );
    } catch (error) {
      console.error(
        'No se pudieron guardar los horarios localmente:',
        error
      );
    }
  }

  private obtenerHorariosLocales(): any[] {
    try {
      const contenido =
        localStorage.getItem(
          this.claveLocalStorage
        );

      if (!contenido) {
        return [];
      }

      const datos =
        JSON.parse(contenido);

      return Array.isArray(datos)
        ? datos
        : [];
    } catch (error) {
      console.error(
        'No se pudieron recuperar los horarios locales:',
        error
      );

      return [];
    }
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
        '2. El backend use el puerto 3000.\n' +
        '3. El proxy.conf.json esté activo.\n' +
        '4. Angular se haya iniciado con npm start.'
      );
    }

    if (error.status === 400) {
      if (
        Array.isArray(
          error.error?.errores
        )
      ) {
        return error.error.errores
          .map(
            (item: any) =>
              `${item.campo}: ${item.mensaje}`
          )
          .join('\n');
      }

      return (
        error.error?.mensaje ||
        'Los datos enviados no son válidos.'
      );
    }

    if (error.status === 403) {
      return (
        error.error?.mensaje ||
        'La solicitud fue bloqueada por la configuración de seguridad.'
      );
    }

    if (error.status === 404) {
      return (
        error.error?.mensaje ||
        'No se encontró la ruta solicitada.'
      );
    }

    if (error.status === 429) {
      return (
        error.error?.mensaje ||
        'Se realizaron demasiadas solicitudes.'
      );
    }

    if (error.status >= 500) {
      return (
        error.error?.mensaje ||
        'El backend tuvo un error al consultar MySQL.'
      );
    }

    return (
      error.error?.mensaje ||
      mensajePredeterminado
    );
  }
}