import {
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { CookieService } from 'ngx-cookie-service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  username = '';
  password = '';

  hide = true;
  cargando = false;
  recordarme = false;

  mensaje = '';
  mensajeCookies = '';

  cookiesPermitidas = false;

  constructor(
    private router: Router,
    private cookieService: CookieService
  ) {}

  ngOnInit(): void {
    this.verificarCookies();
    this.cargarUsuarioRecordado();
  }

  verificarCookies(): void {
    const decision = this.cookieService.get(
      'kasq_cookie_consent'
    );

    this.cookiesPermitidas =
      decision === 'aceptadas';

    if (this.cookiesPermitidas) {
      this.mensajeCookies = '';
    } else {
      this.mensajeCookies =
        'Debes aceptar las cookies para iniciar sesión y navegar.';
    }
  }

  cargarUsuarioRecordado(): void {
    const usuarioGuardado =
      localStorage.getItem('kasq_usuario_recordado');

    if (usuarioGuardado) {
      this.username = usuarioGuardado;
      this.recordarme = true;
    }
  }

  onLogin(): void {
    this.mensaje = '';

    this.verificarCookies();

    if (!this.cookiesPermitidas) {
      this.mensajeCookies =
        'No puedes iniciar sesión hasta aceptar las cookies.';

      localStorage.removeItem('token');
      return;
    }

    const usuarioEscrito =
      this.username.trim();

    const contrasenaEscrita =
      this.password.trim();

    if (!usuarioEscrito || !contrasenaEscrita) {
      this.mensaje =
        'Completa todos los campos.';

      return;
    }

    this.cargando = true;

    setTimeout(() => {
      this.cargando = false;

      if (
        usuarioEscrito === 'teniskaqs' &&
        contrasenaEscrita === 'aksq2126'
      ) {
        localStorage.setItem(
          'token',
          'KASQ-TOKEN'
        );

        if (this.recordarme) {
          localStorage.setItem(
            'kasq_usuario_recordado',
            usuarioEscrito
          );
        } else {
          localStorage.removeItem(
            'kasq_usuario_recordado'
          );
        }

        this.mensaje = '';

        this.router.navigate([
          '/dashboard'
        ]);
      } else {
        localStorage.removeItem('token');

        this.mensaje =
          'Usuario o contraseña incorrectos.';
      }
    }, 800);
  }

  bloquearEnlace(
    event: Event
  ): void {
    event.preventDefault();

    if (!this.cookiesPermitidas) {
      this.mensajeCookies =
        'Debes aceptar las cookies antes de continuar.';
      return;
    }

    this.mensaje =
      'La recuperación de contraseña todavía no está disponible.';
  }
}