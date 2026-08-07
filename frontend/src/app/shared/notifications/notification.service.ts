import { Injectable, signal } from '@angular/core';

export type NotificationKind = 'success' | 'warning' | 'error';

export interface AppNotification {
  id: number;
  kind: NotificationKind;
  message: string;
  remaining: number;
  startedAt: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly notifications = signal<AppNotification[]>([]);
  private timers = new Map<number, number>();
  private nextId = 1;

  success(message: string, duration = 4500): void { this.show('success', message, duration); }
  warning(message: string, duration = 5000): void { this.show('warning', message, duration); }
  error(message: string, duration = 6000): void { this.show('error', message, duration); }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    this.timers.delete(id);
    this.notifications.update((items) => items.filter((item) => item.id !== id));
  }

  pause(id: number): void {
    const item = this.notifications().find((candidate) => candidate.id === id);
    if (!item || !this.timers.has(id)) return;
    window.clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    const elapsed = Date.now() - item.startedAt;
    this.notifications.update((items) => items.map((candidate) =>
      candidate.id === id ? { ...candidate, remaining: Math.max(500, candidate.remaining - elapsed) } : candidate
    ));
  }

  resume(id: number): void {
    const item = this.notifications().find((candidate) => candidate.id === id);
    if (!item || this.timers.has(id)) return;
    this.notifications.update((items) => items.map((candidate) =>
      candidate.id === id ? { ...candidate, startedAt: Date.now() } : candidate
    ));
    this.timers.set(id, window.setTimeout(() => this.dismiss(id), item.remaining));
  }

  private show(kind: NotificationKind, message: string, duration: number): void {
    const id = this.nextId++;
    const item: AppNotification = { id, kind, message, remaining: duration, startedAt: Date.now() };
    this.notifications.update((items) => [...items, item]);
    this.timers.set(id, window.setTimeout(() => this.dismiss(id), duration));
  }
}
