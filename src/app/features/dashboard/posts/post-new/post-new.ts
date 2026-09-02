import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IconLockComponent, IconStarComponent } from '../../../../shared/icons';
import { DashboardService } from '../../../../core/dashboard.service';

@Component({
  selector: 'app-dashboard-post-new',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, RouterLink, IconLockComponent, IconStarComponent],
  template: `
    <div class="space-y-6 max-w-4xl mx-auto pb-16">
      
      <!-- Top Navigation & Actions -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-white/10">
        <div class="flex items-center gap-3">
          <a
            routerLink="/dashboard/posts"
            class="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 grid place-items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
            aria-label="Volver a publicaciones"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <div>
            <h1 class="font-display text-xl sm:text-2xl font-black text-gray-950 dark:text-white">Nueva Publicación</h1>
            <p class="text-xs text-gray-500 dark:text-gray-400">Comparte rutinas, artículos o anuncios con tu comunidad.</p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <button
            type="button"
            (click)="saveDraft()"
            class="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition"
          >
            Guardar Borrador
          </button>
          <button
            type="button"
            (click)="publishPost()"
            [disabled]="isPublishing() || !title().trim()"
            class="px-6 py-2.5 rounded-xl bg-[#c9ff3d] hover:bg-[#bbf033] text-gray-950 text-xs font-black transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            @if (isPublishing()) {
              <span class="inline-block h-3.5 w-3.5 border-2 border-gray-950 border-t-transparent rounded-full animate-spin"></span>
              <span>Publicando...</span>
            } @else {
              <span>Publicar ahora</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            }
          </button>
        </div>
      </div>

      @if (errorMessage()) {
        <div class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {{ errorMessage() }}
        </div>
      }

      <!-- Editor Main Container -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Left Column: Content Area (8 cols) -->
        <div class="lg:col-span-8 space-y-6">
          
          <!-- Título del Post -->
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-6 sm:p-8 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-4">
            <input
              type="text"
              placeholder="Título de la publicación (ej. Mi rutina pesada de sentadilla)..."
              class="w-full font-display text-2xl sm:text-3xl font-black text-gray-950 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-600 bg-transparent border-none outline-none focus:ring-0 p-0"
              [value]="title()"
              (input)="title.set($any($event.target).value)"
            />

            <!-- Toolbar de Formato Rápido -->
            <div class="flex items-center gap-1 py-2 px-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 text-gray-600 dark:text-gray-300 text-xs font-bold overflow-x-auto">
              <button type="button" (click)="insertFormat('**', '**')" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" title="Negrita">
                <strong>B</strong>
              </button>
              <button type="button" (click)="insertFormat('*', '*')" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" title="Cursiva">
                <em>I</em>
              </button>
              <button type="button" (click)="insertFormat('### ', '')" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" title="Encabezado">
                H3
              </button>
              <span class="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1"></span>
              <button type="button" (click)="insertFormat('- ', '')" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" title="Lista de viñetas">
                • Lista
              </button>
              <button type="button" (click)="insertFormat('> ', '')" class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition" title="Cita">
                “ Cita
              </button>
              <span class="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1"></span>
              <label class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition cursor-pointer flex items-center gap-1.5" title="Subir Imagen">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>Imagen</span>
                <input type="file" accept="image/*" class="hidden" (change)="onImageUpload($event)" />
              </label>
            </div>

            <!-- Textarea Editor Principal -->
            <textarea
              id="post-content-area"
              rows="14"
              placeholder="Escribe tu contenido aquí... Puedes estructurar tus bloques de entrenamiento, series, repeticiones, consejos nutricionales o notas del día..."
              class="w-full resize-none text-base text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 bg-transparent border-none outline-none focus:ring-0 p-0 leading-relaxed font-sans"
              [value]="content()"
              (input)="content.set($any($event.target).value)"
            ></textarea>
          </div>

          <!-- Extracto Corto -->
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-6 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-2">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Extracto / Resumen Visible
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">Este texto se verá en el feed y en las vistas previas antes de desbloquear.</p>
            <textarea
              rows="2"
              maxlength="200"
              placeholder="Breve introducción para captar la atención de tus seguidores..."
              class="w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 p-3.5 text-xs text-gray-900 dark:text-white focus:bg-white dark:focus:bg-[#0c0f10] focus:border-[#c9ff3d] outline-none transition"
              [value]="excerpt()"
              (input)="excerpt.set($any($event.target).value)"
            ></textarea>
            <span class="block text-right text-[10px] text-gray-400">{{ excerpt().length }}/200</span>
          </div>

        </div>

        <!-- Right Column: Settings & Audience (4 cols) -->
        <div class="lg:col-span-4 space-y-6">
          
          <!-- Audiencia / Visibilidad -->
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-6 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-4">
            <h3 class="font-display text-sm font-black text-gray-950 dark:text-white">¿Quién puede ver este post?</h3>
            
            <div class="space-y-2.5">
              <!-- Opción 1: Público -->
              <label
                (click)="audience.set('public')"
                class="p-4 rounded-2xl border transition flex items-start gap-3 cursor-pointer"
                [class]="
                  audience() === 'public'
                    ? 'border-[#c9ff3d] bg-[#c9ff3d]/10 dark:bg-[#c9ff3d]/15 text-gray-950 dark:text-white ring-2 ring-[#c9ff3d]/30'
                    : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                "
              >
                <input type="radio" name="audience" [checked]="audience() === 'public'" class="mt-1 text-[#c9ff3d] focus:ring-[#c9ff3d]" />
                <div>
                  <p class="text-xs font-black text-gray-900 dark:text-white">Público (Todos)</p>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Cualquier visitante puede leer el post completo.</p>
                </div>
              </label>

              <!-- Opción 2: Solo Miembros -->
              <label
                (click)="audience.set('members')"
                class="p-4 rounded-2xl border transition flex items-start gap-3 cursor-pointer"
                [class]="
                  audience() === 'members'
                    ? 'border-[#c9ff3d] bg-[#c9ff3d]/10 dark:bg-[#c9ff3d]/15 text-gray-950 dark:text-white ring-2 ring-[#c9ff3d]/30'
                    : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                "
              >
                <input type="radio" name="audience" [checked]="audience() === 'members'" class="mt-1 text-[#c9ff3d] focus:ring-[#c9ff3d]" />
                <div>
                  <div class="flex items-center gap-1.5">
                    <p class="text-xs font-black text-gray-900 dark:text-white">Solo Miembros</p>
                    <span class="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded">Exclusivo</span>
                  </div>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Bloqueado con candado para suscriptores activos.</p>
                </div>
              </label>
            </div>

            <!-- Selector de Nivel Requerido si es para Miembros -->
            @if (audience() === 'members') {
              <div class="pt-2 space-y-1.5 border-t border-gray-100 dark:border-white/5">
                <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500">Nivel Mínimo Requerido</label>
                <select
                  class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1f2421] p-2.5 text-xs font-semibold text-gray-900 dark:text-white focus:border-[#c9ff3d] outline-none"
                  [value]="requiredTier()"
                  (change)="requiredTier.set($any($event.target).value)"
                >
                  <option value="Todos los Miembros">Todos los Miembros (Cualquier Nivel)</option>
                  <option value="Comunidad Pro ($15/mes)">Comunidad Pro ($15/mes o superior)</option>
                  <option value="Atleta Elite ($35/mes)">Atleta Elite ($35/mes)</option>
                </select>
              </div>
            }
          </div>

          <!-- Imagen de Portada -->
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-6 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-3">
            <h3 class="font-display text-sm font-black text-gray-950 dark:text-white">Foto de Portada</h3>
            
            @if (coverUrl()) {
              <div class="relative rounded-2xl overflow-hidden h-36 w-full border border-gray-200 dark:border-white/10">
                <img [src]="coverUrl()" alt="Cover" class="w-full h-full object-cover" />
                <button
                  type="button"
                  (click)="coverUrl.set(null)"
                  class="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/70 text-white flex items-center justify-center text-xs font-bold hover:bg-black transition"
                >
                  ✕
                </button>
              </div>
            } @else {
              <label class="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-gray-400 dark:hover:border-white/20 transition text-center">
                <svg class="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Subir imagen destacada</span>
                <span class="text-[10px] text-gray-400">PNG, JPG o WEBP hasta 5MB</span>
                <input type="file" accept="image/*" class="hidden" (change)="onCoverUpload($event)" />
              </label>
            }
          </div>

        </div>

      </div>
    </div>
  `,
})
export class DashboardPostNew {
  private readonly router = inject(Router);
  private readonly dashboardService = inject(DashboardService);

