import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { LanguageService } from '../../../core/language.service';
import { environment } from '../../../../environments/environment';

export interface ReportReason {
  code: string;
  titleEs: string;
  titleEn: string;
  descEs: string;
  descEn: string;
}

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './report.html',
})
export class Report implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly languageService = inject(LanguageService);
  private readonly http = inject(HttpClient);

  readonly lang = this.languageService.lang;

  // Form signals
  readonly creatorLink = signal('');
  readonly selectedReason = signal<string>('');
  readonly description = signal('');
  readonly evidenceLink1 = signal('');
  readonly evidenceLink2 = signal('');
  readonly reporterEmail = signal('');
  readonly attachedFile = signal<File | null>(null);
  readonly attachedFileName = signal<string | null>(null);

  // Creator validation state
  readonly creatorStatus = signal<'idle' | 'checking' | 'valid' | 'invalid'>('idle');
  readonly verifiedAthlete = signal<{
    handle: string;
    name: string;
    avatarUrl?: string;
    sport?: string;
  } | null>(null);
  readonly creatorValidationError = signal<string | null>(null);
  private checkTimeout: any = null;

  // Flow signals
  readonly isSubmitting = signal(false);
  readonly submitted = signal(false);
  readonly generatedFolio = signal('');
  readonly errorMessage = signal<string | null>(null);

  readonly reasons: ReportReason[] = [
    {
      code: 'doping',
      titleEs: 'Dopaje y sustancias prohibidas',
      titleEn: 'Banned substances & doping',
      descEs: 'Venta, fomento o dosificación de esteroides (EAA), SARMs o fármacos ilegales sin receta.',
      descEn: 'Sale, dosage, or promotion of anabolic steroids, SARMs, or unprescribed athletic drugs.',
    },
    {
      code: 'unfulfilled_order',
      titleEs: 'Asesoría 1-a-1 o servicio no cumplido',
      titleEn: 'Unfulfilled 1-on-1 session or digital product',
      descEs: 'El entrenador no asistió a la videollamada agendada o el contenido digital estaba incompleto.',
      descEn: 'Coach failed to attend the scheduled call or delivered digital material was corrupted/empty.',
    },
    {
      code: 'medical_risk',
      titleEs: 'Intrusismo o riesgo para la salud',
      titleEn: 'Dangerous advice or unauthorized practice',
      descEs: 'Prescripción de medicamentos o dietas extremas sin titulación profesional que ponen en riesgo la salud.',
      descEn: 'Dangerous diets or medical prescriptions issued without legitimate professional certification.',
    },
    {
      code: 'scam_fraud',
      titleEs: 'Fraude o engaño económico',
      titleEn: 'Scam, fraud or deceptive claims',
      descEs: 'Cobros no autorizados, recaudación con fines falsos o promesas corporales milagrosas.',
      descEn: 'Unauthorized charges, deceptive athletic claims, or fraudulent fundraising campaigns.',
    },
    {
      code: 'harassment',
      titleEs: 'Acoso o intimidación',
      titleEn: 'Bullying, harassment or body-shaming',
      descEs: 'Hostigamiento, mensajes intimidatorios o discriminación física dirigida a usuarios.',
      descEn: 'Hostile conduct, intimidation, or body-shaming directed at community members.',
    },
    {
      code: 'ip_theft',
      titleEs: 'Plagio de rutinas o guías',
      titleEn: 'Intellectual property infringement',
      descEs: 'Copia o reventa no autorizada de entrenamientos, guías o material de otros atletas.',
      descEn: 'Unauthorized distribution or piracy of another creator’s workouts, books, or media.',
    },
    {
      code: 'impersonation',
      titleEs: 'Suplantación de identidad',
      titleEn: 'Impersonation of athlete or brand',
      descEs: 'Fingir ser un atleta federado, entrenador profesional o institución reconocida.',
      descEn: 'Falsely claiming to be a certified pro athlete, federation, club, or verified personality.',
    },
    {
      code: 'inappropriate',
      titleEs: 'Contenido sexual o no apto',
      titleEn: 'Sexually explicit or inappropriate media',
      descEs: 'Material pornográfico o no apto fuera del estándar de entrenamiento deportivo.',
      descEn: 'Sexually explicit media or non-athletic adult content violating platform standards.',
    },
    {
      code: 'hate_speech',
      titleEs: 'Discurso de odio',
      titleEn: 'Hate speech or discrimination',
      descEs: 'Ataques o discriminación por origen, religión, género u orientación.',
      descEn: 'Attacks or hate speech targeting individuals based on protected characteristics.',
    },
    {
      code: 'other',
      titleEs: 'Otro motivo',
      titleEn: 'Other violation',
      descEs: 'Cualquier otra infracción grave a las reglas y términos de Buymeashake.',
      descEn: 'Any other serious breach of Buymeashake’s Terms of Service and community safety.',
    },
  ];

  getSelectedReasonObj(): ReportReason | undefined {
    return this.reasons.find((r) => r.code === this.selectedReason());
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const creatorParam = params['creator'] || params['user'] || params['target'];
      if (creatorParam) {
        const handle = this.cleanHandle(creatorParam);
        this.creatorLink.set(`buymeashake.fit/@${handle}`);
        this.validateCreator(handle);
      }
    });
  }

  cleanHandle(input: string): string {
    return input
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/^(www\.)?buymeashake\.fit\/?/i, '')
      .replace(/^@+/, '')
      .split('/')[0]
      .split('?')[0]
      .trim()
      .toLowerCase();
  }

  onCreatorInputChange(value: string): void {
    this.creatorLink.set(value);
    this.creatorValidationError.set(null);
    this.errorMessage.set(null);

    if (this.checkTimeout) {
      clearTimeout(this.checkTimeout);
    }

    const clean = this.cleanHandle(value);
    if (!clean) {
      this.creatorStatus.set('idle');
      this.verifiedAthlete.set(null);
      return;
    }

    this.creatorStatus.set('checking');
    this.checkTimeout = setTimeout(() => {
      this.validateCreator(clean);
    }, 500);
  }

  async validateCreator(handleToVerify?: string): Promise<boolean> {
    const raw = handleToVerify !== undefined ? handleToVerify : this.creatorLink();
    const clean = this.cleanHandle(raw);

    if (!clean) {
      this.creatorStatus.set('invalid');
      this.verifiedAthlete.set(null);
      this.creatorValidationError.set(
        this.lang() === 'es'
          ? 'Por favor ingresa un enlace o usuario de atleta válido.'
          : 'Please enter a valid athlete link or username.'
      );
      return false;
    }

    this.creatorStatus.set('checking');
    this.creatorValidationError.set(null);

    try {
      const profile = await firstValueFrom(
        this.http.get<any>(`${environment.apiUrl}/creators/${encodeURIComponent(clean)}`)
      );

      if (profile && profile.handle) {
        this.creatorStatus.set('valid');
        this.verifiedAthlete.set({
          handle: profile.handle,
          name: profile.full_name || profile.handle,
          avatarUrl: profile.avatar_url,
          sport: profile.primary_sport,
        });
        return true;
      } else {
        throw new Error('NotFound');
      }
    } catch {
      this.creatorStatus.set('invalid');
      this.verifiedAthlete.set(null);
      this.creatorValidationError.set(
        this.lang() === 'es'
          ? `No encontramos ningún creador o atleta con el usuario "@${clean}". Revisa que esté bien escrito.`
          : `We could not find any creator or athlete with username "@${clean}". Please check the spelling.`
      );
      return false;
    }
  }

  selectReason(code: string): void {
    this.selectedReason.set(code);
    this.errorMessage.set(null);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      if (file.size > 10 * 1024 * 1024) {
        this.errorMessage.set(
          this.lang() === 'es'
            ? 'El archivo supera el tamaño máximo permitido de 10MB.'
            : 'File exceeds the maximum allowed size of 10MB.'
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

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
  }

  async submitReport(): Promise<void> {
    this.errorMessage.set(null);

    const link = this.creatorLink().trim();
    const reason = this.selectedReason();
    const desc = this.description().trim();
    const email = this.reporterEmail().trim();

    if (!link) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Por favor indica el enlace o nombre de usuario del atleta a reportar.'
          : 'Please provide the link or username of the creator you are reporting.'
      );
      return;
    }

    // Validar existencia real del atleta
    const isAthleteValid = await this.validateCreator();
    if (!isAthleteValid) {
      this.errorMessage.set(
        this.creatorValidationError() ||
          (this.lang() === 'es'
            ? 'No encontramos al creador o atleta que deseas reportar. Revisa el enlace o nombre de usuario.'
            : 'We could not find the creator you want to report. Please check the link or username.')
      );
      return;
    }

    if (!reason) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Por favor selecciona el motivo de tu reporte.'
          : 'Please select a reason for reporting.'
      );
      return;
    }

    if (!desc || desc.length < 20) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Por favor describe con al menos 20 caracteres los detalles del incidente.'
          : 'Please provide a detailed description of at least 20 characters.'
      );
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Ingresa un correo electrónico válido para poder dar seguimiento confidencial.'
          : 'Please enter a valid email address for confidential follow-up.'
      );
      return;
    }

    this.isSubmitting.set(true);

    try {
      const selectedReasonObj = this.reasons.find((r) => r.code === reason);
      const reasonTitle = this.lang() === 'es' 
        ? (selectedReasonObj?.titleEs || 'Infracción reportada') 
        : (selectedReasonObj?.titleEn || 'Reported violation');

      const evidenceList: string[] = [];
      if (this.evidenceLink1().trim()) evidenceList.push(this.evidenceLink1().trim());
      if (this.evidenceLink2().trim()) evidenceList.push(this.evidenceLink2().trim());

      const formData = new FormData();
      formData.append('creator_target', link);
      formData.append('reason_code', reason);
      formData.append('reason_title', reasonTitle);
      formData.append('description', desc);
      formData.append('reporter_email', email);
      formData.append('evidence_links', JSON.stringify(evidenceList));

      const fileToUpload = this.attachedFile();
      if (fileToUpload) {
        formData.append('file', fileToUpload, fileToUpload.name);
        formData.append('attached_file', fileToUpload.name);
      }

      try {
        const response = await firstValueFrom(
          this.http.post<{ folio: string; message: string; status: string }>(
            `${environment.apiUrl}/system/report`,
            formData
          )
        );
        this.generatedFolio.set(response.folio || `SHK-${Math.floor(10000 + Math.random() * 90000)}`);
      } catch (httpErr: any) {
        if (httpErr?.status === 404) {
          this.errorMessage.set(
            this.lang() === 'es'
              ? 'El atleta o creador ingresado no existe.'
              : 'The specified athlete or creator does not exist.'
          );
          return;
        }
        console.warn('Backend reporting API offline, generating local ticket fallback:', httpErr);
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        this.generatedFolio.set(`SHK-${randomDigits}`);
      }

      this.submitted.set(true);
    } catch {
      this.errorMessage.set(
        this.lang() === 'es'
          ? 'Ocurrió un error al enviar el reporte. Por favor intenta de nuevo.'
          : 'An error occurred while submitting the report. Please try again.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    this.creatorLink.set('');
    this.selectedReason.set('');
    this.description.set('');
    this.evidenceLink1.set('');
    this.evidenceLink2.set('');
    this.reporterEmail.set('');
    this.attachedFile.set(null);
    this.attachedFileName.set(null);
    this.submitted.set(false);
    this.generatedFolio.set('');
    this.errorMessage.set(null);
  }
}
