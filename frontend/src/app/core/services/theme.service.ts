import { Injectable, signal } from '@angular/core';

export type ThemeKey = 'light' | 'blue' | 'dark';

export interface ThemeOption {
  key: ThemeKey;
  label: string;
  icon: string;
}

const LS_THEME = 'sof_inventory_theme';

export const THEME_OPTIONS: ThemeOption[] = [
  { key: 'light', label: 'Claro', icon: 'fa-sun' },
  { key: 'blue', label: 'Azul', icon: 'fa-palette' },
  { key: 'dark', label: 'Oscuro', icon: 'fa-moon' },
];

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _current = signal<ThemeKey>('dark');

  readonly current = this._current.asReadonly();

  constructor() {
    this.apply(this.readSaved());
  }

  get options(): ThemeOption[] {
    return THEME_OPTIONS;
  }

  currentLabel(): string {
    return THEME_OPTIONS.find((o) => o.key === this._current())?.label ?? 'Oscuro';
  }

  currentIcon(): string {
    return THEME_OPTIONS.find((o) => o.key === this._current())?.icon ?? 'fa-moon';
  }

  apply(theme: ThemeKey): void {
    this._current.set(theme);
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(LS_THEME, theme);
    } catch {
      // almacenamiento no disponible (p. ej. modo privado)
    }
  }

  private readSaved(): ThemeKey {
    try {
      const saved = localStorage.getItem(LS_THEME) as ThemeKey | null;
      if (saved && THEME_OPTIONS.some((o) => o.key === saved)) {
        return saved;
      }
    } catch {
      // almacenamiento no disponible
    }
    return 'dark';
  }
}
