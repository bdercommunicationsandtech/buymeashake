import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    }).compileComponents();
  });

  it('debe crear la aplicación', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('debe renderizar la marca en el encabezado', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const header = fixture.nativeElement as HTMLElement;
    expect(header.textContent).toContain('buymeashake');
  });
});
