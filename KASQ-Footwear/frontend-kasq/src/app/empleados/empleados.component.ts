import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  HttpClient,
  HttpClientModule
} from '@angular/common/http';

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HttpClientModule
  ],
  templateUrl: './empleados.component.html',
  styleUrls: ['./empleados.component.css']
})
export class EmpleadosComponent implements OnInit {

  /* =========================
     CONFIGURACIÓN DE LA API
  ========================== */

  apiUrl: string = 'http://localhost:3000';

  /* =========================
     LISTAS Y FILTROS
  ========================== */

  empleados: any[] = [];
  empleadosFiltrados: any[] = [];

  busqueda: string = '';
  departamentoSeleccionado: string = '';
  estadoSeleccionado: string = '';
  turnoSeleccionado: string = '';

  cargando: boolean = false;
  guardando: boolean = false;
  eliminandoId: number | null = null;

  /* =========================
     TURNOS DISPONIBLES
  ========================== */

  turnos: string[] = [
    'Matutino',
    'Vespertino',
    'Nocturno'
  ];

  /* =========================
     VENTANA DE EDICIÓN
  ========================== */

  mostrarModalEditar: boolean = false;

  empleadoEditando: any = this.crearEmpleadoVacio();

  fotoNueva: File | null = null;

  /* =========================
     CONSTRUCTOR
  ========================== */

  constructor(
    private http: HttpClient
  ) {}

  /* =========================
     INICIO
  ========================== */

  ngOnInit(): void {
    this.obtenerEmpleados();
  }

  /* =========================
     EMPLEADO VACÍO
  ========================== */

  crearEmpleadoVacio(): any {
    return {
      idEmpleado: null,
      fotoActual: '',

      nombre: '',
      apellidoPaterno: '',
      apellidoMaterno: '',
      fechaNacimiento: '',
      edad: '',
      celular: '',
      direccion: '',
      correo: '',
      estadoCivil: '',
      genero: '',

      idDepartamento: '',
      puesto: '',
      numeroEmpleado: '',
      fechaIngreso: '',
      turno: '',
      estado: 'Activo',
      tipoContrato: '',
      salario: '',
      horasLaboralesDia: 9,

      banco: 'BANORTE',
      numeroTarjeta: '',
      clabeInterbancaria: '',
      titularCuenta: ''
    };
  }

  /* =========================
     OBTENER EMPLEADOS
  ========================== */

  obtenerEmpleados(): void {
    this.cargando = true;

    this.http.get<any[]>(
      `${this.apiUrl}/empleados`
    ).subscribe({
      next: (respuesta) => {
        this.empleados = Array.isArray(respuesta)
          ? respuesta
          : [];

        this.filtrarEmpleados();
        this.cargando = false;
      },

      error: (error) => {
        console.error(
          'Error al obtener empleados:',
          error
        );

        this.empleados = [];
        this.empleadosFiltrados = [];
        this.cargando = false;

        alert(
          'No se pudieron obtener los empleados. Verifica que el backend esté encendido.'
        );
      }
    });
  }

  /* =========================
     FILTRAR EMPLEADOS
  ========================== */

  filtrarEmpleados(): void {
    const texto = this.busqueda
      .trim()
      .toLowerCase();

    this.empleadosFiltrados = this.empleados.filter(
      (empleado: any) => {

        const nombre = this.obtenerNombreCompleto(
          empleado
        ).toLowerCase();

        const numero = String(
          empleado.NumeroEmpleado ??
          empleado.numeroEmpleado ??
          ''
        ).toLowerCase();

        const puesto = String(
          empleado.Puesto ??
          empleado.puesto ??
          ''
        ).toLowerCase();

        const correo = String(
          empleado.Correo ??
          empleado.correo ??
          ''
        ).toLowerCase();

        const departamento =
          this.obtenerDepartamento(
            empleado.IdDepartamento ??
            empleado.idDepartamento
          );

        const estado =
          this.obtenerEstado(empleado);

        const turno =
          this.obtenerTurno(empleado);

        const coincideTexto =
          !texto ||
          nombre.includes(texto) ||
          numero.includes(texto) ||
          puesto.includes(texto) ||
          correo.includes(texto) ||
          turno.toLowerCase().includes(texto);

        const coincideDepartamento =
          !this.departamentoSeleccionado ||
          departamento ===
            this.departamentoSeleccionado;

        const coincideEstado =
          !this.estadoSeleccionado ||
          estado ===
            this.estadoSeleccionado;

        const coincideTurno =
          !this.turnoSeleccionado ||
          turno ===
            this.turnoSeleccionado;

        return (
          coincideTexto &&
          coincideDepartamento &&
          coincideEstado &&
          coincideTurno
        );
      }
    );
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.departamentoSeleccionado = '';
    this.estadoSeleccionado = '';
    this.turnoSeleccionado = '';

    this.filtrarEmpleados();
  }

