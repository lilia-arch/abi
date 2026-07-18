import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActivatedRoute,
  Router,
  RouterLink
} from '@angular/router';
import {
  HttpClient,
  HttpClientModule,
  HttpErrorResponse
} from '@angular/common/http';

@Component({
  selector: 'app-registrar-empleado',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    HttpClientModule
  ],
  templateUrl: './registrar-empleado.component.html',
  styleUrls: ['./registrar-empleado.component.css']
})
export class RegistrarEmpleadoComponent implements OnInit {

  /*
    Angular manda:

    /api/empleados

    El proxy lo envía a:

    http://127.0.0.1:3000/empleados
  */
  private readonly apiUrl = '/api/empleados';

  foto: File | null = null;

  guardando = false;
  cargando = false;
  modoEdicion = false;

  empleado: any = this.crearEmpleadoVacio();

  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const idRuta = this.route.snapshot.paramMap.get('id');

    if (!idRuta) {
      this.modoEdicion = false;
      return;
    }

    const idEmpleado = Number(idRuta);

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      alert(
        'El identificador del empleado no es válido.'
      );

      this.router.navigate(['/empleados']);
      return;
    }

    this.modoEdicion = true;
    this.obtenerEmpleado(idEmpleado);
  }

  /* =====================================================
     SELECCIONAR FOTO
  ===================================================== */

  seleccionarFoto(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {
      this.foto = null;
      return;
    }

    const archivo = input.files[0];

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (
      !tiposPermitidos.includes(
        archivo.type
      )
    ) {
      alert(
        'La foto debe ser un archivo JPG, JPEG, PNG o WEBP.'
      );

      input.value = '';
      this.foto = null;
      return;
    }

    const limiteBytes =
      2 * 1024 * 1024;

    if (
      archivo.size >
      limiteBytes
    ) {
      alert(
        'La foto no debe superar los 2 MB.'
      );

      input.value = '';
      this.foto = null;
      return;
    }

    this.foto = archivo;
  }

  /* =====================================================
     CARGAR EMPLEADO PARA EDITAR
  ===================================================== */

  obtenerEmpleado(idEmpleado: number): void {
    if (this.cargando) {
      return;
    }

    this.cargando = true;

    this.http.get<any>(
      `${this.apiUrl}/${idEmpleado}`
    ).subscribe({
      next: (respuesta) => {
        this.empleado = {
          idEmpleado:
            respuesta.IdEmpleado ??
            respuesta.idEmpleado ??
            idEmpleado,

          fotoActual:
            respuesta.Foto ??
            respuesta.foto ??
            '',

          nombre:
            respuesta.Nombre ??
            respuesta.nombre ??
            '',

          apellidoPaterno:
            respuesta.ApellidoPaterno ??
            respuesta.apellidoPaterno ??
            '',

          apellidoMaterno:
            respuesta.ApellidoMaterno ??
            respuesta.apellidoMaterno ??
            '',

          fechaNacimiento:
            this.formatearFecha(
              respuesta.FechaNacimiento ??
              respuesta.fechaNacimiento
            ),

          edad:
            respuesta.Edad ??
            respuesta.edad ??
            '',

          celular:
            respuesta.Celular ??
            respuesta.celular ??
            '',

          direccion:
            respuesta.Direccion ??
            respuesta.direccion ??
            '',

          correo:
            respuesta.Correo ??
            respuesta.correo ??
            '',

          estadoCivil:
            respuesta.EstadoCivil ??
            respuesta.estadoCivil ??
            '',

          genero:
            respuesta.Genero ??
            respuesta.genero ??
            '',

          idDepartamento: String(
            respuesta.IdDepartamento ??
            respuesta.idDepartamento ??
            ''
          ),

          puesto:
            respuesta.Puesto ??
            respuesta.puesto ??
            '',

          numeroEmpleado:
            respuesta.NumeroEmpleado ??
            respuesta.numeroEmpleado ??
            '',

          fechaIngreso:
            this.formatearFecha(
              respuesta.FechaIngreso ??
              respuesta.fechaIngreso
            ),

          turno:
            this.convertirTurnoParaFormulario(
              respuesta.Turno ??
              respuesta.turno ??
              ''
            ),

          estado:
            respuesta.Estado ??
            respuesta.estado ??
            'Activo',

          tipoContrato:
            respuesta.TipoContrato ??
            respuesta.tipoContrato ??
            '',

          salario:
            respuesta.Salario ??
            respuesta.salario ??
            '',

          horasLaboralesDia:
            respuesta.HorasLaboralesDia ??
            respuesta.horasLaboralesDia ??
            9,

          banco:
            respuesta.Banco ??
            respuesta.banco ??
            'BANORTE',

          numeroTarjeta:
            respuesta.NumeroTarjeta ??
            respuesta.numeroTarjeta ??
            '',

          clabeInterbancaria:
            respuesta.ClabeInterbancaria ??
            respuesta.clabeInterbancaria ??
            '',

          titularCuenta:
            respuesta.TitularCuenta ??
            respuesta.titularCuenta ??
            ''
        };

        this.cargando = false;
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al obtener el empleado:',
          error
        );

        alert(
          this.obtenerMensajeError(
            error,
            'No fue posible cargar el empleado.'
          )
        );

        this.cargando = false;

        this.router.navigate([
          '/empleados'
        ]);
      }
    });
  }

  /* =====================================================
     GUARDAR EMPLEADO NUEVO
  ===================================================== */

  guardarEmpleado(): void {
    if (
      this.guardando ||
      this.cargando
    ) {
      return;
    }

    if (
      !this.validarFormulario()
    ) {
      return;
    }

    const formData =
      this.crearFormData();

    this.guardando = true;

    this.http.post<any>(
      this.apiUrl,
      formData
    ).subscribe({
      next: (respuesta) => {
        console.log(
          'Empleado guardado:',
          respuesta
        );

        alert(
          respuesta?.mensaje ||
          'Empleado guardado correctamente.'
        );

        this.guardando = false;

        this.limpiarFormulario();

        this.router.navigate([
          '/empleados'
        ]);
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error completo:',
          error
        );

        console.error(
          'Respuesta del backend:',
          error.error
        );

        alert(
          this.obtenerMensajeError(
            error,
            'Error al guardar el empleado.'
          )
        );

        this.guardando = false;
      }
    });
  }

  /* =====================================================
     EDITAR EMPLEADO
  ===================================================== */

  editarEmpleado(): void {
    if (
      this.guardando ||
      this.cargando
    ) {
      return;
    }

    const idEmpleado = Number(
      this.empleado.idEmpleado
    );

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      alert(
        'No se encontró el identificador del empleado.'
      );

      return;
    }

    if (
      !this.validarFormulario()
    ) {
      return;
    }

    const confirmar =
      window.confirm(
        '¿Deseas guardar los cambios de este empleado?'
      );

    if (!confirmar) {
      return;
    }

    const formData =
      this.crearFormData();

    this.guardando = true;

    this.http.put<any>(
      `${this.apiUrl}/${idEmpleado}`,
      formData
    ).subscribe({
      next: (respuesta) => {
        console.log(
          'Empleado actualizado:',
          respuesta
        );

        alert(
          respuesta?.mensaje ||
          'Empleado actualizado correctamente.'
        );

        this.guardando = false;

        this.router.navigate([
          '/empleados'
        ]);
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al editar empleado:',
          error
        );

        alert(
          this.obtenerMensajeError(
            error,
            'No fue posible actualizar el empleado.'
          )
        );

        this.guardando = false;
      }
    });
  }

  /* =====================================================
     ELIMINAR EMPLEADO
  ===================================================== */

  eliminarEmpleado(): void {
    if (
      this.guardando ||
      this.cargando
    ) {
      return;
    }

    const idEmpleado = Number(
      this.empleado.idEmpleado
    );

    if (
      !Number.isInteger(idEmpleado) ||
      idEmpleado <= 0
    ) {
      alert(
        'No se encontró el identificador del empleado.'
      );

      return;
    }

    const nombreCompleto = [
      this.empleado.nombre,
      this.empleado.apellidoPaterno,
      this.empleado.apellidoMaterno
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    const confirmar =
      window.confirm(
        `¿Seguro que deseas eliminar a ${
          nombreCompleto ||
          'este empleado'
        }?`
      );

    if (!confirmar) {
      return;
    }

    this.guardando = true;

    this.http.delete<any>(
      `${this.apiUrl}/${idEmpleado}`
    ).subscribe({
      next: (respuesta) => {
        console.log(
          'Empleado eliminado:',
          respuesta
        );

        alert(
          respuesta?.mensaje ||
          'Empleado eliminado correctamente.'
        );

        this.guardando = false;

        this.router.navigate([
          '/empleados'
        ]);
      },

      error: (
        error: HttpErrorResponse
      ) => {
        console.error(
          'Error al eliminar empleado:',
          error
        );

        alert(
          this.obtenerMensajeError(
            error,
            'No fue posible eliminar el empleado.'
          )
        );

        this.guardando = false;
      }
    });
  }

  /* =====================================================
     CREAR FORMDATA
  ===================================================== */

  private crearFormData(): FormData {
    const formData =
      new FormData();

    const datosEnviar: any = {
      ...this.empleado,

      turno:
        this.convertirTurnoParaBackend(
          this.empleado.turno
        ),

      nombre:
        this.limpiarTexto(
          this.empleado.nombre
        ),

      apellidoPaterno:
        this.limpiarTexto(
          this.empleado.apellidoPaterno
        ),

      apellidoMaterno:
        this.limpiarTexto(
          this.empleado.apellidoMaterno
        ),

      puesto:
        this.limpiarTexto(
          this.empleado.puesto
        ),

      numeroEmpleado:
        this.limpiarTexto(
          this.empleado.numeroEmpleado
        ),

      correo:
        this.limpiarTexto(
          this.empleado.correo
        ).toLowerCase(),

      celular:
        this.limpiarTexto(
          this.empleado.celular
        ),

      direccion:
        this.limpiarTexto(
          this.empleado.direccion
        ),

      titularCuenta:
        this.limpiarTexto(
          this.empleado.titularCuenta
        ),

      numeroTarjeta:
        this.soloNumeros(
          this.empleado.numeroTarjeta
        ),

      clabeInterbancaria:
        this.soloNumeros(
          this.empleado.clabeInterbancaria
        )
    };

    const campos = [
      'nombre',
      'apellidoPaterno',
      'apellidoMaterno',
      'fechaNacimiento',
      'edad',
      'celular',
      'direccion',
      'correo',
      'estadoCivil',
      'genero',
      'idDepartamento',
      'puesto',
      'numeroEmpleado',
      'fechaIngreso',
      'turno',
      'estado',
      'tipoContrato',
      'salario',
      'horasLaboralesDia',
      'banco',
      'numeroTarjeta',
      'clabeInterbancaria',
      'titularCuenta'
    ];

    campos.forEach(
      (campo: string) => {
        const valor =
          datosEnviar[campo];

        formData.append(
          campo,

          valor === null ||
          valor === undefined
            ? ''
            : String(valor).trim()
        );
      }
    );

    if (this.foto) {
      formData.append(
        'foto',
        this.foto,
        this.foto.name
      );
    }

    return formData;
  }

  /* =====================================================
     VALIDAR FORMULARIO
  ===================================================== */

  private validarFormulario(): boolean {
    const nombre =
      this.limpiarTexto(
        this.empleado.nombre
      );

    if (!nombre) {
      alert(
        'Ingresa el nombre del empleado.'
      );

      return false;
    }

    if (
      nombre.length < 2 ||
      nombre.length > 100
    ) {
      alert(
        'El nombre debe tener entre 2 y 100 caracteres.'
      );

      return false;
    }

    const apellidoPaterno =
      this.limpiarTexto(
        this.empleado.apellidoPaterno
      );

    if (!apellidoPaterno) {
      alert(
        'Ingresa el apellido paterno del empleado.'
      );

      return false;
    }

    if (
      apellidoPaterno.length < 2 ||
      apellidoPaterno.length > 100
    ) {
      alert(
        'El apellido paterno debe tener entre 2 y 100 caracteres.'
      );

      return false;
    }

    const apellidoMaterno =
      this.limpiarTexto(
        this.empleado.apellidoMaterno
      );

    if (
      apellidoMaterno.length > 100
    ) {
      alert(
        'El apellido materno no puede superar los 100 caracteres.'
      );

      return false;
    }

    if (
      !this.empleado.idDepartamento
    ) {
      alert(
        'Selecciona el departamento.'
      );

      return false;
    }

    const idDepartamento = Number(
      this.empleado.idDepartamento
    );

    if (
      !Number.isInteger(
        idDepartamento
      ) ||
      idDepartamento <= 0
    ) {
      alert(
        'El departamento seleccionado no es válido.'
      );

      return false;
    }

    const puesto =
      this.limpiarTexto(
        this.empleado.puesto
      );

    if (!puesto) {
      alert(
        'Ingresa el puesto del empleado.'
      );

      return false;
    }

    if (
      puesto.length > 100
    ) {
      alert(
        'El puesto no puede superar los 100 caracteres.'
      );

      return false;
    }

    const numeroEmpleado =
      this.limpiarTexto(
        this.empleado.numeroEmpleado
      );

    if (!numeroEmpleado) {
      alert(
        'Ingresa el número de empleado.'
      );

      return false;
    }

    if (
      !/^[a-zA-Z0-9_-]{1,30}$/.test(
        numeroEmpleado
      )
    ) {
      alert(
        'El número de empleado solo puede contener letras, números, guiones y guion bajo.'
      );

      return false;
    }

    if (
      this.empleado.fechaNacimiento &&
      !this.esFechaValida(
        this.empleado.fechaNacimiento
      )
    ) {
      alert(
        'La fecha de nacimiento no es válida.'
      );

      return false;
    }

    if (
      this.empleado.edad !== '' &&
      this.empleado.edad !== null &&
      this.empleado.edad !== undefined
    ) {
      const edad = Number(
        this.empleado.edad
      );

      if (
        !Number.isInteger(edad) ||
        edad < 0 ||
        edad > 120
      ) {
        alert(
          'La edad debe estar entre 0 y 120 años.'
        );

        return false;
      }
    }

    const celular =
      this.limpiarTexto(
        this.empleado.celular
      );

    if (
      celular &&
      !/^[0-9+\-\s()]{7,20}$/.test(
        celular
      )
    ) {
      alert(
        'El número de celular no es válido.'
      );

      return false;
    }

    const correo =
      this.limpiarTexto(
        this.empleado.correo
      );

    if (
      correo &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        correo
      )
    ) {
      alert(
        'Ingresa un correo electrónico válido.'
      );

      return false;
    }

    if (
      !this.empleado.fechaIngreso
    ) {
      alert(
        'Selecciona la fecha de ingreso.'
      );

      return false;
    }

    if (
      !this.esFechaValida(
        this.empleado.fechaIngreso
      )
    ) {
      alert(
        'La fecha de ingreso no es válida.'
      );

      return false;
    }

    if (!this.empleado.turno) {
      alert(
        'Selecciona el turno.'
      );

      return false;
    }

    const turnoBackend =
      this.convertirTurnoParaBackend(
        this.empleado.turno
      );

    const turnosValidos = [
      'Matutino',
      'Vespertino',
      'Nocturno'
    ];

    if (
      !turnosValidos.includes(
        turnoBackend
      )
    ) {
      alert(
        'Selecciona un turno válido.'
      );

      return false;
    }

    const estadosValidos = [
      'Activo',
      'Inactivo',
      'Vacaciones',
      'Baja'
    ];

    if (
      this.empleado.estado &&
      !estadosValidos.includes(
        this.empleado.estado
      )
    ) {
      alert(
        'Selecciona un estado válido.'
      );

      return false;
    }

    if (
      !this.empleado.tipoContrato
    ) {
      alert(
        'Selecciona el tipo de contrato.'
      );

      return false;
    }

    const salario = Number(
      this.empleado.salario
    );

    if (
      this.empleado.salario === '' ||
      this.empleado.salario === null ||
      !Number.isFinite(salario) ||
      salario < 0 ||
      salario > 10000000
    ) {
      alert(
        'Ingresa un sueldo semanal válido.'
      );

      return false;
    }

    const horas = Number(
      this.empleado.horasLaboralesDia
    );

    if (
      !Number.isInteger(horas) ||
      horas < 1 ||
      horas > 24
    ) {
      alert(
        'Las horas laborales deben estar entre 1 y 24.'
      );

      return false;
    }

    const numeroTarjeta =
      this.soloNumeros(
        this.empleado.numeroTarjeta
      );

    if (
      numeroTarjeta !== '' &&
      !/^[0-9]{12,19}$/.test(
        numeroTarjeta
      )
    ) {
      alert(
        'El número de tarjeta debe contener entre 12 y 19 dígitos.'
      );

      return false;
    }

    const clabe =
      this.soloNumeros(
        this.empleado.clabeInterbancaria
      );

    if (
      clabe !== '' &&
      !/^[0-9]{18}$/.test(
        clabe
      )
    ) {
      alert(
        'La CLABE interbancaria debe contener exactamente 18 dígitos.'
      );

      return false;
    }

    const titular =
      this.limpiarTexto(
        this.empleado.titularCuenta
      );

    if (
      titular.length > 100
    ) {
      alert(
        'El titular de la cuenta no puede superar los 100 caracteres.'
      );

      return false;
    }

    return true;
  }

  /* =====================================================
     CONVERTIR TURNOS
  ===================================================== */

  private convertirTurnoParaBackend(
    turno: any
  ): string {
    const valor = String(
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

  private convertirTurnoParaFormulario(
    turno: any
  ): string {
    const valor = String(
      turno || ''
    ).trim();

    /*
      Si tu HTML utiliza:

      1er Turno
      2do Turno
      3er Turno

      se muestran esos valores.

      Si cambiaste tu HTML para usar:

      Matutino
      Vespertino
      Nocturno

      puedes regresar directamente "valor".
    */

    const equivalencias: {
      [key: string]: string
    } = {
      'Matutino': '1er Turno',
      'Vespertino': '2do Turno',
      'Nocturno': '3er Turno'
    };

    return (
      equivalencias[valor] ||
      valor
    );
  }

  /* =====================================================
     FUNCIONES AUXILIARES
  ===================================================== */

  private limpiarTexto(
    valor: any
  ): string {
    if (
      valor === undefined ||
      valor === null
    ) {
      return '';
    }

    return String(valor).trim();
  }

  private soloNumeros(
    valor: any
  ): string {
    return this.limpiarTexto(
      valor
    ).replace(/\D/g, '');
  }

  private esFechaValida(
    fecha: any
  ): boolean {
    const valor =
      this.limpiarTexto(fecha);

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        valor
      )
    ) {
      return false;
    }

    const fechaConvertida =
      new Date(
        `${valor}T00:00:00`
      );

    return !Number.isNaN(
      fechaConvertida.getTime()
    );
  }

  /* =====================================================
     LIMPIAR FORMULARIO
  ===================================================== */

  limpiarFormulario(): void {
    this.empleado =
      this.crearEmpleadoVacio();

    this.foto = null;
    this.modoEdicion = false;

    const inputFoto =
      document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement | null;

    if (inputFoto) {
      inputFoto.value = '';
    }
  }

  /* =====================================================
     CANCELAR
  ===================================================== */

  cancelar(): void {
    this.router.navigate([
      '/empleados'
    ]);
  }

  /* =====================================================
     FORMATEAR FECHA
  ===================================================== */

  private formatearFecha(
    fecha: string |
      null |
      undefined
  ): string {
    if (!fecha) {
      return '';
    }

    return String(
      fecha
    ).substring(0, 10);
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
        '3. El archivo proxy.conf.json esté activo.\n' +
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
        'El backend bloqueó la solicitud por la configuración de seguridad o CORS.'
      );
    }

    if (error.status === 404) {
      return (
        error.error?.mensaje ||
        'No se encontró la ruta o el empleado solicitado.'
      );
    }

    if (error.status === 409) {
      return (
        error.error?.mensaje ||
        'Ya existe un empleado con ese número.'
      );
    }

    if (error.status === 413) {
      return (
        error.error?.mensaje ||
        'La solicitud o la imagen supera el tamaño permitido.'
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
        'El backend tuvo un error al trabajar con MySQL.'
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
     EMPLEADO VACÍO
  ===================================================== */

  private crearEmpleadoVacio(): any {
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

      /*
        Se mantiene vacío para que el usuario
        seleccione el turno.
      */
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
}