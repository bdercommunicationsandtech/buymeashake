import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconBoltComponent } from '../../../shared/icons';

@Component({
  selector: 'app-dashboard-integrations',
  standalone: true,
  imports: [CommonModule, IconBoltComponent],
  templateUrl: './integrations.html',
})
export class DashboardIntegrations {
}