  /* =========================
     INFORMACIÓN DE LA TABLA
  ========================== */

  obtenerNombreCompleto(
    empleado: any
  ): string {
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

    return `
      ${nombre}
      ${apellidoPaterno}
      ${apellidoMaterno}
    `
      .replace(/\s+/g, ' ')
      .trim() || 'Sin nombre';
  }

  obtenerDepartamento(
    idDepartamento: any
  ): string {
    const departamentos:
      Record<string, string> = {
        '1': 'Producción',
        '2': 'Calidad',
        '3': 'Almacén',
        '4': 'Recursos Humanos',
        '5': 'Administración',
        '6': 'Ventas'
      };

    return (
      departamentos[String(idDepartamento)] ||
      'Sin departamento'
    );
  }

  obtenerEstado(
    empleado: any
  ): string {
    return String(
      empleado.Estado ??
      empleado.estado ??
      'Sin estado'
    );
  }

  obtenerTurno(
    empleado: any
  ): string {
    return String(
      empleado.Turno ??
      empleado.turno ??
      'Sin turno'
    );
  }

  obtenerIdEmpleado(
    empleado: any
  ): number | null {
    const id =
      empleado.IdEmpleado ??
      empleado.idEmpleado ??
      empleado.id ??
      null;

    if (
      id === null ||
      id === undefined
    ) {
      return null;
    }

    return Number(id);
  }

  fotoEmpleado(
    empleado: any
  ): string {
    const foto =
      empleado.Foto ??
      empleado.foto ??
      '';

    if (!foto) {
      return '';
    }

    if (
      foto.startsWith('http://') ||
      foto.startsWith('https://')
    ) {
      return foto;
    }

    if (foto.startsWith('/uploads/')) {
      return `${this.apiUrl}${foto}`;
    }

    return `${this.apiUrl}/uploads/${foto}`;
  }

  totalActivos(): number {
    return this.empleados.filter(
      (empleado: any) =>
        this.obtenerEstado(empleado)
          .toLowerCase() === 'activo'
    ).length;
  }

  totalDepartamentos(): number {
    const departamentos = this.empleados
      .map((empleado: any) =>
        this.obtenerDepartamento(
          empleado.IdDepartamento ??
          empleado.idDepartamento
        )
      )
      .filter(
        (departamento: string) =>
          departamento !== 'Sin departamento'
      );

    return new Set(departamentos).size;
  }

  totalTurno(
    turno: string
  ): number {
    return this.empleados.filter(
      (empleado: any) =>
        this.obtenerTurno(empleado) === turno
    ).length;
  }

  /* =========================
     ABRIR EDICIÓN
  ========================== */

