import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LayoutComponent } from '../../shared/components/layout.component';
import { InventarioService, ProductosService } from '../../core/services/api.services';
import { Almacen, Producto } from '../../core/models';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, LayoutComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.css'],  
})
export class InventarioComponent implements OnInit {
  tab = signal<'stock' | 'alertas' | 'almacenes' | 'movimiento'>('stock');
  stock = signal<any[]>([]);
  estadisticas = signal<any>(null);
  alertas = signal<any[]>([]);
  almacenes = signal<Almacen[]>([]);
  productos = signal<Producto[]>([]);

  showAlmacenModal = signal(false);
  editingAlmacen = signal<Almacen | null>(null);
  almacenSaving = signal(false);
  almacenForm: Partial<Almacen> = {};

  movForm: any = { producto_id: '', tipo: 'entrada', cantidad: 1, motivo: '' };
  movSaving = signal(false);
  movError = signal('');
  movSuccess = signal('');

  statsKeys = () => Object.keys(this.estadisticas() ?? {}).filter(k => typeof this.estadisticas()[k] === 'number');

  constructor(private svc: InventarioService, private prodSvc: ProductosService) {}

  ngOnInit(): void {
    this.loadStock();
    this.svc.estadisticas().subscribe(e => this.estadisticas.set(e));
    this.svc.alertas().subscribe(a => this.alertas.set(a));
    this.svc.listarAlmacenes().subscribe(a => this.almacenes.set(a));
    this.prodSvc.listar().subscribe(p => this.productos.set(p));
  }

  loadStock(): void { this.svc.listarStock().subscribe(s => this.stock.set(s)); }

  openAlmacenModal(a?: Almacen): void {
    this.editingAlmacen.set(a ?? null);
    this.almacenForm = a ? { ...a } : { nombre: '', descripcion: '', ubicacion: '' };
    this.showAlmacenModal.set(true);
  }

  closeAlmacenModal(): void { this.showAlmacenModal.set(false); }

  saveAlmacen(): void {
    this.almacenSaving.set(true);
    const req = this.editingAlmacen()
      ? this.svc.editarAlmacen(this.editingAlmacen()!.id!, this.almacenForm)
      : this.svc.crearAlmacen(this.almacenForm);
    req.subscribe({
      next: () => { this.svc.listarAlmacenes().subscribe(a => this.almacenes.set(a)); this.closeAlmacenModal(); this.almacenSaving.set(false); },
      error: () => this.almacenSaving.set(false),
    });
  }

  eliminarAlmacen(a: Almacen): void {
    if (!confirm(`¿Eliminar almacén "${a.nombre}"?`)) return;
    this.svc.eliminarAlmacen(a.id!).subscribe(() =>
      this.svc.listarAlmacenes().subscribe(al => this.almacenes.set(al))
    );
  }

  registrarMovimiento(): void {
    if (!this.movForm.producto_id || !this.movForm.cantidad) {
      this.movError.set('Completa todos los campos obligatorios.');
      return;
    }
    this.movSaving.set(true);
    this.movError.set('');
    this.movSuccess.set('');
    this.svc.movimientoRapido(this.movForm).subscribe({
      next: () => {
        this.movSuccess.set('Movimiento registrado correctamente.');
        this.movSaving.set(false);
        this.movForm = { producto_id: '', tipo: 'entrada', cantidad: 1, motivo: '' };
        this.loadStock();
      },
      error: (e) => { this.movError.set(e.error?.error ?? 'Error'); this.movSaving.set(false); },
    });
  }
}
/*
 * Pantalla de inventario.
 * Consolida stock, alertas, almacenes y movimientos rápidos dentro del módulo logístico.
 */
