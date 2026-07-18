import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EmpleadoService {

  private api = 'http://localhost:3000';

  constructor(
    private http: HttpClient
  ) {}

  private headers() {

    const token =
      localStorage.getItem('token');

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  // CREAR CONTRASEÑA
  crearPassword(datos: {
    correo: string;
    contrasena: string;
  }): Observable<any> {

    return this.http.post(
      `${this.api}/api/empleados/crear-password`,
      datos
    );
  }

  // LOGIN DEL EMPLEADO
  login(datos: {
    correo: string;
    contrasena: string;
  }): Observable<any> {

    return this.http.post(
      `${this.api}/api/empleados/login`,
      datos
    );
  }

  // PERFIL DEL EMPLEADO
  obtenerPerfil(): Observable<any> {

    return this.http.get(
      `${this.api}/api/empleados/perfil`,
      this.headers()
    );
  }

  // PAGOS DEL EMPLEADO
  obtenerPagos(): Observable<any> {

    return this.http.get(
      `${this.api}/empleado/pagos`,
      this.headers()
    );
  }

  // HORAS EXTRAS DEL EMPLEADO
  obtenerHorasExtras(): Observable<any> {

    return this.http.get(
      `${this.api}/empleado/horas-extras`,
      this.headers()
    );
  }
}