  editarEmpleado(
    empleado: any
  ): void {
    const idEmpleado =
      this.obtenerIdEmpleado(empleado);

    if (!idEmpleado) {
      alert(
        'No se encontró el ID del empleado.'
      );
      return;
    }

    this.fotoNueva = null;

    this.empleadoEditando = {
      idEmpleado,

      fotoActual:
        empleado.Foto ??
        empleado.foto ??
        '',

      nombre:
        empleado.Nombre ??
        empleado.nombre ??
        '',

      apellidoPaterno:
        empleado.ApellidoPaterno ??
        empleado.apellidoPaterno ??
        '',

      apellidoMaterno:
        empleado.ApellidoMaterno ??
        empleado.apellidoMaterno ??
        '',

      fechaNacimiento:
        this.formatearFechaInput(
          empleado.FechaNacimiento ??
          empleado.fechaNacimiento
        ),

      edad:
        empleado.Edad ??
        empleado.edad ??
        '',

      celular:
        empleado.Celular ??
        empleado.celular ??
        '',

      direccion:
        empleado.Direccion ??
        empleado.direccion ??
        '',

      correo:
        empleado.Correo ??
        empleado.correo ??
        '',

      estadoCivil:
        empleado.EstadoCivil ??
        empleado.estadoCivil ??
        '',

      genero:
        empleado.Genero ??
        empleado.genero ??
        '',

      idDepartamento: String(
        empleado.IdDepartamento ??
        empleado.idDepartamento ??
        ''
      ),

      puesto:
        empleado.Puesto ??
        empleado.puesto ??
        '',

      numeroEmpleado:
        empleado.NumeroEmpleado ??
        empleado.numeroEmpleado ??
        '',

      fechaIngreso:
        this.formatearFechaInput(
          empleado.FechaIngreso ??
          empleado.fechaIngreso
        ),

      turno:
        empleado.Turno ??
        empleado.turno ??
        '',

      estado:
        empleado.Estado ??
        empleado.estado ??
        'Activo',

      tipoContrato:
        empleado.TipoContrato ??
        empleado.tipoContrato ??
        '',

      salario:
        empleado.Salario ??
        empleado.salario ??
        '',

      horasLaboralesDia:
        empleado.HorasLaboralesDia ??
        empleado.horasLaboralesDia ??
        9,

      banco:
        empleado.Banco ??
        empleado.banco ??
        'BANORTE',

      numeroTarjeta:
        empleado.NumeroTarjeta ??
        empleado.numeroTarjeta ??
        '',

      clabeInterbancaria:
        empleado.ClabeInterbancaria ??
        empleado.clabeInterbancaria ??
        '',

      titularCuenta:
        empleado.TitularCuenta ??
        empleado.titularCuenta ??
        ''
    };

    this.mostrarModalEditar = true;

    document.body.style.overflow = 'hidden';
  }

  formatearFechaInput(
    fecha: any
  ): string {
    if (!fecha) {
      return '';
    }

    const texto = String(fecha);

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ) {
      return texto;
    }

