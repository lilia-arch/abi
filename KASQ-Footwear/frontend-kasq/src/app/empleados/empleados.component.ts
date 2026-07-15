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

@Component({
  selector: 'app-empleados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    HttpClientModule
  ],
  templateUrl: './empleados.component.html',
  styleUrls: ['./empleados.component.css']
})
export class EmpleadosComponent implements OnInit {

  /* =========================================
     CONFIGURACIÓN DE LA API

     IMPORTANTE:
     No utilizar http://localhost:3000 porque
     desde un teléfono localhost sería el celular.

     Angular enviará /api al proxy y el proxy
     lo redirigirá al backend del puerto 3000.
  ========================================= */

  private readonly apiUrl: string = '/api';

  /* =========================================
     LISTAS Y FILTROS
  ========================================= */

  empleados: any[] = [];
  empleadosFiltrados: any[] = [];

  busqueda: string = '';
  departamentoSeleccionado: string = '';
  estadoSeleccionado: string = '';
  turnoSeleccionado: string = '';

  cargando: boolean = false;
  guardando: boolean = false;
  eliminandoId: number | null = null;

  /* =========================================
     TURNOS DISPONIBLES
  ========================================= */

  turnos: string[] = [
    'Matutino',
    'Vespertino',
    'Nocturno'
  ];

  /* =========================================
     MODAL DE EDICIÓN
  ========================================= */

  mostrarModalEditar: boolean = false;

  empleadoEditando: any =
    this.crearEmpleadoVacio();

  fotoNueva: File | null = null;

  constructor(
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.obtenerEmpleados();
  }

  /* =========================================
     CREAR EMPLEADO VACÍO
  ========================================= */

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

  /* =========================================
     OBTENER EMPLEADOS
  ========================================= */

  obtenerEmpleados(): void {
    if (this.cargando) {
      return;
    }

    this.cargando = true;

    this.http.get<any[]>(
      `${this.apiUrl}/empleados`
    ).subscribe({
      next: (respuesta: any[]) => {
        this.empleados = Array.isArray(respuesta)
          ? respuesta
          : [];

        this.filtrarEmpleados();
        this.cargando = false;

        console.log(
          'Empleados obtenidos:',
          this.empleados
        );
      },

      error: (error: HttpErrorResponse) => {
        console.error(
          'Error al obtener empleados:',
          error
        );

        this.empleados = [];
        this.empleadosFiltrados = [];
        this.cargando = false;

        let mensaje =
          'No se pudieron obtener los empleados.';

        if (error.status === 0) {
          mensaje =
            'No se pudo conectar con el backend. Verifica que Node.js esté encendido.';
        } else if (error.status === 404) {
          mensaje =
            'No se encontró la ruta /api/empleados. Revisa el proxy de Angular.';
        } else if (error.status === 500) {
          mensaje =
            error.error?.mensaje ||
            error.error?.error ||
            'El servidor tuvo un error al consultar los empleados.';
        } else if (
          error.error?.mensaje ||
          error.error?.error
        ) {
          mensaje =
            error.error?.mensaje ||
            error.error?.error;
        }

        alert(mensaje);
      }
    });
  }

  /* =========================================
     FILTRAR EMPLEADOS
  ========================================= */

  filtrarEmpleados(): void {
    const texto = this.busqueda
      .trim()
      .toLowerCase();

    this.empleadosFiltrados =
      this.empleados.filter(
        (empleado: any) => {

          const nombre =
            this.obtenerNombreCompleto(
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
            departamento
              .toLowerCase()
              .includes(texto) ||
            estado
              .toLowerCase()
              .includes(texto) ||
            turno
              .toLowerCase()
              .includes(texto);

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

  /* =========================================
     INFORMACIÓN DEL EMPLEADO
  ========================================= */

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
      departamentos[
        String(idDepartamento)
      ] || 'Sin departamento'
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
      id === undefined ||
      id === ''
    ) {
      return null;
    }

    const idNumero = Number(id);

    return Number.isNaN(idNumero)
      ? null
      : idNumero;
  }

  /* =========================================
     FOTO DEL EMPLEADO
  ========================================= */

  fotoEmpleado(
    empleado: any
  ): string {
    const foto = String(
      empleado.Foto ??
      empleado.foto ??
      ''
    ).trim();

    if (!foto) {
      return '';
    }

    if (
      foto.startsWith('http://') ||
      foto.startsWith('https://') ||
      foto.startsWith('data:')
    ) {
      return foto;
    }

    /*
     Si la base de datos guarda:
     /uploads/imagen.jpg
    */
    if (foto.startsWith('/uploads/')) {
      return `${this.apiUrl}${foto}`;
    }

    /*
     Si la base de datos guarda:
     uploads/imagen.jpg
    */
    if (foto.startsWith('uploads/')) {
      return `${this.apiUrl}/${foto}`;
    }

    /*
     Si solamente guarda:
     imagen.jpg
    */
    return `${this.apiUrl}/uploads/${foto}`;
  }

  manejarErrorFoto(
    event: Event
  ): void {
    const imagen =
      event.target as HTMLImageElement;

    imagen.style.display = 'none';
  }

  /* =========================================
     TOTALES
  ========================================= */

  totalActivos(): number {
    return this.empleados.filter(
      (empleado: any) =>
        this.obtenerEstado(empleado)
          .toLowerCase() === 'activo'
    ).length;
  }

  totalDepartamentos(): number {
    const departamentos =
      this.empleados
        .map((empleado: any) =>
          this.obtenerDepartamento(
            empleado.IdDepartamento ??
            empleado.idDepartamento
          )
        )
        .filter(
          (departamento: string) =>
            departamento !==
            'Sin departamento'
        );

    return new Set(
      departamentos
    ).size;
  }

  totalTurno(
    turno: string
  ): number {
    return this.empleados.filter(
      (empleado: any) =>
        this.obtenerTurno(empleado) ===
        turno
    ).length;
  }

  /* =========================================
     ABRIR EDICIÓN
  ========================================= */

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

    document.body.style.overflow =
      'hidden';
  }

  formatearFechaInput(
    fecha: any
  ): string {
    if (!fecha) {
      return '';
    }

    const texto =
      String(fecha).trim();

    if (
      /^\d{4}-\d{2}-\d{2}$/.test(texto)
    ) {
      return texto;
    }

    return texto.substring(0, 10);
  }

  /* =========================================
     SELECCIONAR TURNO
  ========================================= */

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
      !this.turnos.includes(
        turnoLimpio
      )
    ) {
      this.empleadoEditando.turno = '';

      alert(
        'El turno seleccionado no es válido.'
      );

      return;
    }

