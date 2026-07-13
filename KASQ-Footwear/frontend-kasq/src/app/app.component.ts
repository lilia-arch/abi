import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { CookieSettingsComponent } from './cookie-settings/cookie-settings.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CookieSettingsComponent
  ],
  templateUrl: './app.component.html'
})
export class AppComponent {}