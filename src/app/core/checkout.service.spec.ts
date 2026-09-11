import { TestBed } from '@angular/core/testing';
import { CheckoutService } from './checkout.service';

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CheckoutService);
  });

  it('inicia cerrado y sin borrador', () => {
    expect(service.open()).toBe(false);
    expect(service.draft()).toBeNull();
    expect(service.total()).toBe(0);
  });

  it('calcula el total del borrador y abre el overlay', () => {
    service.start({ creatorName: 'Sofía Ramírez', creatorHandle: 'sofifit', shakes: 3 });

    expect(service.open()).toBe(true);
    expect(service.paid()).toBe(false);
    expect(service.total()).toBe(9);
  });

  it('acota la cantidad de shakes al rango permitido', () => {
    service.start({ creatorName: 'Sofía Ramírez', creatorHandle: 'sofifit', shakes: 0 });
    expect(service.draft()?.shakes).toBe(1);

    service.start({ creatorName: 'Sofía Ramírez', creatorHandle: 'sofifit', shakes: 500 });
    expect(service.draft()?.shakes).toBe(99);
  });

  it('marca el pago y limpia el estado al cerrar', () => {
    service.start({ creatorName: 'Sofía Ramírez', creatorHandle: 'sofifit', shakes: 1 });
    service.markPaid();
    expect(service.paid()).toBe(true);

    service.close();
    expect(service.open()).toBe(false);
    expect(service.paid()).toBe(false);
  });

  it('actualiza shakes desde supporter_item al confirmar pago Stripe', () => {
    service.beginStripeReturn({
      creatorName: 'Sofía Ramírez',
      creatorHandle: 'sofifit',
      type: 'shake',
    });
    expect(service.draft()?.shakes).toBe(1);

    service.markPaid(
      {
        supporter_name: 'Ana',
        shake_details: { shakes_count: 5, supporter_message: 'Vamos!' },
      },
      null,
      'Gracias!',
    );

    expect(service.paid()).toBe(true);
    expect(service.draft()?.shakes).toBe(5);
    expect(service.thankYouMessage()).toBe('Gracias!');
  });
});
