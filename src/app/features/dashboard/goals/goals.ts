import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DashboardService } from '../../../core/dashboard.service';
import { AuthService } from '../../../core/auth.service';
import { GoalItem } from '../../../core/api.models';
import {
  IconBoltComponent,
  IconDumbbellComponent,
  IconShakerComponent,
  IconTrophyComponent,
} from '../../../shared/icons';

export type GoalCategory = 'equipment' | 'travel' | 'nutrition' | 'camp';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    IconShakerComponent,
    IconDumbbellComponent,
    IconTrophyComponent,
    IconBoltComponent,
  ],
  templateUrl: './goals.html',
})
export class DashboardGoals implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly goals = signal<GoalItem[]>([]);
  readonly saving = signal(false);
  readonly uploadingCover = signal(false);
  readonly successMessage = signal<string | null>(null);

  // Control de vista: modal de creación/edición abierto o vista de lista de tarjetas
  readonly isEditorOpen = signal(false);

  // Form State
  readonly editingGoalId = signal<number | null>(null);
  readonly selectedCategory = signal<GoalCategory>('equipment');
  readonly goalTitle = signal('');
  readonly goalTarget = signal(1500);
  readonly goalDescription = signal(
    'Este nuevo rack nos permitirá entrenar sentadillas pesadas con total seguridad y preparar la clasificatoria con sesiones en directo exclusivas.'
  );
  readonly goalCoverUrl = signal<string | null>(null);
  readonly hasReward = signal(true);
  readonly rewardText = signal(
    'Mención en el muro de honor y sesión de Q&A en directo exclusiva para todos los que donen 3 o más Shakers a esta meta.'
  );

  // Datos del Atleta para la Vista Previa en Vivo
  readonly athleteName = computed(() => this.authService.currentUser()?.full_name || 'Atleta Oficial');
  readonly athleteHandle = computed(() => this.authService.currentUser()?.athlete_handle || 'atleta');
  readonly unitShakePrice = signal(5);

  // La meta activa actual (regla de negocio: exactamente UNA activa a la vez)
  readonly activeGoal = computed(() => this.goals().find((g) => g.is_active));

  // Metas guardadas inactivas (historial / borradores listos para reutilizar)
  readonly inactiveGoals = computed(() => this.goals().filter((g) => !g.is_active));

  // Cálculos reactivos de Shakers
  readonly shakersEquivalent = computed(() => {
    const target = this.goalTarget();
    const price = this.unitShakePrice();
    return Math.max(1, Math.ceil(target / price));
  });

  readonly currentRaised = computed(() => {
    const editId = this.editingGoalId();
    if (editId) {
      const g = this.goals().find((item) => item.id === editId);
      return g ? Number(g.raised_amount || 0) : 0;
    }
    return 0;
  });

  readonly currentShakersRaised = computed(() => {
    const raised = this.currentRaised();
    const price = this.unitShakePrice();
    return Math.floor(raised / price);
  });

  readonly percentAchieved = computed(() => {
    const target = this.goalTarget();
    if (target <= 0) return 0;
    const raised = this.currentRaised();
    return Math.min(100, Math.round((raised / target) * 100));
  });

  readonly remainingAmount = computed(() => {
    return Math.max(0, this.goalTarget() - this.currentRaised());
  });

  getGoalPercent(raised: number | string | null | undefined, target: number | string | null | undefined): number {
    const r = Number(raised || 0);
    const t = Number(target || 0);
    if (t <= 0) return 0;
    return Math.min(100, Math.round((r / t) * 100));
  }

  ngOnInit(): void {
    this.loadGoals();
    this.loadAthleteProfile();
  }

  loadAthleteProfile(): void {
    this.dashboardService.getProfile().subscribe({
      next: (profile) => {
        if (profile.shake_price) {
          this.unitShakePrice.set(Number(profile.shake_price));
        }
      },
      error: () => {},
    });
  }

  loadGoals(): void {
    this.loading.set(true);
    this.dashboardService.getGoals().subscribe({
      next: (items) => {
        this.goals.set(items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openNewGoalModal(): void {
    this.editingGoalId.set(null);
    this.selectedCategory.set('equipment');
    this.goalTitle.set('Renovación de Rack y Discos Olímpicos');
    this.goalTarget.set(1500);
    this.goalDescription.set(
      'Este nuevo equipamiento nos permitirá entrenar con máxima intensidad y preparar la próxima clasificatoria.'
    );
    this.isEditorOpen.set(true);
  }

  openEditGoal(goal: GoalItem): void {
    this.editingGoalId.set(goal.id);
    this.goalTitle.set(goal.title);
    this.goalTarget.set(Number(goal.target_amount));
    this.isEditorOpen.set(true);
  }

  closeModal(): void {
    this.isEditorOpen.set(false);
  }

  setCategory(cat: GoalCategory): void {
    this.selectedCategory.set(cat);
    if (!this.editingGoalId()) {
      switch (cat) {
        case 'equipment':
          this.goalTitle.set('Renovación de Rack y Discos Olímpicos');
          this.goalTarget.set(1500);
          break;
        case 'travel':
          this.goalTitle.set('Vuelos y Hospedaje para el Nacional');
          this.goalTarget.set(1200);
          break;
        case 'nutrition':
          this.goalTitle.set('Suplementación y Proteína de 3 Meses');
          this.goalTarget.set(600);
          break;
        case 'camp':
          this.goalTitle.set('Campamento de Alto Rendimiento');
          this.goalTarget.set(2000);
          break;
      }
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.uploadingCover.set(true);

    this.dashboardService.uploadImage(file).subscribe({
      next: (res) => {
        this.goalCoverUrl.set(res.url);
        this.uploadingCover.set(false);
        this.showSuccess('Imagen de portada cargada con éxito.');
      },
      error: () => {
        this.uploadingCover.set(false);
      },
    });
  }

  removeCover(): void {
    this.goalCoverUrl.set(null);
  }

  /**
   * Publicar Meta en el perfil:
   * 1. Si está guardando (saving() === true), bloquea para evitar doble clic (idempotencia).
   * 2. Al activarse, el backend desactiva automáticamente cualquier otra meta del atleta.
   * 3. Cierra el modal y deja la tarjeta visible en el Dashboard.
   */
  publishGoal(): void {
    if (this.saving()) return; // Idempotencia en cliente contra clicks repetidos

    const title = this.goalTitle().trim();
    const target = this.goalTarget();
    if (!title || target <= 0) return;

    this.saving.set(true);
    this.successMessage.set(null);

    const currentId = this.editingGoalId();

    if (currentId) {
      this.dashboardService
        .updateGoal(currentId, {
          title,
          target_amount: target,
          is_active: true,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.isEditorOpen.set(false); // Cierra el modal
            this.showSuccess('¡Meta deportiva publicada como activa en tu perfil público!');
            this.loadGoals();
          },
          error: () => this.saving.set(false),
        });
    } else {
      this.dashboardService
        .createGoal({
          title,
          target_amount: target,
          currency: 'USD',
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.isEditorOpen.set(false); // Cierra el modal
            this.showSuccess('¡Tu nueva meta deportiva está publicada y activa!');
            this.loadGoals();
          },
          error: () => this.saving.set(false),
        });
    }
  }

  /**
   * Guardar como borrador / tarjeta reutilizable sin activar en el perfil
   */
  saveDraft(): void {
    if (this.saving()) return;

    const title = this.goalTitle().trim();
    const target = this.goalTarget();
    if (!title || target <= 0) return;

    this.saving.set(true);
    const currentId = this.editingGoalId();

    if (currentId) {
      this.dashboardService
        .updateGoal(currentId, {
          title,
          target_amount: target,
          is_active: false,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.isEditorOpen.set(false);
            this.showSuccess('Meta guardada en tus borradores.');
            this.loadGoals();
          },
          error: () => this.saving.set(false),
        });
    } else {
      this.dashboardService
        .createGoal({
          title,
          target_amount: target,
          currency: 'USD',
        })
        .subscribe({
          next: (created) => {
            this.dashboardService
              .updateGoal(created.id, { is_active: false })
              .subscribe(() => {
                this.saving.set(false);
                this.isEditorOpen.set(false);
                this.showSuccess('Guardada como tarjeta en tus metas para reutilizar.');
                this.loadGoals();
              });
          },
          error: () => this.saving.set(false),
        });
    }
  }

  /**
   * Activar directamente una meta desde su tarjeta guardada
   */
  activateSavedGoal(goalId: number): void {
    if (this.saving()) return;
    this.saving.set(true);

    this.dashboardService
      .updateGoal(goalId, { is_active: true })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showSuccess('Meta activada en tu perfil.');
          this.loadGoals();
        },
        error: () => this.saving.set(false),
      });
  }

  /**
   * Pausar la meta activa para que no aparezca en el perfil
   */
  pauseActiveGoal(goalId: number): void {
    if (this.saving()) return;
    this.saving.set(true);

    this.dashboardService
      .updateGoal(goalId, { is_active: false })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.showSuccess('Meta pausada. Ahora se encuentra en tus metas guardadas.');
          this.loadGoals();
        },
        error: () => this.saving.set(false),
      });
  }

  private showSuccess(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 4000);
  }
}
