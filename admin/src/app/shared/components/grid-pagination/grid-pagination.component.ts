import { Component, input, output, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-grid-pagination',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './grid-pagination.component.html',
  styleUrl: './grid-pagination.component.scss',
})
export class GridPaginationComponent {
  total = input.required<number>();
  page = input.required<number>();
  limit = input.required<number>();
  /** Opciones: 5, 10, 50, 100 y 0 = "Todos" (sin límite). */
  pageSizeOptions = input<number[]>([5, 10, 50, 100, 0]);

  pageChange = output<number>();
  limitChange = output<number>();

  totalPages = computed(() => {
    const t = this.total();
    const l = this.limit();
    if (l === 0) return 1; // "Todos"
    return Math.max(1, Math.ceil(t / l) || 1);
  });

  hasPrev = computed(() => this.page() > 1);
  hasNext = computed(() => this.page() < this.totalPages());

  fromRecord = computed(() => {
    const t = this.total();
    if (t === 0) return 0;
    const l = this.limit();
    if (l === 0) return 1;
    return (this.page() - 1) * l + 1;
  });

  toRecord = computed(() => {
    const t = this.total();
    const l = this.limit();
    if (l === 0) return t;
    const to = this.page() * l;
    return Math.min(to, t);
  });

  onLimitChange(newLimit: number | string): void {
    this.limitChange.emit(Number(newLimit));
  }

  goPrev(): void {
    if (this.hasPrev()) this.pageChange.emit(this.page() - 1);
  }

  goNext(): void {
    if (this.hasNext()) this.pageChange.emit(this.page() + 1);
  }
}
