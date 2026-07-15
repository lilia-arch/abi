import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cookie-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './cookie-settings.component.html',
  styleUrls: ['./cookie-settings.component.css']
})
export class CookieSettingsComponent implements OnInit {

  mostrarPanel = false;

  decision:
    'aceptadas' |
    'rechazadas' |
    'pendiente' = 'pendiente';

  cookies = {
    necesarias: true,
    preferencias: false,
    estadisticas: false,
    marketing: false
  };

  constructor(
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargarConfiguracion();

    if (this.decision === 'pendiente') {
      this.mostrarPanel = true;
    }
  }

  abrirPanel(): void {
    this.cargarConfiguracion();
    this.mostrarPanel = true;
  }

  cerrarPanel(): void {
    if (this.decision !== 'pendiente') {
      this.mostrarPanel = false;
    }
  }

  aceptarTodas(): void {

    this.cookies = {
      necesarias: true,
      preferencias: true,
      estadisticas: true,
      marketing: true
    };

    this.guardarConsentimiento();
  }

  guardarConfiguracion(): void {

    this.cookies.necesarias = true;

    this.guardarConsentimiento();
  }

  rechazarCookies(): void {

    this.cookies = {
      necesarias: true,
      preferencias: false,
      estadisticas: false,
      marketing: false
    };

    this.decision = 'rechazadas';

    this.guardarCookieConsentimiento(
      'rechazadas'
    );

    localStorage.setItem(
      'kasq_cookie_preferences',
      JSON.stringify(this.cookies)
    );

    /*
      Eliminamos cualquier sesión existente.
    */

    localStorage.removeItem('token');

    /*
      Eliminamos rutas pendientes.
    */

    sessionStorage.removeItem(
      'kasq_return_url'
    );

    this.mostrarPanel = false;

    /*
      Siempre permanece en login.
    */

    this.router.navigate(['/login']);
  }

  private guardarConsentimiento(): void {

    this.decision = 'aceptadas';

    this.guardarCookieConsentimiento(
      'aceptadas'
    );

    localStorage.setItem(
      'kasq_cookie_preferences',
      JSON.stringify(this.cookies)
    );

    /*
      Muy importante:
      eliminamos la ruta pendiente.
    */

    sessionStorage.removeItem(
      'kasq_return_url'
    );

    this.mostrarPanel = false;

    /*
      Aceptar cookies NO inicia sesión.

      Siempre manda al login.
    */

    this.router.navigate(['/login']);
  }

  private guardarCookieConsentimiento(
    decision:
      'aceptadas' |
      'rechazadas'
  ): void {

    const unAnio =
      60 * 60 * 24 * 365;

    document.cookie =
      `kasq_cookie_consent=${decision};` +
      `path=/;` +
      `max-age=${unAnio};` +
      `SameSite=Lax`;
  }

  private cargarConfiguracion(): void {

    const consentimiento =
      this.leerCookie(
        'kasq_cookie_consent'
      );

    if (
      consentimiento === 'aceptadas'
    ) {

      this.decision = 'aceptadas';

    } else if (
      consentimiento === 'rechazadas'
    ) {

      this.decision = 'rechazadas';

    } else {

      this.decision = 'pendiente';

    }

    const preferenciasGuardadas =
      localStorage.getItem(
        'kasq_cookie_preferences'
      );

    if (preferenciasGuardadas) {

      try {

        const preferencias =
          JSON.parse(
            preferenciasGuardadas
          );

        this.cookies = {
          necesarias: true,

          preferencias:
            preferencias.preferencias
              === true,

          estadisticas:
            preferencias.estadisticas
              === true,

          marketing:
            preferencias.marketing
              === true
        };

      } catch (error) {

        console.error(
          'Error leyendo preferencias:',
          error
        );

      }
    }
  }

  private leerCookie(
    nombre: string
  ): string | null {

    const cookies =
      document.cookie.split(';');

    const cookieEncontrada =
      cookies.find(
        (cookie) =>
          cookie
            .trim()
            .startsWith(
              `${nombre}=`
            )
      );

    if (!cookieEncontrada) {
      return null;
    }

    return decodeURIComponent(
      cookieEncontrada
        .trim()
        .substring(
          nombre.length + 1
        )
    );
  }
}