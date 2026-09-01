import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PostCardComponent, PostItem } from '../../../shared/post-card/post-card.component';
import { ThemeService } from '../../../core/theme.service';
import { AuthService } from '../../../core/auth.service';
import { SupporterService } from '../../../core/supporter.service';
import { FollowedAthlete, PostResponse } from '../../../core/api.models';

@Component({
  selector: 'app-supporter-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, PostCardComponent],
  template: `
    <div class="min-h-screen bg-[#fafafb] dark:bg-[#090c0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      
      <!-- Topbar del Supporter Portal -->
      <header class="sticky top-0 z-40 bg-white/95 dark:bg-[#121614]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 px-5 sm:px-10 h-16 flex items-center justify-between">
        
        <!-- Logo -->
        <a routerLink="/" class="flex items-center gap-2.5">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-[#c9ff3d] text-[#070a08] font-bold shadow-xs">
            <svg viewBox="0 0 32 32" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linejoin="round">
              <rect x="12" y="4" width="8" height="4" rx="2" fill="currentColor" stroke="none" />
              <path d="M10 10h12l-1.4 16a4 4 0 0 1-4 3.6h-1.2a4 4 0 0 1-4-3.6z" />
              <path d="M11 20h10" stroke-linecap="round" />
            </svg>
          </span>
          <span class="font-display text-lg font-black tracking-tight text-gray-950 dark:text-white hidden sm:inline">
            buymeashake.fit
          </span>
        </a>

        <!-- Acciones Derecha -->
        <div class="flex items-center gap-3">
          
          <!-- Botón Theme Toggle -->
          <button
            type="button"
            (click)="themeService.toggleTheme()"
            class="h-9 w-9 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-200 grid place-items-center hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
            aria-label="Cambiar tema"
          >
            @if (themeService.currentTheme() === 'dark') {
              <svg class="w-4 h-4 text-[#c9ff3d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            } @else {
              <svg class="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            }
          </button>

          <!-- Botón "Become a Creator" (Captura 4 BMC) -->
          <a
            routerLink="/auth/register"
            class="rounded-xl bg-[#c9ff3d] hover:bg-[#bbf033] px-3.5 sm:px-4 py-2 text-xs font-black text-gray-950 transition shadow-xs flex items-center gap-1.5"
          >
            <span class="hidden sm:inline">Crear mi página de Atleta</span>
            <span class="sm:hidden">Ser Creador</span>
          </a>

          <!-- User Menu Dropdown Trigger (Captura 4) -->
          <div class="relative">
            <button
              type="button"
              (click)="userMenuOpen.set(!userMenuOpen())"
              class="h-9 w-9 rounded-full bg-gray-900 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-[#c9ff3d] grid place-items-center text-xs font-black hover:ring-2 hover:ring-[#c9ff3d]/50 transition cursor-pointer"
              aria-label="Menú de cuenta"
            >
              🥤
            </button>

            <!-- Dropdown Menu (Fiel a Captura 4) -->
            @if (userMenuOpen()) {
              <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-[#121614] rounded-2xl shadow-xl border border-gray-200/80 dark:border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div class="px-4 py-2 border-b border-gray-100 dark:border-white/5">
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400">Cuenta de Seguidor</p>
                  <p class="text-xs font-black text-gray-950 dark:text-white truncate">
                    {{ currentUserEmail() }}
                  </p>
                </div>

                <a
                  routerLink="/fan/home"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Feed de Siguiendo
                </a>
                <a
                  routerLink="/fan/account"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  👤 Mi Cuenta (Ajustes)
                </a>
                <a
                  routerLink="/auth/register"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-black text-emerald-600 dark:text-[#c9ff3d] hover:bg-gray-50 dark:hover:bg-white/5 bg-[#c9ff3d]/5"
                >
                  ⚡ Become a creator (Atleta)
                </a>
                <a
                  routerLink="/explore"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  Explorar Atletas
                </a>
                <div class="border-t border-gray-100 dark:border-white/5 mt-1 pt-1">
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            }
          </div>

        </div>
      </header>

      <!-- Main Layout: 3 Columnas (Nav Izq + Feed Central + Siguiendo Der) (Captura 3) -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        <!-- Columna Izquierda: Menú de Navegación del Supporter -->
        <aside class="hidden lg:block lg:col-span-3 space-y-2">
          <nav class="bg-white dark:bg-[#121614] rounded-3xl p-4 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-1 text-xs font-bold">
            <a
              routerLink="/fan/home"
              class="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[#fff9e6] dark:bg-white/10 text-gray-950 dark:text-[#c9ff3d] font-black border-l-4 border-[#f5b300]"
            >
              <svg class="w-4 h-4 text-[#f5b300]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
              <span>Home (Feed)</span>
            </a>

            <a
              routerLink="/explore"
              class="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition"
            >
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span>Explorar Atletas</span>
            </a>
          </nav>
        </aside>

        <!-- Columna Central: Feed de Publicaciones de Atletas Seguidos (Captura 3) -->
        <div class="lg:col-span-6 space-y-6">
          
          <div class="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-white/10">
            <h1 class="font-display text-xl font-black text-gray-950 dark:text-white">
              Following (Feed)
            </h1>
            <span class="text-xs font-bold text-gray-400">
              {{ followedAthletes().length }} atletas seguidos
            </span>
          </div>

          <!-- Loading State -->
          @if (loading()) {
            <div class="py-12 text-center text-gray-400 text-sm font-semibold flex items-center justify-center gap-2">
              <span class="inline-block h-5 w-5 border-2 border-[#c9ff3d] border-t-transparent rounded-full animate-spin"></span>
              <span>Cargando publicaciones de tus atletas...</span>
            </div>
          } @else if (feedPosts().length > 0) {
            <!-- Feed de Publicaciones Reales -->
            <div class="space-y-6">
              @for (post of feedPosts(); track post.id) {
                <app-post-card
                  [post]="post"
                  (onLike)="likePost($event)"
                  (onUnlock)="unlockPost($event)"
                />
              }
            </div>
          } @else {
            <!-- Empty State Fiel a Captura 3 (Your feed is empty) -->
            <div class="bg-white dark:bg-[#121614] rounded-3xl p-12 text-center border border-gray-200/80 dark:border-white/10 shadow-xs space-y-4">
              <div class="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-white/5 border border-amber-200 dark:border-white/10 grid place-items-center mx-auto text-amber-500">
                <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm4 0h2v2h-2V5zM7 9h2v2H7V9zm4 0h2v2h-2V9z" clip-rule="evenodd"/>
                </svg>
              </div>

              <div>
                <h3 class="font-display text-base font-black text-gray-900 dark:text-white">Tu feed está vacío</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  Sigue a más atletas para ver sus rutinas de entrenamiento y publicaciones exclusivas.
                </p>
              </div>

              <a
                routerLink="/explore"
                class="inline-block rounded-2xl bg-[#c9ff3d] hover:bg-[#bbf033] px-6 py-2.5 text-xs font-black text-gray-950 transition shadow-xs"
              >
                Descubrir Atletas
              </a>
            </div>
          }
        </div>

        <!-- Columna Derecha: Lista de Atletas Seguidos (Following Sidebar) (Captura 3) -->
        <aside class="lg:col-span-3 space-y-4">
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-5 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-4">
            <h2 class="font-display text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Following
            </h2>

            <div class="space-y-3">
              @for (athlete of followedAthletes(); track athlete.id) {
                <a
                  [routerLink]="['/', athlete.handle]"
                  class="flex items-center gap-3 p-2 rounded-2xl hover:bg-gray-50 dark:hover:bg-white/5 transition group"
                >
                  <div class="h-10 w-10 rounded-full bg-gray-900 dark:bg-white/10 text-[#c9ff3d] grid place-items-center font-black text-xs shrink-0 border border-white/10">
                    {{ athlete.name.slice(0, 2).toUpperCase() }}
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-[#c9ff3d] transition">
                      {{ athlete.name }}
                    </p>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {{ athlete.primary_sport || athlete.bio || 'Atleta' }}
                    </p>
                  </div>
                </a>
              }
            </div>

            <div class="pt-2 border-t border-gray-100 dark:border-white/5">
              <a
                routerLink="/explore"
                class="text-xs font-black text-emerald-600 dark:text-[#c9ff3d] hover:underline flex items-center justify-between"
              >
                <span>Encontrar más atletas</span>
                <span>→</span>
              </a>
            </div>
          </div>
        </aside>

      </main>
    </div>
  `,
})
export class DashboardSupporterHome implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly themeService = inject(ThemeService);
  private readonly authService = inject(AuthService);
  private readonly supporterService = inject(SupporterService);

  readonly userMenuOpen = signal(false);
  readonly loading = signal(true);
  readonly currentUserEmail = signal<string>('supporter@buymeashake.fit');

  readonly followedAthletes = signal<FollowedAthlete[]>([]);
  readonly feedPosts = signal<PostItem[]>([]);

  ngOnInit(): void {
    this.authService.loadMe().subscribe({
      next: (me) => {
        if (me?.email) {
          this.currentUserEmail.set(me.email);
        }
      },
    });

    this.loadFollowing();
    this.loadFeed();
  }

  loadFollowing(): void {
    this.supporterService.getFollowing().subscribe({
      next: (athletes) => {
        this.followedAthletes.set(athletes);
      },
      error: () => {
        this.followedAthletes.set([]);
      },
    });
  }

  loadFeed(): void {
    this.loading.set(true);
    this.supporterService.getFeed(1, 10).subscribe({
      next: (res) => {
        this.loading.set(false);
        const mapped: PostItem[] = res.items.map((item: PostResponse) => ({
          id: String(item.id),
          title: item.title,
          excerpt: item.content_html.replace(/<[^>]+>/g, '').slice(0, 160) + '...',
          authorName: item.author_name || 'Atleta',
          authorHandle: item.author_handle || '',
          publishedAt: new Date(item.published_at).toLocaleDateString(),
          likesCount: item.likes_count,
          commentsCount: 0,
          isMembersOnly: item.access_type === 'members_only',
        }));
        this.feedPosts.set(mapped);
      },
      error: () => {
        this.loading.set(false);
        this.feedPosts.set([]);
      },
    });
  }

  likePost(postId: string): void {
    this.feedPosts.update((list) =>
      list.map((p) => (p.id === postId ? { ...p, likesCount: p.likesCount + 1 } : p))
    );
  }

  unlockPost(post: PostItem): void {
    this.router.navigate(['/', post.authorHandle]);
  }

  logout(): void {
    this.authService.logout();
  }
}

