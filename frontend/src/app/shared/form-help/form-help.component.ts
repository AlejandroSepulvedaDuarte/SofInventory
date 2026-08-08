import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  FormHelpContent,
  FormHelpOperation,
  resolveFormHelpText,
} from './form-help-content';


@Component({
  selector: 'app-form-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './form-help.component.html',
  styleUrl: './form-help.component.css',
})
export class FormHelpComponent implements AfterViewInit, OnDestroy {
  readonly content = input.required<FormHelpContent>();
  readonly panelId = input.required<string>();
  readonly operation = input<FormHelpOperation>('create');
  readonly isOpen = signal(false);

  @ViewChild('helpButton') private helpButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('closeButton') private closeButton?: ElementRef<HTMLButtonElement>;

  readonly title = computed(() =>
    resolveFormHelpText(this.content().title, this.operation())
  );
  readonly purpose = computed(() =>
    resolveFormHelpText(this.content().purpose, this.operation())
  );
  readonly titleId = computed(() => `${this.panelId()}-title`);
  readonly buttonLabel = computed(() => {
    const title = this.title();
    return `Abrir ${title.charAt(0).toLocaleLowerCase('es-CO')}${title.slice(1)}`;
  });

  private readonly keydownHandler = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.isOpen()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.closeHelp();
  };

  ngAfterViewInit(): void {
    document.addEventListener('keydown', this.keydownHandler, true);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.keydownHandler, true);
  }

  openHelp(): void {
    if (this.isOpen()) return;
    this.isOpen.set(true);
    window.setTimeout(() => this.closeButton?.nativeElement.focus());
  }

  closeHelp(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    window.setTimeout(() => this.helpButton?.nativeElement.focus());
  }
}
