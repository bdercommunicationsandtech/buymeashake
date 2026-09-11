import { Component, ChangeDetectionStrategy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { PostCardComponent, PostItem } from '../../../shared/post-card/post-card.component';
import { ThemeService } from '../../../core/theme.service';
import { AuthService } from '../../../core/auth.service';
import { SupporterService } from '../../../core/supporter.service';
import { LanguageService } from '../../../core/language.service';
import { FollowedAthlete, PostResponse } from '../../../core/api.models';
import { resolveMediaUrl } from '../../../core/utils/media-url.util';
import { BrandLogoComponent } from '../../../shared/brand-logo/brand-logo.component';
import { ChromeControlsComponent } from '../../../shared/chrome-controls/chrome-controls.component';

@Component({
  selector: 'app-supporter-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, PostCardComponent, BrandLogoComponent, ChromeControlsComponent],
  template: `
    <div class="min-h-screen bg-[#fafafb] dark:bg-[#090c0a] text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      
      <!-- Topbar del Supporter Portal -->
      <header class="sticky top-0 z-40 bg-white/95 dark:bg-[#121614]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-white/10 px-5 sm:px-10 h-16 flex items-center justify-between">
        
        <!-- Logo -->
        <app-brand-logo link="/" [hideTitleOnMobile]="true" />

        <!-- Acciones Derecha -->
        <div class="flex items-center gap-3">
          <app-chrome-controls size="sm" />

          <!-- Botón según rol: Si ya es atleta va a su dashboard, si es supporter crea su página -->
          @if (isAthlete()) {
            <a
              routerLink="/dashboard/home"
              class="rounded-xl bg-[#c9ff3d] hover:bg-[#bbf033] px-3.5 sm:px-4 py-2 text-xs font-black text-gray-950 transition shadow-xs flex items-center gap-1.5"
            >
              <span class="hidden sm:inline">{{ t().dashboard.title }}</span>
              <span class="sm:hidden">{{ t().dashboard.home }}</span>
            </a>
          } @else {
            <a
              routerLink="/onboarding"
              class="rounded-xl bg-[#c9ff3d] hover:bg-[#bbf033] px-3.5 sm:px-4 py-2 text-xs font-black text-gray-950 transition shadow-xs flex items-center gap-1.5"
            >
              <span class="hidden sm:inline">{{ t().supporterArea.createAthletePage }}</span>
              <span class="sm:hidden">{{ t().supporterArea.beCreator }}</span>
            </a>
          }

          <!-- User Menu Dropdown Trigger (Captura 4) -->
          <div class="relative">
            <button
              type="button"
              (click)="userMenuOpen.set(!userMenuOpen())"
              class="h-9 w-9 rounded-full bg-gray-900 dark:bg-white/10 border border-gray-200 dark:border-white/15 text-[#c9ff3d] grid place-items-center text-xs font-black hover:ring-2 hover:ring-[#c9ff3d]/50 transition cursor-pointer"
              [attr.aria-label]="t().supporterArea.accountMenu"
            >
              
            </button>

            <!-- Dropdown Menu (Fiel a Captura 4) -->
            @if (userMenuOpen()) {
              <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-[#121614] rounded-2xl shadow-xl border border-gray-200/80 dark:border-white/10 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div class="px-4 py-2 border-b border-gray-100 dark:border-white/5">
                  <p class="text-xs font-bold text-gray-500 dark:text-gray-400">{{ t().supporterArea.supporterAccount }}</p>
                  <p class="text-xs font-black text-gray-950 dark:text-white truncate">
                    {{ currentUserEmail() }}
                  </p>
                </div>

                <a
                  routerLink="/fan/home"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {{ t().supporterArea.followingFeed }}
                </a>
                <a
                  routerLink="/fan/account"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  👤 {{ t().supporterArea.myAccount }}
                </a>
                @if (isAthlete()) {
                  <a
                    routerLink="/dashboard/home"
                    (click)="userMenuOpen.set(false)"
                    class="block px-4 py-2.5 text-xs font-black text-emerald-600 dark:text-[#c9ff3d] hover:bg-gray-50 dark:hover:bg-white/5 bg-[#c9ff3d]/5"
                  >
                    ⚡ {{ t().dashboard.title }}
                  </a>
                } @else {
                  <a
                    routerLink="/onboarding"
                    (click)="userMenuOpen.set(false)"
                    class="block px-4 py-2.5 text-xs font-black text-emerald-600 dark:text-[#c9ff3d] hover:bg-gray-50 dark:hover:bg-white/5 bg-[#c9ff3d]/5"
                  >
                    ⚡ {{ t().supporterArea.becomeCreatorAthlete }}
                  </a>
                }
                <a
                  routerLink="/explore"
                  (click)="userMenuOpen.set(false)"
                  class="block px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                >
                  {{ t().supporterArea.exploreAthletes }}
                </a>
                <div class="border-t border-gray-100 dark:border-white/5 mt-1 pt-1">
                  <button
                    type="button"
                    (click)="logout()"
                    class="w-full text-left px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                  >
                    {{ t().supporterArea.logout }}
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
              <span>{{ t().supporterArea.feed }}</span>
            </a>

            <a
              routerLink="/explore"
              class="flex items-center gap-3 px-3.5 py-3 rounded-2xl text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition"
            >
              <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <span>{{ t().supporterArea.exploreAthletes }}</span>
            </a>
          </nav>
        </aside>

        <!-- Columna Central: Feed de Publicaciones de Atletas Seguidos (Captura 3) -->
        <div class="lg:col-span-6 space-y-6">
          
          <div class="flex items-center justify-between pb-2 border-b border-gray-200/80 dark:border-white/10 gap-3 flex-wrap">
            <h1 class="font-display text-xl font-black text-gray-950 dark:text-white">
              {{ t().supporterArea.followingTitle }}
            </h1>
            <span class="text-xs font-bold text-gray-400">
              {{ followedAthletes().length }} {{ t().supporterArea.followedAthletesCount }}
            </span>
          </div>

          <div class="flex items-center gap-2 flex-wrap">
            @for (filter of feedFilters; track filter.value) {
              <button
                type="button"
                (click)="setFeedFilter(filter.value)"
                class="text-[11px] font-bold px-3 py-1.5 rounded-full border transition cursor-pointer"
                [class]="
                  feedFilter() === filter.value
                    ? 'bg-gray-950 text-white dark:bg-[#c9ff3d] dark:text-gray-950 border-transparent'
                    : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-gray-400'
                "
              >
                {{ filter.labelKey === 'all' ? t().supporterArea.feedFilterAll
                  : filter.labelKey === 'public' ? t().supporterArea.feedFilterPublic
                  : filter.labelKey === 'shake' ? t().supporterArea.feedFilterShake
                  : t().supporterArea.feedFilterMembers }}
              </button>
            }
          </div>

          <!-- Loading State -->
          @if (loading()) {
            <div class="py-12 text-center text-gray-400 text-sm font-semibold flex items-center justify-center gap-2">
              <span class="inline-block h-5 w-5 border-2 border-[#c9ff3d] border-t-transparent rounded-full animate-spin"></span>
              <span>{{ t().supporterArea.loadingFeed }}</span>
            </div>
          } @else if (feedPosts().length > 0) {
            <!-- Feed de Publicaciones Reales -->
            <div class="space-y-6">
              @for (post of feedPosts(); track post.id) {
                <app-post-card
                  [post]="post"
                  (onLike)="likePost($event)"
                  (onComment)="commentOnPost($event)"
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
                <h3 class="font-display text-base font-black text-gray-900 dark:text-white">{{ t().supporterArea.feedEmptyTitle }}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  {{ t().supporterArea.feedEmptyDesc }}
                </p>
              </div>

              <a
                routerLink="/explore"
                class="inline-block rounded-2xl bg-[#c9ff3d] hover:bg-[#bbf033] px-6 py-2.5 text-xs font-black text-gray-950 transition shadow-xs"
              >
                {{ t().supporterArea.discoverAthletes }}
              </a>
            </div>
          }
        </div>

        <!-- Columna Derecha: Lista de Atletas Seguidos (Following Sidebar) (Captura 3) -->
        <aside class="lg:col-span-3 space-y-4">
          <div class="bg-white dark:bg-[#121614] rounded-3xl p-5 border border-gray-200/80 dark:border-white/10 shadow-xs space-y-4">
            <h2 class="font-display text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {{ t().supporterArea.followingSidebar }}
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
                      {{ athlete.disciplines.join(', ') || athlete.bio || t().supporterArea.athleteRole }}
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
                <span>{{ t().supporterArea.findMoreAthletes }}</span>
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
  readonly languageService = inject(LanguageService);
  readonly t = this.languageService.currentTranslations;
  readonly lang = this.languageService.currentLang;
  private readonly authService = inject(AuthService);
  private readonly supporterService = inject(SupporterService);

  readonly userMenuOpen = signal(false);
  readonly loading = signal(true);
  readonly currentUserEmail = signal<string>('supporter@buymeashake.fit');

  readonly followedAthletes = signal<FollowedAthlete[]>([]);
  readonly feedPosts = signal<PostItem[]>([]);
  readonly feedFilter = signal<'all' | 'public' | 'shake_supporters' | 'members_only'>('all');
  readonly feedFilters = [
    { value: 'all' as const, labelKey: 'all' },
    { value: 'public' as const, labelKey: 'public' },
    { value: 'shake_supporters' as const, labelKey: 'shake' },
    { value: 'members_only' as const, labelKey: 'members' },
  ];

  isAthlete(): boolean {
    return this.authService.isAthlete();
  }

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

  setFeedFilter(value: 'all' | 'public' | 'shake_supporters' | 'members_only'): void {
    this.feedFilter.set(value);
    this.loadFeed();
  }

  loadFeed(): void {
    this.loading.set(true);
    const filter = this.feedFilter();
    const accessType =
      filter === 'all' ? null : (filter as 'public' | 'shake_supporters' | 'members_only');
    this.supporterService.getFeed(1, 10, accessType).subscribe({
      next: (res) => {
        this.loading.set(false);
        const mapped: PostItem[] = res.items.map((item: PostResponse) => {
          const isMembersOnly = item.access_type === 'members_only' || !!item.is_members_only;
          const isShakeSupporters =
            item.access_type === 'shake_supporters' || !!item.is_shake_supporters;
          const isUnlocked = item.is_unlocked !== false;
          const plainExcerpt = (value: string) =>
            value
              .replace(/<img\b[^>]*>/gi, ' ')
              .replace(/!\[[^\]]*]\([^)]*\)/g, ' ')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim();
          const excerptRaw =
            !isUnlocked
              ? (item.excerpt || '').trim()
              : (item.excerpt || '').trim() || plainExcerpt(item.content_html).slice(0, 180);
          const fromApi = resolveMediaUrl(item.cover_image_url);
          const htmlMatch = isUnlocked
            ? item.content_html.match(/<img[^>]+src=["']([^"']+)["']/i)
            : null;
          const mdMatch = isUnlocked
            ? item.content_html.match(/!\[[^\]]*]\(([^)\s]+)\)/)
            : null;
          return {
            id: String(item.id),
            title: item.title,
            excerpt: plainExcerpt(excerptRaw),
            content: item.content_html,
            authorName: item.author_name || 'Atleta',
            authorHandle: item.author_handle || '',
            publishedAt: new Date(item.published_at).toLocaleDateString(),
            likesCount: item.likes_count,
            commentsCount: item.comments?.length || 0,
            isLiked: !!item.is_liked,
            isMembersOnly,
            isShakeSupporters,
            isUnlocked,
            coverImageUrl:
              fromApi ||
              (isUnlocked ? resolveMediaUrl(htmlMatch?.[1] || mdMatch?.[1] || null) : null),
            comments: (item.comments || []).map((cm) => ({
              id: cm.id,
              userName: cm.user_name,
              userAvatar: resolveMediaUrl(cm.user_avatar) || cm.user_avatar,
              content: cm.content,
              createdAt: new Date(cm.created_at).toLocaleDateString(),
            })),
          };
        });
        this.feedPosts.set(mapped);
      },
      error: () => {
        this.loading.set(false);
        this.feedPosts.set([]);
      },
    });
  }

  private readonly likingPostIds = new Set<string>();

  likePost(postId: string): void {
    if (this.likingPostIds.has(postId)) return;

    const current = this.feedPosts().find((p) => p.id === postId);
    if (!current) return;

    const prevLiked = !!current.isLiked;
    const prevCount = current.likesCount;
    const optimisticLiked = !prevLiked;
    const optimisticCount = Math.max(0, prevCount + (optimisticLiked ? 1 : -1));

    this.feedPosts.update((list) =>
      list.map((p) =>
        p.id === postId ? { ...p, likesCount: optimisticCount, isLiked: optimisticLiked } : p,
      ),
    );

    this.likingPostIds.add(postId);
    this.supporterService.likePost(Number(postId)).subscribe({
      next: (res) => {
        this.likingPostIds.delete(postId);
        this.feedPosts.update((list) =>
          list.map((p) =>
            p.id === postId
              ? { ...p, likesCount: res.likes_count, isLiked: res.liked }
              : p,
          ),
        );
      },
      error: () => {
        this.likingPostIds.delete(postId);
        this.feedPosts.update((list) =>
          list.map((p) =>
            p.id === postId ? { ...p, likesCount: prevCount, isLiked: prevLiked } : p,
          ),
        );
      },
    });
  }

  commentOnPost(event: { postId: string; content: string; done: (ok: boolean) => void }): void {
    const postId = Number(event.postId);
    this.supporterService.commentOnPost(postId, event.content).subscribe({
      next: (comment) => {
        this.feedPosts.update((list) =>
          list.map((p) =>
            p.id === event.postId
              ? {
                  ...p,
                  commentsCount: (p.commentsCount || 0) + 1,
                  comments: [
                    ...(p.comments || []),
                    {
                      id: comment.id,
                      userName: comment.user_name,
                      userAvatar: comment.user_avatar,
                      content: comment.content,
                      createdAt: 'Justo ahora',
                    },
                  ],
                }
              : p,
          ),
        );
        event.done(true);
      },
      error: () => {
        event.done(false);
      },
    });
  }

  unlockPost(post: PostItem): void {
    this.router.navigate(['/', post.authorHandle]);
  }

  logout(): void {
    this.authService.logout();
  }
}

