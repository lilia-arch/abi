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

import {
  CookieSettingsComponent
} from '../cookie-settings/cookie-settings.component';

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
    MatCheckboxModule,
    CookieSettingsComponent
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  username = '';
  password = '';

  hide = true;
  cargando = false;

  mensaje = '';
  mensajeCookies = '';

  cookiesPermitidas = false;

  constructor(
    private router: Router,
    private cookieService: CookieService
  ) {}

  ngOnInit(): void {
    this.verificarCookies();
  }

  verificarCookies(): void {

    this.cookiesPermitidas =
      this.cookieService.get('cookiesAceptadas') === 'true';

    if (this.cookiesPermitidas) {

      this.mensajeCookies = '';

    } else {

      this.mensajeCookies =
        'Debes aceptar las cookies para iniciar sesión y navegar.';

    }
  }

  actualizarConsentimiento(
    aceptadas: boolean
  ): void {

    this.cookiesPermitidas = aceptadas;

    if (aceptadas) {

      this.mensajeCookies = '';
      this.mensaje = '';

    } else {

      this.mensajeCookies =
        'Las cookies fueron rechazadas. El inicio de sesión está bloqueado.';

      this.username = '';
      this.password = '';

      localStorage.removeItem('token');

    }
  }

  bloquearEnlace(
    event: Event
  ): void {

    if (!this.cookiesPermitidas) {
      event.preventDefault();
    }
  }

  onLogin(): void {

    this.mensaje = '';

    if (!this.cookiesPermitidas) {

      this.mensajeCookies =
        'No puedes iniciar sesión hasta aceptar las cookies.';

      return;
    }

    if (
      !this.username.trim() ||
      !this.password.trim()
    ) {

      this.mensaje =
        'Complete todos los campos';

      return;
    }

    this.cargando = true;

    setTimeout(() => {

      this.cargando = false;

      if (
        this.username === 'teniskaqs' &&
        this.password === 'aksq2126'
      ) {

        localStorage.setItem(
          'token',
          'KASQ-TOKEN'
        );

        this.router.navigate([
          '/dashboard'
        ]);

      } else {

        this.mensaje =
          'Usuario o contraseña incorrectos';

      }

    }, 800);
  }
}