  readonly title = signal('');
  readonly content = signal('');
  readonly excerpt = signal('');
  readonly audience = signal<'public' | 'members'>('public');
  readonly requiredTier = signal('Todos los Miembros');
  readonly coverUrl = signal<string | null>('https://images.unsplash.com/photo-1517838277536-f5f99be501cd?q=80&w=1200&auto=format&fit=crop');
  readonly isPublishing = signal(false);
  readonly errorMessage = signal<string | null>(null);

  insertFormat(prefix: string, suffix: string): void {
    const textarea = document.getElementById('post-content-area') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = this.content();
    const selected = current.substring(start, end);
    const replacement = prefix + selected + suffix;

    this.content.set(current.substring(0, start) + replacement + current.substring(end));
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.dashboardService.uploadImage(file).subscribe({
      next: (res) => {
        this.insertFormat(`\n![Imagen](${res.url})\n`, '');
      },
    });
  }

  onCoverUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    this.dashboardService.uploadImage(file).subscribe({
      next: (res) => {
        this.coverUrl.set(res.url);
      },
    });
  }

  saveDraft(): void {
    this.router.navigate(['/dashboard/posts']);
  }

  publishPost(): void {
    if (!this.title().trim()) return;

    const rawContent = this.content().trim();
    if (!rawContent) {
      this.errorMessage.set('Escribe el contenido de la publicación antes de publicar.');
      return;
    }

    this.isPublishing.set(true);
    this.errorMessage.set(null);
    const html = rawContent.startsWith('<')
      ? rawContent
      : `<p>${rawContent.replace(/\n/g, '</p><p>')}</p>`;

    this.dashboardService
      .createPost({
        title: this.title().trim(),
        content_html: html,
        access_type: this.audience() === 'members' ? 'members_only' : 'public',
      })
      .subscribe({
        next: () => {
          this.isPublishing.set(false);
          this.router.navigate(['/dashboard/posts']);
        },
        error: (err) => {
          this.isPublishing.set(false);
          const apiMessage = err?.error?.error?.message || err?.error?.detail;
          if (err?.status === 401) {
            this.errorMessage.set('Sesión expirada. Vuelve a iniciar sesión como atleta.');
          } else if (err?.status === 403) {
            this.errorMessage.set('Esta cuenta no tiene perfil de atleta.');
          } else {
            this.errorMessage.set(apiMessage || 'No se pudo publicar. Revisa el backend e inténtalo de nuevo.');
          }
        },
      });
  }
}
