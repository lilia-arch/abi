import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  username = '';
  password = '';

  constructor(private router: Router) {}

  onLogin() {
    // Hemos actualizado las credenciales aquí para que coincidan con las tuyas
    if (this.username === 'teniskaqs' && this.password === 'aksq2126') {
      console.log('Acceso concedido');
      this.router.navigate(['/dashboard']); 
    } else {
      alert('Usuario o contraseña incorrectos');
    }
  }
}