    this.empleadoEditando.turno =
      turnoLimpio;
  }

  /* =========================================
     SELECCIONAR FOTO NUEVA
  ========================================= */

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

    const archivo =
      input.files[0];

    const tiposPermitidos: string[] = [
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

    const limiteBytes =
      2 * 1024 * 1024;

    if (
      archivo.size > limiteBytes
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

  /* =========================================
     GUARDAR CAMBIOS
  ========================================= */

  guardarCambios(): void {
    if (this.guardando) {
      return;
    }

    const empleado =
      this.empleadoEditando;

    const nombre = String(
      empleado.nombre || ''
    ).trim();

    const apellidoPaterno = String(
      empleado.apellidoPaterno || ''
    ).trim();

    const numeroEmpleado = String(
      empleado.numeroEmpleado || ''
    ).trim();

    const puesto = String(
      empleado.puesto || ''
    ).trim();

    const turno = String(
      empleado.turno || ''
    ).trim();

    const idDepartamento = String(
      empleado.idDepartamento || ''
    ).trim();

    if (
      !empleado.idEmpleado ||
      !nombre ||
      !apellidoPaterno ||
      !numeroEmpleado ||
      !puesto ||
      !idDepartamento ||
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

    const correo = String(
      empleado.correo || ''
    ).trim();

    if (
      correo &&
      !this.correoValido(correo)
    ) {
      alert(
        'Escribe un correo electrónico válido.'
      );

      return;
    }

    this.guardando = true;

    const datos =
      new FormData();

    if (this.fotoNueva) {
      datos.append(
        'foto',
        this.fotoNueva
      );
    }

    datos.append(
      'fotoActual',
      String(
        empleado.fotoActual || ''
      )
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
      String(
        empleado.celular || ''
      ).trim()
    );

    datos.append(
      'direccion',
      String(
        empleado.direccion || ''
      ).trim()
    );

    datos.append(
      'correo',
      correo
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
      idDepartamento
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
      next: (respuesta: any) => {
        console.log(
          'Empleado actualizado:',
          respuesta
        );

        this.guardando = false;

        alert(
          respuesta?.mensaje ||
          'Empleado actualizado correctamente.'
        );

        this.cerrarModalEditar();
        this.obtenerEmpleados();
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al actualizar empleado:',
          error
        );

        this.guardando = false;

        const mensaje =
          error.error?.mensaje ||
          error.error?.error ||
          'No se pudo actualizar el empleado.';

        alert(mensaje);
      }
    });
  }

  correoValido(
    correo: string
  ): boolean {
    const expresion =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return expresion.test(correo);
  }

  /* =========================================
     CERRAR MODAL
  ========================================= */

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

  /* =========================================
     ELIMINAR EMPLEADO
  ========================================= */

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

    if (
      this.eliminandoId !== null
    ) {
      return;
    }

    const nombreCompleto =
      this.obtenerNombreCompleto(
        empleado
      );

    const confirmar = confirm(
      `¿Seguro que deseas eliminar a ${nombreCompleto}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) {
      return;
    }

    this.eliminandoId =
      idEmpleado;

    this.http.delete<any>(
      `${this.apiUrl}/empleados/${idEmpleado}`
    ).subscribe({
      next: (respuesta: any) => {
        this.eliminandoId = null;

        alert(
          respuesta?.mensaje ||
          'Empleado eliminado correctamente.'
        );

        this.obtenerEmpleados();
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al eliminar empleado:',
          error
        );

        this.eliminandoId = null;

        const mensaje =
          error.error?.mensaje ||
          error.error?.error ||
          'No se pudo eliminar el empleado.';

        alert(mensaje);
      }
    });
  }

  /* =========================================
     RECARGAR LISTA
  ========================================= */

  recargarEmpleados(): void {
    this.obtenerEmpleados();
  }

}