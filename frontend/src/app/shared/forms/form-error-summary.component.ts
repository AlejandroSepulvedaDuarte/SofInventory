import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-form-error-summary',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" class="form-error-summary" role="alert" aria-live="assertive">
      <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
      <span>{{ message }}</span>
    </div>
  `,
})
export class FormErrorSummaryComponent {
  @Input() message = '';
}
