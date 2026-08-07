import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="message" class="field-error-message" [id]="id">
      <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
      <span>{{ message }}</span>
    </div>
  `,
})
export class FieldErrorComponent {
  @Input() id = '';
  @Input() message = '';
}
