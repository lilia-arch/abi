import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrearPasswordComponent } from './crear-password.component';

describe('CrearPasswordComponent', () => {
  let component: CrearPasswordComponent;
  let fixture: ComponentFixture<CrearPasswordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrearPasswordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CrearPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
