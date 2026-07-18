import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { EmpleadoService } from '../services/empleado.service';

@Component({
  selector: 'app-empleado-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './empleado-login.component.html',
  styleUrls: ['./empleado-login.component.css']
})
export class EmpleadoLoginComponent {

  correo = '';
  password = '';

  mensaje = '';
  cargando = false;


  constructor(
    private empleadoService: EmpleadoService,
    private router: Router
  ) {}


  ingresar() {

    if (!this.correo || !this.password) {

      this.mensaje =
        'Ingresa correo y contraseña.';

      return;
    }


    this.cargando = true;


    this.empleadoService.login({

      correo: this.correo,

      contrasena: this.password

    })
    .subscribe({

      next: (respuesta: any) => {


        this.cargando = false;


        /*
          Guardamos la sesión del empleado
        */

        localStorage.setItem(
          'token',
          respuesta.token
        );


        localStorage.setItem(
          'usuario',
          JSON.stringify(respuesta.usuario)
        );


        /*
          Mandamos al perfil empleado
        */

        this.router.navigate([
          '/empleado-dashboard'
        ]);

      },


      error: (error) => {

        this.cargando = false;


        this.mensaje =
          error.error?.mensaje ||
          'Correo o contraseña incorrectos.';

      }

    });

  }



  crearPassword() {

    this.router.navigate([
      '/crear-password'
    ]);

  }

}