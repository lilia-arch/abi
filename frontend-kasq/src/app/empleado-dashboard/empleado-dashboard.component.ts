import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmpleadoService } from '../services/empleado.service';


@Component({
  selector: 'app-empleado-dashboard',
  standalone:true,
  imports:[
    CommonModule
  ],
  templateUrl:
  './empleado-dashboard.component.html',
  styleUrls:[
    './empleado-dashboard.component.css'
  ]
})
export class EmpleadoDashboardComponent implements OnInit {


  perfil:any = {};

  pagos:any[] = [];

  horas:any[] = [];


  constructor(
    private empleadoService:EmpleadoService
  ){}



  ngOnInit(){


    this.empleadoService.obtenerPerfil()
    .subscribe({

      next:(data:any)=>{

        this.perfil=data;

      }

    });



    this.empleadoService.obtenerPagos()
    .subscribe({

      next:(data:any)=>{

        this.pagos=data;

      }

    });



    this.empleadoService.obtenerHorasExtras()
    .subscribe({

      next:(data:any)=>{

        this.horas=data;

      }

    });


  }



}