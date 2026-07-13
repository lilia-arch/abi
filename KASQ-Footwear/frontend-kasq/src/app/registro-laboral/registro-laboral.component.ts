import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-registro-laboral',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './registro-laboral.component.html',
  styleUrls: ['./registro-laboral.component.css']
})
export class RegistroLaboralComponent {

  mensajeError = '';
  mensajeExito = '';

  datosLaborales = {
    idDepartamento: '',
    puesto: '',
    numeroEmpleado: '',
    fechaIngreso: '',
    tipoContrato: '',
    salario: null as number | null,
    turno: '',
    horasLaboralesDia: 9,
    supervisor: '',
    centroTrabajo: 'KASQ Footwear',
    estado: 'Activo',
    observaciones: ''
  };

  departamentos = [
    { id: 1, nombre: 'Producción' },
    { id: 2, nombre: 'Recursos Humanos' },
    { id: 3, nombre: 'Administración' },
    { id: 4, nombre: 'Ventas' },
    { id: 5, nombre: 'Almacén' },
    { id: 6, nombre: 'Calidad' }
  ];

  puestos = [
    'Ayudante general',
    'Operador de producción',
    'Supervisor',
    'Encargado de almacén',
    'Auxiliar administrativo',
    'Recursos Humanos',
    'Vendedor'
  ];

  tiposContrato = [
    'Tiempo completo',
    'Medio tiempo',
    'Por obra o proyecto',
    'Eventual'
  ];

  turnos = [
    '1er Turno',
    '2do Turno',
    '3er Turno'
  ];

  estados = [
    'Activo',
    'Inactivo',
    'Vacaciones',
    'Incapacidad'
  ];

  constructor(private router: Router) {}

  validarFormulario(): boolean {
    const datos = this.datosLaborales;

    if (!datos.idDepartamento) {
      this.mensajeError = 'Selecciona el departamento.';
      return false;
    }

    if (!datos.puesto) {
      this.mensajeError = 'Selecciona el puesto del empleado.';
      return false;
    }

    if (!datos.numeroEmpleado.trim()) {
      this.mensajeError = 'Ingresa el número de empleado.';
      return false;
    }

    if (!datos.fechaIngreso) {
      this.mensajeError = 'Selecciona la fecha de ingreso.';
      return false;
    }

    if (!datos.tipoContrato) {
      this.mensajeError = 'Selecciona el tipo de contrato.';
      return false;
    }

    if (datos.salario === null || datos.salario <= 0) {
      this.mensajeError = 'Ingresa un salario válido.';
      return false;
    }

    if (!datos.turno) {
      this.mensajeError = 'Selecciona el turno del empleado.';
      return false;
    }

    if (
      !datos.horasLaboralesDia ||
      datos.horasLaboralesDia < 1 ||
      datos.horasLaboralesDia > 24
    ) {
      this.mensajeError =
        'Las horas laborales deben estar entre 1 y 24.';
      return false;
    }

    if (!datos.centroTrabajo.trim()) {
      this.mensajeError = 'Ingresa el centro de trabajo.';
      return false;
    }

    if (!datos.estado) {
      this.mensajeError = 'Selecciona el estado del empleado.';
      return false;
    }

    return true;
  }

  guardarDatosLaborales(): void {
    this.mensajeError = '';
    this.mensajeExito = '';

    if (!this.validarFormulario()) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });

      return;
    }

    const datosParaGuardar = {
      ...this.datosLaborales,
      salario: Number(this.datosLaborales.salario),
      horasLaboralesDia: Number(
        this.datosLaborales.horasLaboralesDia
      )
    };

    localStorage.setItem(
      'datosLaboralesEmpleado',
      JSON.stringify(datosParaGuardar)
    );

    console.log('Datos laborales guardados:', datosParaGuardar);

    this.mensajeExito =
      'Los datos laborales se guardaron correctamente.';

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  limpiarFormulario(): void {
    this.datosLaborales = {
      idDepartamento: '',
      puesto: '',
      numeroEmpleado: '',
      fechaIngreso: '',
      tipoContrato: '',
      salario: null,
      turno: '',
      horasLaboralesDia: 9,
      supervisor: '',
      centroTrabajo: 'KASQ Footwear',
      estado: 'Activo',
      observaciones: ''
    };

    this.mensajeError = '';
    this.mensajeExito = '';
  }

  cancelar(): void {
    this.router.navigate(['/empleados']);
  }

  cerrarSesion(): void {
    localStorage.removeItem('usuario');
    this.router.navigate(['/']);
  }
}