    return texto.substring(0, 10);
  }

  /* =========================
     SELECCIONAR TURNO
  ========================== */

  seleccionarTurno(
    turno: string
  ): void {
    const turnoLimpio =
      String(turno || '').trim();

    if (!turnoLimpio) {
      this.empleadoEditando.turno = '';
      return;
    }

    if (
      !this.turnos.includes(turnoLimpio)
    ) {
      this.empleadoEditando.turno = '';

      alert(
        'El turno seleccionado no es válido.'
      );

      return;
    }

    this.empleadoEditando.turno =
      turnoLimpio;

    console.log(
      'Turno seleccionado:',
      this.empleadoEditando.turno
    );
  }

  /* =========================
     FOTO NUEVA
  ========================== */

  seleccionarFotoEditar(
    event: Event
  ): void {
    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      this.fotoNueva = null;
      return;
    }

    const archivo = input.files[0];

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {
      alert(
        'Selecciona una imagen JPG, PNG, GIF o WEBP.'
      );

      input.value = '';
      this.fotoNueva = null;

      return;
    }

    if (
      archivo.size >
      2 * 1024 * 1024
    ) {
      alert(
        'La imagen no debe pesar más de 2 MB.'
      );

      input.value = '';
      this.fotoNueva = null;

      return;
    }

    this.fotoNueva = archivo;
  }

  /* =========================
     GUARDAR EDICIÓN
  ========================== */

  guardarCambios(): void {
    if (this.guardando) {
      return;
    }

    const empleado =
      this.empleadoEditando;

    const nombre =
      String(empleado.nombre || '').trim();

    const apellidoPaterno =
      String(
        empleado.apellidoPaterno || ''
      ).trim();

    const numeroEmpleado =
      String(
        empleado.numeroEmpleado || ''
      ).trim();

    const puesto =
      String(empleado.puesto || '').trim();

    const turno =
      String(empleado.turno || '').trim();

    if (
      !empleado.idEmpleado ||
      !nombre ||
      !apellidoPaterno ||
      !numeroEmpleado ||
      !puesto ||
      !empleado.idDepartamento ||
      !turno
    ) {
      alert(
        'Completa nombre, apellido paterno, número de empleado, departamento, puesto y turno.'
      );

      return;
    }

    if (
      !this.turnos.includes(turno)
    ) {
      alert(
        'Selecciona un turno válido: Matutino, Vespertino o Nocturno.'
      );

      return;
    }

    this.guardando = true;

    const datos = new FormData();

    if (this.fotoNueva) {
      datos.append(
        'foto',
        this.fotoNueva
      );
    }

    datos.append(
      'fotoActual',
      empleado.fotoActual || ''
    );

    datos.append(
      'nombre',
      nombre
    );

    datos.append(
      'apellidoPaterno',
      apellidoPaterno
    );

    datos.append(
      'apellidoMaterno',
      String(
        empleado.apellidoMaterno || ''
      ).trim()
    );

    datos.append(
      'fechaNacimiento',
      empleado.fechaNacimiento || ''
    );

    datos.append(
      'edad',
      String(empleado.edad || '')
    );

    datos.append(
      'celular',
      String(empleado.celular || '').trim()
    );

    datos.append(
      'direccion',
      String(
        empleado.direccion || ''
      ).trim()
    );

    datos.append(
      'correo',
      String(empleado.correo || '').trim()
    );

    datos.append(
      'estadoCivil',
      empleado.estadoCivil || ''
    );

    datos.append(
      'genero',
      empleado.genero || ''
    );

    datos.append(
      'idDepartamento',
      String(empleado.idDepartamento)
    );

    datos.append(
      'puesto',
      puesto
    );

    datos.append(
      'numeroEmpleado',
      numeroEmpleado
    );

    datos.append(
      'fechaIngreso',
      empleado.fechaIngreso || ''
    );

    datos.append(
      'turno',
      turno
    );

    datos.append(
      'estado',
      empleado.estado || 'Activo'
    );

    datos.append(
      'tipoContrato',
      empleado.tipoContrato || ''
    );

    datos.append(
      'salario',
      String(empleado.salario || 0)
    );

    datos.append(
      'horasLaboralesDia',
      String(
        empleado.horasLaboralesDia || 9
      )
    );

    datos.append(
      'banco',
      empleado.banco || 'BANORTE'
    );

    datos.append(
      'numeroTarjeta',
      String(
        empleado.numeroTarjeta || ''
      ).trim()
    );

    datos.append(
      'clabeInterbancaria',
      String(
        empleado.clabeInterbancaria || ''
      ).trim()
    );

    datos.append(
      'titularCuenta',
      String(
        empleado.titularCuenta || ''
      ).trim()
    );

    this.http.put(
      `${this.apiUrl}/empleados/${empleado.idEmpleado}`,
      datos
    ).subscribe({
      next: () => {
        this.guardando = false;

        alert(
          'Empleado actualizado correctamente.'
        );

        this.cerrarModalEditar();
        this.obtenerEmpleados();
      },

      error: (error) => {
        console.error(
          'Error al actualizar empleado:',
          error
        );

        this.guardando = false;

        const mensaje =
          error?.error?.mensaje ||
          error?.error?.error ||
          'No se pudo actualizar el empleado.';

        alert(mensaje);
      }
    });
  }

  /* =========================
     CERRAR EDICIÓN
  ========================== */

  cerrarModalEditar(): void {
    if (this.guardando) {
      return;
    }

    this.mostrarModalEditar = false;
    this.fotoNueva = null;

    this.empleadoEditando =
      this.crearEmpleadoVacio();

    document.body.style.overflow = '';
  }

  cerrarModalDesdeFondo(
    event: MouseEvent
  ): void {
    if (
      event.target ===
      event.currentTarget
    ) {
      this.cerrarModalEditar();
    }
  }

  /* =========================
     ELIMINAR EMPLEADO
  ========================== */

  eliminarEmpleado(
    empleado: any
  ): void {
    const idEmpleado =
      this.obtenerIdEmpleado(empleado);

    if (!idEmpleado) {
      alert(
        'No se encontró el ID del empleado.'
      );

      return;
    }

    const nombreCompleto =
      this.obtenerNombreCompleto(empleado);

    const confirmar = confirm(
      `¿Seguro que deseas eliminar a ${nombreCompleto}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    this.eliminandoId = idEmpleado;

    this.http.delete(
      `${this.apiUrl}/empleados/${idEmpleado}`
    ).subscribe({
      next: () => {
        this.eliminandoId = null;

        alert(
          'Empleado eliminado correctamente.'
        );

        this.obtenerEmpleados();
      },

      error: (error) => {
        console.error(
          'Error al eliminar empleado:',
          error
        );

        this.eliminandoId = null;

        const mensaje =
          error?.error?.mensaje ||
          error?.error?.error ||
          'No se pudo eliminar el empleado.';

        alert(mensaje);
      }
    });
  }
}