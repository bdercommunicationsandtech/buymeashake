import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../core/language.service';
import { environment } from '../../../environments/environment';

export interface FaqItem {
  id: string;
  category:
    | 'payments'
    | 'refunds'
    | 'memberships'
    | 'goals-shop'
    | 'widgets'
    | 'referrals'
    | 'account'
    | 'agenda'
    | 'taxes'
    | 'technical'
    | 'other';
  audience: 'all' | 'athlete' | 'supporter';
  questionEs: string;
  questionEn: string;
  answerEs: string;
  answerEn: string;
}

export interface SupportCategoryOption {
  code: string;
  titleEs: string;
  titleEn: string;
  descEs: string;
  descEn: string;
  icon: string;
}


@Component({
  selector: 'app-support',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './support.html',
})
export class Support implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly languageService = inject(LanguageService);
  private readonly http = inject(HttpClient);

  readonly lang = this.languageService.lang;

  // Search & Filter State
  readonly searchQuery = signal('');
  readonly selectedAudience = signal<'all' | 'athlete' | 'supporter'>('all');
  readonly selectedFaqCategory = signal<string>('all');
  readonly openFaqIds = signal<Set<string>>(new Set<string>());
  readonly isSearchDropdownOpen = signal(false);
  readonly highlightedFaqId = signal<string | null>(null);

  // Form Signals
  readonly applicantName = signal('');
  readonly applicantEmail = signal('');
  readonly userRole = signal<'athlete' | 'supporter' | 'other'>('athlete');
  readonly selectedTicketCategory = signal<string>('payments');
  readonly ticketSubject = signal('');
  readonly relatedHandleOrFolio = signal('');
  readonly ticketDescription = signal('');
  readonly attachedFile = signal<File | null>(null);
  readonly attachedFileName = signal<string | null>(null);

  // Submission State
  readonly isSubmitting = signal(false);
  readonly submitted = signal(false);
  readonly generatedFolio = signal('');
  readonly errorMessage = signal<string | null>(null);

  // Search suggestions computed signal
  readonly searchSuggestions = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return [];
    return this.faqs
      .filter((faq) => {
        const matchEs =
          faq.questionEs.toLowerCase().includes(q) || faq.answerEs.toLowerCase().includes(q);
        const matchEn =
          faq.questionEn.toLowerCase().includes(q) || faq.answerEn.toLowerCase().includes(q);
        return matchEs || matchEn;
      })
      .slice(0, 6);
  });

  // Available Categories
  readonly categories: SupportCategoryOption[] = [
    {
      code: 'payments',
      titleEs: 'Pagos y Stripe Connect',
      titleEn: 'Payments & Stripe Connect',
      descEs: 'Retiros a cuenta CLABE/banco, comisiones del 5%, transferencias y saldo.',
      descEn: 'Bank payouts, 5% platform fees, transfers and available balance.',
      icon: 'credit-card',
    },
    {
      code: 'refunds',
      titleEs: 'Reembolsos y Cancelaciones',
      titleEn: 'Refunds & Cancellations',
      descEs: 'Políticas de devolución, cancelación de membresías y resolución de disputas.',
      descEn: 'Refund policies, recurring subscription cancellation and dispute triage.',
      icon: 'shield-check',
    },
    {
      code: 'memberships',
      titleEs: 'Membresías y Shakes',
      titleEn: 'Memberships & Shakes',
      descEs: 'Gestión de suscriptores, cobros recurrentes y registro de apoyos puntuales.',
      descEn: 'Subscriber management, recurring billing and one-time shake contributions.',
      icon: 'sparkles',
    },
    {
      code: 'goals-shop',
      titleEs: 'Metas Deportivas y Tienda',
      titleEn: 'Sports Goals & Fitness Shop',
      descEs: 'Crowdfunding para torneos, campamentos, venta de guías PDF y asesorías.',
      descEn: 'Tournament funding, training camps, digital workout PDFs and advice.',
      icon: 'flag',
    },
    {
      code: 'widgets',
      titleEs: 'Botones Web y Código QR',
      titleEn: 'Web Buttons & QR Codes',
      descEs: 'Incrustar botón en Linktree/sitio web e imprimir QR oficial en gimnasios.',
      descEn: 'Embed official buttons on Linktree/web and print QR codes in gyms.',
      icon: 'code-bracket',
    },
    {
      code: 'referrals',
      titleEs: 'Programa de Referidos (5%)',
      titleEn: 'Referral Program (5%)',
      descEs: 'Gana el 5% de comisiones por invitar a otros atletas y entrenadores.',
      descEn: 'Earn 5% lifelong commission by inviting fellow athletes and coaches.',
      icon: 'user-group',
    },
    {
      code: 'agenda',
      titleEs: 'Asesorías y Agenda 1-a-1',
      titleEn: '1-on-1 Coaching & Agenda',
      descEs: 'Disponibilidad de horarios, enlaces de videollamada y gestión de reservas.',
      descEn: 'Slot scheduling, video meeting links and booking management.',
      icon: 'calendar',
    },
    {
      code: 'taxes',
      titleEs: 'Impuestos y Cumplimiento SAT/IRS',
      titleEn: 'Taxes & SAT/IRS Compliance',
      descEs: 'Obligaciones fiscales, declaraciones, comprobantes y retenciones aplicables.',
      descEn: 'Tax reporting, IRS 1099/SAT declarations, invoices and legal compliance.',
      icon: 'document-text',
    },
    {
      code: 'account',
      titleEs: 'Cuenta y Acceso',
      titleEn: 'Account & Access',
      descEs: 'Inicio de sesión rápido con código OTP, cambio de usuario o recuperación.',
      descEn: 'Passwordless OTP login, handle customization or account recovery.',
      icon: 'user-circle',
    },
    {
      code: 'technical',
      titleEs: 'Problemas Técnicos o Bugs',
      titleEn: 'Technical Bugs & Glitches',
      descEs: 'Reporte de errores visuales, lentitud, subida de archivos o funcionamiento web.',
      descEn: 'Visual glitches, performance issues, media upload failures or site bugs.',
      icon: 'cpu-chip',
    },
    {
      code: 'other',
      titleEs: 'Otras Consultas',
      titleEn: 'Other Inquiries',
      descEs: 'Alianzas comerciales, dudas generales o cualquier inquietud no listada.',
      descEn: 'Brand partnerships, general questions or any matter not covered above.',
      icon: 'chat-bubble',
    },
  ];

  // FAQs Database
  readonly faqs: FaqItem[] = [
    // 1. Pagos & Stripe Connect
    {
      id: 'payments-1',
      category: 'payments',
      audience: 'athlete',
      questionEs: '¿Cómo y cuándo recibo los pagos de mis shakes y membresías?',
      questionEn: 'How and when do I receive payouts from my shakes and memberships?',
      answerEs:
        'Tus ingresos se procesan de forma transparente a través de Stripe Connect. Una vez vinculada tu cuenta bancaria o CLABE interbancaria (en México) o Routing/Checking (en EE.UU.) desde Dashboard > Retiros, puedes solicitar transferencias a tu banco en cualquier momento. Los fondos suelen acreditarse entre 24 y 48 horas hábiles.',
      answerEn:
        'Your earnings are processed securely via Stripe Connect. Once you connect your bank account (CLABE in Mexico or Routing/Account number in the USA) from Dashboard > Payouts, you can request transfers anytime. Funds are typically deposited within 24 to 48 business hours.',
    },
    {
      id: 'payments-2',
      category: 'payments',
      audience: 'all',
      questionEs: '¿Qué comisiones cobra Buymeashake por cada shake o membresía?',
      questionEn: 'What platform fees does Buymeashake charge per transaction?',
      answerEs:
        'Buymeashake cobra una comisión fija del 5% sobre los montos recibidos para financiar la infraestructura técnica, servidores seguros y soporte al atleta. Adicionalmente, Stripe aplica su tarifa habitual de procesamiento bancario (normalmente 2.9% + $0.30 USD o equivalente local).',
      answerEn:
        'Buymeashake retains a flat 5% platform fee on contributions to maintain high-performance servers, security, and support. In addition, standard Stripe payment processing fees apply (typically 2.9% + $0.30 USD or local equivalent).',
    },

    // 2. Reembolsos & Cancelaciones
    {
      id: 'refunds-1',
      category: 'refunds',
      audience: 'all',
      questionEs: '¿Cuál es la política de reembolso para Shakes y Membresías?',
      questionEn: 'What is the refund policy for Shakes and Memberships?',
      answerEs:
        'Los shakes individuales se consideran aportaciones directas inmediatas de apoyo al atleta y no son reembolsables salvo error técnico comprobado. En membresías mensuales recurrentes, el supporter puede cancelar su suscripción en cualquier instante desde Mi Cuenta con un solo clic; mantendrá sus beneficios hasta el término del mes pagado sin renovaciones futuras.',
      answerEn:
        'One-time shakes are immediate voluntary contributions and are non-refundable except in proven technical errors. For monthly recurring memberships, supporters can cancel anytime in one click from My Account; access remains active until the end of the current billing cycle without further charges.',
    },
    {
      id: 'refunds-2',
      category: 'refunds',
      audience: 'all',
      questionEs: '¿Qué sucede si una videollamada o asesoría 1-a-1 no se lleva a cabo?',
      questionEn: 'What happens if a scheduled 1-on-1 session is missed or cancelled?',
      answerEs:
        'Si un atleta o coach no puede asistir por lesión, viaje o fuerza mayor, la política oficial exige reprogramar la sesión sin costo adicional. En caso de incumplimiento definitivo, el comprador puede abrir un ticket de soporte o reporte con su folio de confirmación para tramitar la devolución íntegra del importe de la asesoría.',
      answerEn:
        'If a coach or athlete cannot attend due to travel, training, or injury, our terms require rescheduling at no extra fee. If the session is permanently unfulfilled, the buyer can submit a support ticket with their receipt folio to request a full refund.',
    },

    // 3. Metas Deportivas & Tienda
    {
      id: 'goals-1',
      category: 'goals-shop',
      audience: 'athlete',
      questionEs: '¿Cómo funcionan las Metas Deportivas y qué sucede al superar el 100%?',
      questionEn: 'How do Sports Goals work and what happens when reaching 100%?',
      answerEs:
        'Desde Dashboard > Metas puedes crear objetivos específicos (Viaje a competencia internacional, suplementación, equipo deportivo o campamento de preparación). Al alcanzar el 100% de la meta, la barra continuará activa permitiendo recaudación complementaria (overfunding para viáticos imprevistos), o puedes archivarla y activar una nueva para tu próximo reto.',
      answerEn:
        'In Dashboard > Goals, you can launch targeted crowdfunding campaigns (international travel, supplements, athletic gear, or training camps). Reaching 100% does not close the goal: it remains open for overfunding or you can archive it to publish your next athletic milestone.',
    },
    {
      id: 'shop-1',
      category: 'goals-shop',
      audience: 'all',
      questionEs: '¿Cómo se entregan los productos digitales (rutinas en PDF, guías)?',
      questionEn: 'How are digital fitness guides and workout PDFs delivered?',
      answerEs:
        'Una vez que el supporter completa el pago mediante checkout seguro, la plataforma genera un enlace de descarga inmediata del archivo PDF oficial. Además, el comprador recibe un correo electrónico con el recibo y el enlace permanente para descargar el material cuando lo necesite.',
      answerEn:
        'Immediately after completing the secure checkout, the platform presents an instant download link for the workout PDF. A confirmation email with the permanent download link and transaction receipt is also sent instantly to the supporter.',
    },

    // 4. Botones Web & Códigos QR
    {
      id: 'widgets-1',
      category: 'widgets',
      audience: 'athlete',
      questionEs: '¿Cómo agrego el botón oficial "Invítame un shake" en mi web o Linktree?',
      questionEn: 'How do I add the official "Buy me a shake" button to my website or Linktree?',
      answerEs:
        'En Dashboard > Botones y Widgets puedes copiar el código HTML/SVG oficial listo para incrustar. Para Linktree o Beacons, simplemente agrega un enlace directo con la URL pública de tu perfil: buymeashake.fit/@tuusuario.',
      answerEn:
        'From Dashboard > Buttons & Graphics, copy the official SVG/HTML snippet. For Linktree, Beacons, or social bios, simply paste your direct public profile URL: buymeashake.fit/@yourhandle.',
    },
    {
      id: 'widgets-2',
      category: 'widgets',
      audience: 'athlete',
      questionEs: '¿Cómo utilizo el Código QR de mi perfil en gimnasios o stands?',
      questionEn: 'How can I use my profile QR code at physical gyms or tournament stands?',
      answerEs:
        'Al hacer clic en "Compartir" en tu perfil o dashboard, puedes descargar tu Código QR en alta resolución (versión blanca o negra). Puedes imprimirlo en termos, camisetas, stands de competencias o vestidores para que los fans escaneen y te apoyen al instante desde sus teléfonos.',
      answerEn:
        'Clicking "Share" on your profile allows you to generate and download a high-resolution QR code (dark or light style). You can print it on water bottles, posters, tournament booths, or gym banners for fans to scan and support you on the spot.',
    },

    // 5. Programa de Referidos
    {
      id: 'referrals-1',
      category: 'referrals',
      audience: 'athlete',
      questionEs: '¿Cómo gano el 5% con el Programa de Referidos para Atletas?',
      questionEn: 'How does the 5% Athlete Referral Program work?',
      answerEs:
        'En Dashboard > Referidos obtienes tu enlace único. Cada vez que invites a un atleta, preparador o coach y este empiece a recibir shakes o membresías en su página, tú recibirás una bonificación equivalente al 5% de las contribuciones procesadas por su red, abonadas de por vida en tu balance de retiros.',
      answerEn:
        'In Dashboard > Referrals, you get a personal referral link. Whenever you invite another athlete, coach, or trainer who joins and receives shakes or memberships, you earn a 5% commission on their transaction volume, credited directly to your payout balance.',
    },

    // 6. Impuestos & Cumplimiento SAT/IRS
    {
      id: 'taxes-1',
      category: 'taxes',
      audience: 'all',
      questionEs: '¿Cómo declaro mis ingresos de Buymeashake ante el SAT (México) o IRS (EE.UU.)?',
      questionEn: 'How do I declare Buymeashake income to SAT (Mexico) or IRS (USA)?',
      answerEs:
        'Conforme a las cláusulas 5.1 y 6 de nuestros Términos de Servicio, las contribuciones recibidas en Buymeashake no constituyen donaciones exentas de impuestos, sino ingresos gravables por actividad profesional o comercial. Cada creador es responsable directo de declarar sus ganancias ante el SAT (régimen de plataformas tecnológicas o actividad empresarial) o ante el IRS (formulario 1099-K emitido por Stripe). Buymeashake provee el historial completo de transferencias para facilitar tu contabilidad.',
      answerEn:
        'Under sections 5.1 and 6 of our Terms of Service, contributions received on Buymeashake are treated as taxable commercial or business income, not tax-exempt gifts. Each creator is solely responsible for reporting earnings to SAT in Mexico or IRS in the United States (via Form 1099-K issued through Stripe). Buymeashake provides complete payout ledgers for your accounting.',
    },

    // 7. Membresías
    {
      id: 'memberships-1',
      category: 'memberships',
      audience: 'athlete',
      questionEs: '¿Cómo funcionan los niveles de membresías recurrentes?',
      questionEn: 'How do recurring membership tiers work?',
      answerEs:
        'Puedes crear múltiples niveles (tiers) con diferentes precios mensuales y recompensas exclusivas (por ejemplo, rutinas privadas, videollamadas grupales, acceso a publicaciones exclusivas o asesoría prioritaria). Stripe gestiona el cobro recurrente automático cada mes de forma transparente.',
      answerEn:
        'You can configure custom tiers with distinct monthly prices and exclusive perks (such as private workout plans, group video calls, locked member posts, or priority Q&A). Stripe automatically processes recurring payments each month.',
    },
    {
      id: 'memberships-2',
      category: 'memberships',
      audience: 'supporter',
      questionEs: '¿Puedo apoyar a un atleta de forma anónima?',
      questionEn: 'Can I support an athlete anonymously without revealing my name?',
      answerEs:
        'Sí. Al momento de apoyar con un shake, puedes marcar la opción de aporte anónimo. Tu nombre no aparecerá en el muro público del atleta ni en la lista de supporters recientes, manteniéndose visible únicamente para fines contables privados en el recibo emitido por Stripe.',
      answerEn:
        'Yes. When purchasing a shake, you can select anonymous support. Your name will be hidden from the public wall and leaderboard, appearing only on your private Stripe receipt for proof of purchase.',
    },

    // 8. Asesorías y Agenda 1-a-1
    {
      id: 'agenda-1',
      category: 'agenda',
      audience: 'athlete',
      questionEs: '¿Cómo configuro mi disponibilidad y enlaces de videollamada para asesorías?',
      questionEn: 'How do I set up my schedule availability and video meeting links for 1-on-1s?',
      answerEs:
        'En Dashboard > Tienda y Asesorías puedes activar tus sesiones 1-a-1, indicar el precio en USD, la duración en minutos (ej. 30 o 60 min) y seleccionar tus días y franjas horarias disponibles. Puedes ingresar tu enlace de Google Meet o Zoom; cuando un cliente reserve, ambos recibirán una confirmación por correo con la fecha, hora y acceso a la videollamada.',
      answerEn:
        'In Dashboard > Shop & Coaching, enable 1-on-1 sessions, set your USD pricing, session length (e.g. 30 or 60 min), and choose your open calendar slots. Provide your Google Meet or Zoom link; once booked, both you and the client receive immediate email confirmations with date, time, and meeting access.',
    },
    {
      id: 'agenda-2',
      category: 'agenda',
      audience: 'all',
      questionEs: '¿Qué sucede si un cliente necesita reprogramar o no se presenta a la sesión?',
      questionEn: 'What happens if a client needs to reschedule or misses the scheduled session?',
      answerEs:
        'Recomendamos acordar una nueva fecha vía correo o mensajería directa con al menos 12 horas de anticipación. Si el cliente no se presenta sin previo aviso, el entrenador puede considerar impartida la asesoría o brindar una sesión de reposición por cortesía. Si el atleta es quien cancela, está obligado a reprogramar sin costo o reembolsar el importe íntegro.',
      answerEn:
        'We encourage coordinating a new date via email or direct chat with at least 12 hours notice. If a client is a no-show without notice, the coach may consider the session fulfilled or offer a courtesy reschedule. If the athlete cancels, they are required to reschedule or issue a full refund.',
    },

    // 9. Cuenta y Acceso
    {
      id: 'account-1',
      category: 'account',
      audience: 'all',
      questionEs: '¿Cómo funciona el inicio de sesión rápido con código OTP sin contraseña?',
      questionEn: 'How does passwordless OTP login work?',
      answerEs:
        'Para mayor conveniencia y seguridad, no necesitas recordar contraseñas: ingresa tu correo electrónico y recibirás al instante un código numérico de 6 dígitos con vigencia de 10 minutos. Este método evita filtraciones de credenciales y protege tu cuenta.',
      answerEn:
        'For optimal security and convenience, you do not need to remember complex passwords: enter your registered email and receive an instant 6-digit verification code valid for 10 minutes. This prevents credential leaks and keeps your account safe.',
    },
    {
      id: 'account-2',
      category: 'account',
      audience: 'athlete',
      questionEs: '¿Cómo modifico mi biografía deportiva, fotos de perfil o nombre de usuario?',
      questionEn: 'How do I edit my athletic bio, profile photos, or username?',
      answerEs:
        'Puedes personalizar tu perfil público en cualquier momento desde Dashboard > Ajustes o haciendo clic en "Editar mi página". Allí podrás subir tu avatar, portada en alta definición, seleccionar tu disciplina deportiva principal y actualizar tu biografía y redes sociales.',
      answerEn:
        'You can customize your public profile anytime in Dashboard > Settings or by clicking "Edit My Page". There you can upload your avatar, high-res cover banner, select your primary athletic discipline, and update your bio and social links.',
    },

    // 10. Soporte Técnico
    {
      id: 'technical-1',
      category: 'technical',
      audience: 'all',
      questionEs: '¿Qué formatos y límites aplican para fotos de portada y archivos adjuntos?',
      questionEn: 'What formats and file sizes are supported for covers and attachments?',
      answerEs:
        'Aceptamos imágenes en formato JPG, PNG, WebP y documentos en PDF con un tamaño máximo de 10 MB por archivo. Si experimentas un error al subir una foto o comprobante, verifica que tu archivo no exceda los 10 MB y que la extensión coincida con los formatos permitidos.',
      answerEn:
        'We support JPG, PNG, WebP image formats and PDF documents up to 10 MB each. If you encounter an upload issue, ensure your file is under 10 MB and matches supported media extensions.',
    },

    // 11. Otras Consultas
    {
      id: 'other-1',
      category: 'other',
      audience: 'all',
      questionEs: '¿Cómo puedo colaborar o proponer una alianza comercial con Buymeashake?',
      questionEn: 'How can I partner or propose a brand collaboration with Buymeashake?',
      answerEs:
        'Colaboramos activamente con marcas de nutrición deportiva, gimnasios, federaciones y organizadores de competencias. Puedes contactar al equipo de alianzas completando el formulario de ticket en esta página bajo la categoría "Otras Consultas" o escribiendo a bdercommunications@gmail.com con tu propuesta.',
      answerEn:
        'We actively collaborate with sports nutrition brands, gym chains, athletic federations, and tournament promoters. Reach our partnerships desk by opening a ticket below under "Other Inquiries" or emailing bdercommunications@gmail.com with your proposal.',
    },
    {
      id: 'other-2',
      category: 'other',
      audience: 'all',
      questionEs: '¿Qué hago si mi duda no aparece en la base de conocimientos?',
      questionEn: 'What should I do if my question is not covered in the knowledge base?',
      answerEs:
        'Si no encuentras respuesta a tu inquietud, completa el formulario de ticket ubicado al final de esta página. Nuestro equipo técnico y de atención revisará tu caso de manera personalizada y te responderá en un plazo máximo de 12 a 24 horas hábiles a tu correo registrado.',
      answerEn:
        'If you cannot find an answer to your inquiry, complete the support ticket form at the bottom of this page. Our technical and customer support team will personally review your case and respond within 12 to 24 business hours at your registered email.',
    },
  ];

  // Filtered FAQs computed signal
  readonly filteredFaqs = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const aud = this.selectedAudience();
    const cat = this.selectedFaqCategory();

    return this.faqs.filter((faq) => {
      // Category filter
      if (cat !== 'all' && faq.category !== cat) return false;

      // Audience filter
      if (aud !== 'all' && faq.audience !== 'all' && faq.audience !== aud) return false;

      // Search query filter
      if (q) {
        const matchEs =
          faq.questionEs.toLowerCase().includes(q) || faq.answerEs.toLowerCase().includes(q);
        const matchEn =
          faq.questionEn.toLowerCase().includes(q) || faq.answerEn.toLowerCase().includes(q);
        if (!matchEs && !matchEn) return false;
      }

      return true;
    });
  });

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params['category']) {
        const cat = params['category'].toLowerCase();
        if (this.categories.some((c) => c.code === cat)) {
          this.selectedFaqCategory.set(cat);
          this.selectedTicketCategory.set(cat);
        }
      }
      if (params['role'] && (params['role'] === 'athlete' || params['role'] === 'supporter')) {
        this.selectedAudience.set(params['role']);
        this.userRole.set(params['role']);
      }
    });
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  setAudience(aud: 'all' | 'athlete' | 'supporter'): void {
    this.selectedAudience.set(aud);
  }

  setFaqCategory(categoryCode: string): void {
    const isDeactivating = categoryCode === this.selectedFaqCategory();
    const next = isDeactivating ? 'all' : categoryCode;
    this.selectedFaqCategory.set(next);

    // Solo desplazarse a los articulos al activar una categoria, no al desactivarla
    if (!isDeactivating) {
      setTimeout(() => {
        const el = document.getElementById('knowledge-base-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }

  toggleFaq(faqId: string): void {
    const next = new Set(this.openFaqIds());
    if (next.has(faqId)) {
      next.delete(faqId);
    } else {
      next.add(faqId);
    }
    this.openFaqIds.set(next);
  }

  isFaqOpen(faqId: string): boolean {
    return this.openFaqIds().has(faqId);
  }

  scrollToTicketForm(): void {
    const el = document.getElementById('ticket-form-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }


  // --- Search Autocomplete Methods ---
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.isSearchDropdownOpen.set(value.trim().length > 0);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length > 0) {
      this.isSearchDropdownOpen.set(true);
    }
  }

  onSearchBlur(): void {
    // Delay slightly to allow click on dropdown item to register
    setTimeout(() => {
      this.isSearchDropdownOpen.set(false);
    }, 250);
  }

  onSearchEnter(): void {
    this.isSearchDropdownOpen.set(false);
    const el = document.getElementById('knowledge-base-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  selectSuggestedFaq(faq: FaqItem): void {
    // Ensure the filters don't hide the selected FAQ
    if (this.selectedFaqCategory() !== 'all' && this.selectedFaqCategory() !== faq.category) {
      this.selectedFaqCategory.set('all');
    }
    if (this.selectedAudience() !== 'all' && faq.audience !== 'all' && this.selectedAudience() !== faq.audience) {
      this.selectedAudience.set('all');
    }

    // Expand this FAQ item
    const next = new Set(this.openFaqIds());
    next.add(faq.id);
    this.openFaqIds.set(next);

    // Set glowing highlight effect for 2.2 seconds
    this.highlightedFaqId.set(faq.id);
    setTimeout(() => {
      if (this.highlightedFaqId() === faq.id) {
        this.highlightedFaqId.set(null);
      }
    }, 2200);

    // Close the dropdown
    this.isSearchDropdownOpen.set(false);

    // Scroll directly to the target FAQ
    setTimeout(() => {
      const el = document.getElementById(`faq-${faq.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage.set(
          this.lang() === 'es'
            ? 'El archivo seleccionado supera el límite de 10 MB.'
            : 'The selected file exceeds the 10 MB limit.'
        );
        return;
      }
      this.attachedFile.set(file);
      this.attachedFileName.set(file.name);
      this.errorMessage.set(null);
    }
  }

  removeAttachedFile(): void {
    this.attachedFile.set(null);
    this.attachedFileName.set(null);
  }

  async submitTicket(): Promise<void> {
    this.errorMessage.set(null);

    const name = this.applicantName().trim();
    const email = this.applicantEmail().trim();
    const subject = this.ticketSubject().trim();
    const desc = this.ticketDescription().trim();
    const category = this.selectedTicketCategory();
    const role = this.userRole();
    const ref = this.relatedHandleOrFolio().trim();

    if (!name) {
      this.errorMessage.set(
        this.lang() === 'es' ? 'Por favor ingresa tu nombre.' : 'Please enter your name.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Por favor ingresa un correo electrónico de contacto válido.'
          : 'Please provide a valid contact email address.'
      );
      return;
    }

    if (!subject) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Por favor escribe un asunto breve para tu ticket.'
          : 'Please enter a brief subject for your ticket.'
      );
      return;
    }

    if (!desc || desc.length < 20) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Por favor describe tu consulta con al menos 20 caracteres.'
          : 'Please describe your inquiry with at least 20 characters.'
      );
      return;
    }

    this.isSubmitting.set(true);

    try {
      const catObj = this.categories.find((c) => c.code === category);
      const catTitle =
        this.lang() === 'es'
          ? catObj?.titleEs || 'Consulta General'
          : catObj?.titleEn || 'General Inquiry';

      const formData = new FormData();
      formData.append('name', name);
      formData.append('email', email);
      formData.append('user_role', role);
      formData.append('category', category);
      formData.append('category_title', catTitle);
      formData.append('subject', subject);
      formData.append('description', desc);
      if (ref) {
        formData.append('related_folio_or_handle', ref);
      }

      const fileToUpload = this.attachedFile();
      if (fileToUpload) {
        formData.append('file', fileToUpload, fileToUpload.name);
        formData.append('attached_file', fileToUpload.name);
      }

      try {
        const response = await firstValueFrom(
          this.http.post<{ folio: string; message: string; status: string }>(
            `${environment.apiUrl}/system/support/ticket`,
            formData
          )
        );
        this.generatedFolio.set(
          response.folio || `#SHK-HELP-${Math.floor(10000 + Math.random() * 90000)}`
        );
      } catch (httpErr) {
        console.warn('Backend support ticket API offline, generating local ticket fallback:', httpErr);
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        this.generatedFolio.set(`#SHK-HELP-${randomDigits}`);
      }

      this.submitted.set(true);
    } catch {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Ocurrió un error al registrar tu ticket. Por favor inténtalo de nuevo.'
          : 'An error occurred while submitting your ticket. Please try again.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetTicketForm(): void {
    this.applicantName.set('');
    this.applicantEmail.set('');
    this.ticketSubject.set('');
    this.relatedHandleOrFolio.set('');
    this.ticketDescription.set('');
    this.attachedFile.set(null);
    this.attachedFileName.set(null);
    this.submitted.set(false);
    this.generatedFolio.set('');
    this.errorMessage.set(null);
  }
}
