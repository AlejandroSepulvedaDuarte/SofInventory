import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService } from './notification.service';

@Component({
  selector: 'app-notification-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-region" aria-label="Notificaciones">
      <div
        *ngFor="let item of notifications.notifications()"
        class="app-notification"
        [class.notification-success]="item.kind === 'success'"
        [class.notification-warning]="item.kind === 'warning'"
        [class.notification-error]="item.kind === 'error'"
        role="status"
        aria-live="polite"
        (mouseenter)="notifications.pause(item.id)"
        (mouseleave)="notifications.resume(item.id)"
        (focusin)="notifications.pause(item.id)"
        (focusout)="notifications.resume(item.id)"
      >
        <i class="fas" [class.fa-circle-check]="item.kind === 'success'" [class.fa-triangle-exclamation]="item.kind === 'warning'" [class.fa-circle-xmark]="item.kind === 'error'" aria-hidden="true"></i>
        <span>{{ item.message }}</span>
        <button type="button" class="notification-close" (click)="notifications.dismiss(item.id)" aria-label="Cerrar notificación">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </div>
  `,
})
export class NotificationContainerComponent {
  constructor(public notifications: NotificationService) {}
}
