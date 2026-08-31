import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './goals.html',
})
export class DashboardGoals {
}
