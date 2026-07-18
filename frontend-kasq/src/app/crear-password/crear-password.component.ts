import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { EmpleadoService } from '../services/empleado.service';

@Component({
  selector: 'app-crear-password',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './crear-password.component.html',
  styleUrls: ['./crear-password.component.css']
})
export class CrearPasswordComponent {

  correo = '';
  password = '';
  confirmarPassword = '';

  mensaje = '';
  cargando = false;

  constructor(
    private empleadoService: EmpleadoService,
    private router: Router
  ) {}

  guardar(): void {

    this.mensaje = '';

    const correoLimpio = this.correo.trim();

    if (!correoLimpio || !this.password || !this.confirmarPassword) {
      this.mensaje = 'Completa todos los campos.';
      return;
    }

    if (this.password !== this.confirmarPassword) {
      this.mensaje = 'Las contraseñas no coinciden.';
      return;
    }

    this.cargando = true;

    this.empleadoService.crearPassword({
      correo: correoLimpio,
      contrasena: this.password
    })
    .subscribe({

      next: (respuesta: any) => {

        this.cargando = false;

        this.mensaje =
          respuesta.mensaje ||
          'Contraseña creada correctamente.';

        setTimeout(() => {
          this.router.navigate(['/empleado-login']);
        }, 2000);
      },

      error: (error: HttpErrorResponse) => {

        this.cargando = false;

        console.error(
          'Error al crear contraseña:',
          error
        );

        this.mensaje =
          error.error?.mensaje ||
          'Error al guardar contraseña.';
      }

    });
  }
}