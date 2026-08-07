import { Directive, ElementRef, Input, OnChanges, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appFieldValidation]',
  standalone: true,
})
export class FieldValidationDirective implements OnChanges {
  @Input('appFieldValidation') message = '';
  @Input() validationMessageId = '';

  constructor(private element: ElementRef<HTMLElement>, private renderer: Renderer2) {}

  ngOnChanges(): void {
    const control = this.element.nativeElement;
    if (this.message) {
      this.renderer.addClass(control, 'is-invalid');
      this.renderer.setAttribute(control, 'aria-invalid', 'true');
      if (this.validationMessageId) this.renderer.setAttribute(control, 'aria-describedby', this.validationMessageId);
      return;
    }
    this.renderer.removeClass(control, 'is-invalid');
    this.renderer.removeAttribute(control, 'aria-invalid');
    if (this.validationMessageId) this.renderer.removeAttribute(control, 'aria-describedby');
  }
}
