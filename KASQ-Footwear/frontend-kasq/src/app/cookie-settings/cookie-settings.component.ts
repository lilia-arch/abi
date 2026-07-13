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

  decision: 'aceptadas' | 'rechazadas' | 'pendiente' = 'pendiente';

  cookies = {
    necesarias: true,
    preferencias: false,
    estadisticas: false,
    marketing: false
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.cargarConfiguracion();

    // Muestra automáticamente la ventana si no hay decisión.
    if (this.decision === 'pendiente') {
      this.mostrarPanel = true;
    }
  }

  abrirPanel(): void {
    this.cargarConfiguracion();
    this.mostrarPanel = true;
  }

  cerrarPanel(): void {
    // Solo se puede cerrar si ya aceptó o rechazó.
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

    this.guardarConsentimiento('aceptadas');
  }

  guardarConfiguracion(): void {
    /*
      Las cookies necesarias siempre permanecen activas.
      Al guardar la configuración se considera que el usuario
      aceptó el funcionamiento básico de la aplicación.
    */
    this.cookies.necesarias = true;

    this.guardarConsentimiento('aceptadas');
  }

  rechazarCookies(): void {
    this.cookies = {
      necesarias: true,
      preferencias: false,
      estadisticas: false,
      marketing: false
    };

    this.decision = 'rechazadas';

    this.guardarCookieConsentimiento('rechazadas');

    localStorage.setItem(
      'kasq_cookie_preferences',
      JSON.stringify(this.cookies)
    );

    this.mostrarPanel = false;

    // Al rechazar, no permite navegar dentro del sistema.
    this.router.navigate(['/login']);
  }

  private guardarConsentimiento(
    decision: 'aceptadas'
  ): void {
    this.decision = decision;

    this.guardarCookieConsentimiento(decision);

    localStorage.setItem(
      'kasq_cookie_preferences',
      JSON.stringify(this.cookies)
    );

    this.mostrarPanel = false;

    const rutaPendiente = sessionStorage.getItem(
      'kasq_return_url'
    );

    if (rutaPendiente) {
      sessionStorage.removeItem('kasq_return_url');
      this.router.navigateByUrl(rutaPendiente);
      return;
    }

    this.router.navigate(['/dashboard']);
  }

  private guardarCookieConsentimiento(
    decision: 'aceptadas' | 'rechazadas'
  ): void {
    const unAnio = 60 * 60 * 24 * 365;

    document.cookie =
      `kasq_cookie_consent=${decision};` +
      `path=/;` +
      `max-age=${unAnio};` +
      `SameSite=Lax`;
  }

  private cargarConfiguracion(): void {
    const consentimiento = this.leerCookie(
      'kasq_cookie_consent'
    );

    if (consentimiento === 'aceptadas') {
      this.decision = 'aceptadas';
    } else if (consentimiento === 'rechazadas') {
      this.decision = 'rechazadas';
    } else {
      this.decision = 'pendiente';
    }

    const preferenciasGuardadas = localStorage.getItem(
      'kasq_cookie_preferences'
    );

    if (preferenciasGuardadas) {
      try {
        const preferencias = JSON.parse(
          preferenciasGuardadas
        );

        this.cookies = {
          necesarias: true,
          preferencias:
            preferencias.preferencias === true,
          estadisticas:
            preferencias.estadisticas === true,
          marketing:
            preferencias.marketing === true
        };
      } catch (error) {
        console.error(
          'No se pudieron leer las preferencias:',
          error
        );
      }
    }
  }

  private leerCookie(nombre: string): string | null {
    const cookies = document.cookie.split(';');

    const cookieEncontrada = cookies.find((cookie) =>
      cookie.trim().startsWith(`${nombre}=`)
    );

    if (!cookieEncontrada) {
      return null;
    }

    return decodeURIComponent(
      cookieEncontrada.trim().substring(nombre.length + 1)
    );
  }
}