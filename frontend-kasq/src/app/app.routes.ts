import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { RegistroComponent } from './registro/registro.component';
import { RegistrarEmpleadoComponent } from './registrar-empleado/registrar-empleado.component';
import { RegistrarHoraExtraComponent } from './registrar-hora-extra/registrar-hora-extra.component';
import { EmpleadosComponent } from './empleados/empleados.component';
import { NominaComponent } from './nomina/nomina.component';
import { RegistroLaboralComponent } from './registro-laboral/registro-laboral.component';
import { HorariosComponent } from './horarios/horarios.component';
import{PagosComponent} from './pagos/pagos.component';
import { EmpleadoLoginComponent } from './empleado-login/empleado-login.component';
import {EmpleadoDashboardComponent} from './empleado-dashboard/empleado-dashboard.component';
import { CrearPasswordComponent } from './crear-password/crear-password.component';

import { cookieConsentGuard } from './guards/cookie-consent.guard';



export const routes: Routes = [
  {
    path: '',
    component: LoginComponent
  },

  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [cookieConsentGuard]
  },

  {
    path: 'registro',
    component: RegistroComponent,
    canActivate: [cookieConsentGuard]
  },

  {
    path: 'registrar-empleado',
    component: RegistrarEmpleadoComponent,
    canActivate: [cookieConsentGuard]
  },

  {
    path: 'registrar-hora-extra',
    component: RegistrarHoraExtraComponent,
    canActivate: [cookieConsentGuard]
  },

  {
    path: 'empleados',
    component: EmpleadosComponent,
    canActivate: [cookieConsentGuard]
  },

  {
    path: 'nomina',
    component: NominaComponent,
    canActivate: [cookieConsentGuard]
  },

  {
    path: 'registro-laboral',
    component: RegistroLaboralComponent,
    canActivate: [cookieConsentGuard]
  },
  {
    path: 'horarios',
    component: HorariosComponent,
    canActivate: [cookieConsentGuard]
  },
  {
    path: 'pagos',
    component: PagosComponent,
    canActivate: [cookieConsentGuard]
  },
  {
    path: 'empleado-login',
    component: EmpleadoLoginComponent
  },
  {
    path: 'empleado-dashboard',
    component: EmpleadoDashboardComponent,
    canActivate: [cookieConsentGuard]
  },
  {
    path: 'crear-password',
    component: CrearPasswordComponent
  },

  {
    path: '**',
    redirectTo: ''
  }
];