import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';


const frontendRoot = new URL('../', import.meta.url);

function read(relativePath) {
  return readFileSync(new URL(relativePath, frontendRoot), 'utf8');
}

const contentSource = read('src/app/shared/form-help/form-help-content.ts');
const contentOutput = ts.transpileModule(contentSource, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const contentModuleUrl = `data:text/javascript;base64,${Buffer.from(contentOutput).toString('base64')}`;
const { FORM_HELP_CONTENT, resolveFormHelpText } = await import(contentModuleUrl);

const componentTemplate = read('src/app/shared/form-help/form-help.component.html');
const componentSource = read('src/app/shared/form-help/form-help.component.ts');
const componentStyles = read('src/app/shared/form-help/form-help.component.css');

const formTemplates = [
  ['productos', 'product-form-help', true],
  ['categorias', 'category-form-help', false],
  ['clientes', 'client-form-help', true],
  ['proveedores', 'provider-form-help', true],
  ['usuarios', 'user-form-help', true],
  ['empresa', 'company-form-help', true],
  ['compras', 'purchase-form-help', false],
  ['ventas', 'sale-form-help', false],
  ['inventario', 'inventory-movement-form-help', false],
  ['inventario', 'warehouse-form-help', true],
];


test('centraliza ayuda específica y breve para todos los formularios reales', () => {
  assert.deepEqual(Object.keys(FORM_HELP_CONTENT), [
    'product',
    'category',
    'client',
    'provider',
    'user',
    'company',
    'warehouse',
    'purchase',
    'sale',
    'inventoryEntry',
    'inventoryExit',
    'inventoryTransfer',
  ]);

  for (const [key, help] of Object.entries(FORM_HELP_CONTENT)) {
    assert.ok(resolveFormHelpText(help.title, 'create'), `${key} debe tener título`);
    assert.ok(resolveFormHelpText(help.purpose, 'create'), `${key} debe tener objetivo`);
    assert.ok(help.recommendations.length >= 2 && help.recommendations.length <= 3);
    assert.ok(help.relationships.length >= 2 && help.relationships.length <= 2);
    assert.ok(help.checklist.length >= 2 && help.checklist.length <= 2);
  }
});

test('resuelve registrar y actualizar sin mezclar el modo de la operación', () => {
  const expected = {
    product: ['Ayuda para registrar un producto', 'Ayuda para actualizar un producto'],
    client: ['Ayuda para registrar un cliente', 'Ayuda para actualizar un cliente'],
    provider: ['Ayuda para registrar un proveedor', 'Ayuda para actualizar un proveedor'],
    user: ['Ayuda para registrar un usuario', 'Ayuda para actualizar un usuario'],
    warehouse: ['Ayuda para registrar un almacén', 'Ayuda para actualizar un almacén'],
    company: ['Ayuda para configurar la empresa', 'Ayuda para actualizar la empresa'],
  };

  for (const [key, [createTitle, editTitle]] of Object.entries(expected)) {
    assert.equal(resolveFormHelpText(FORM_HELP_CONTENT[key].title, 'create'), createTitle);
    assert.equal(resolveFormHelpText(FORM_HELP_CONTENT[key].title, 'edit'), editTitle);
  }
});

test('documenta las consecuencias operativas reales de compras, ventas y movimientos', () => {
  assert.match(FORM_HELP_CONTENT.purchase.relationships.join(' '), /incrementa las existencias/i);
  assert.match(FORM_HELP_CONTENT.purchase.relationships.join(' '), /actualiza el costo de compra y el IVA/i);
  assert.match(FORM_HELP_CONTENT.sale.relationships.join(' '), /descuenta existencias/i);
  assert.match(FORM_HELP_CONTENT.inventoryEntry.relationships.join(' '), /incrementa de inmediato/i);
  assert.match(FORM_HELP_CONTENT.inventoryExit.relationships.join(' '), /reduce de inmediato/i);
  assert.match(FORM_HELP_CONTENT.inventoryTransfer.relationships.join(' '), /origen.*destino/i);
});

test('el botón y el panel exponen la semántica accesible requerida', () => {
  assert.match(componentTemplate, /#helpButton\s+type="button"/);
  assert.match(componentTemplate, /fa-circle-question/);
  assert.match(componentTemplate, /form-help-trigger-label">Ayuda</);
  assert.match(componentTemplate, /\[attr\.aria-label\]="buttonLabel\(\)"/);
  assert.match(componentTemplate, /\[attr\.aria-expanded\]="isOpen\(\)"/);
  assert.match(componentTemplate, /\[attr\.aria-controls\]="panelId\(\)"/);
  assert.match(componentTemplate, /\[attr\.aria-labelledby\]="titleId\(\)"/);
  assert.match(componentTemplate, /aria-label="Cerrar ayuda"/);
  assert.match(componentTemplate, />\s*Cerrar ayuda\s*</);
  for (const heading of ['Objetivo', 'Recomendaciones generales', 'Relación con otros módulos', 'Antes de guardar']) {
    assert.ok(componentTemplate.includes(heading));
  }
});

test('Escape cierra solo la ayuda y devuelve el foco al disparador', () => {
  assert.match(componentSource, /document\.addEventListener\('keydown', this\.keydownHandler, true\)/);
  assert.match(componentSource, /event\.key !== 'Escape'/);
  assert.match(componentSource, /event\.stopImmediatePropagation\(\)/);
  assert.match(componentSource, /this\.closeHelp\(\)/);
  assert.match(componentSource, /this\.helpButton\?\.nativeElement\.focus\(\)/);
  assert.match(componentSource, /this\.closeButton\?\.nativeElement\.focus\(\)/);
});

test('abrir y cerrar ayuda mantiene el estado aislado y no usa red ni almacenamiento', () => {
  const sharedSources = `${componentSource}\n${contentSource}`;
  assert.doesNotMatch(sharedSources, /HttpClient|fetch\s*\(|localStorage|sessionStorage|document\.cookie/);
  assert.match(componentSource, /openHelp\(\): void \{[\s\S]*this\.isOpen\.set\(true\)/);
  assert.match(componentSource, /closeHelp\(\): void \{[\s\S]*this\.isOpen\.set\(false\)/);
  assert.doesNotMatch(componentSource, /@Output|output\s*\(/);
});

test('todos los formularios incorporan el componente y los editables enlazan su modo', () => {
  let helpCount = 0;
  for (const [page, panelId, hasEditMode] of formTemplates) {
    const template = read(`src/app/pages/${page}/${page}.component.html`);
    assert.ok(template.includes(`panelId="${panelId}"`), `${page} debe incluir ${panelId}`);
    if (hasEditMode) {
      const panelIndex = template.indexOf(`panelId="${panelId}"`);
      const context = template.slice(Math.max(0, panelIndex - 220), panelIndex + 80);
      assert.match(context, /\[operation\]=/);
      assert.match(context, /'edit'.*'create'/s);
    }
  }

  for (const page of new Set(formTemplates.map(([name]) => name))) {
    const template = read(`src/app/pages/${page}/${page}.component.html`);
    helpCount += (template.match(/<app-form-help\b/g) ?? []).length;
  }
  assert.equal(helpCount, 10);
});

test('el diseño muestra texto en escritorio, solo icono en móvil y usa variables de tema', () => {
  assert.match(componentStyles, /\.form-help-trigger-label/);
  assert.match(componentStyles, /@media \(max-width: 640px\)[\s\S]*\.form-help-trigger-label[\s\S]*clip: rect/);
  assert.match(componentStyles, /@media \(max-width: 768px\)[\s\S]*inset: auto 8px 8px/);
  assert.match(componentStyles, /overflow-y: auto/);
  assert.match(componentStyles, /z-index: 2200/);
  for (const variable of ['--bg-card', '--bg-elevated', '--text-primary', '--text-secondary', '--border', '--accent']) {
    assert.ok(componentStyles.includes(`var(${variable})`));
  }

  const globalStyles = read('src/styles.css');
  for (const theme of ['dark', 'light', 'blue']) {
    assert.ok(globalStyles.includes(`data-theme='${theme}'`));
  }
});

test('la ayuda general no copia restricciones ni ejemplos específicos de los campos', () => {
  for (const duplicatedDetail of [
    'máximo 2 MB',
    'entre 2 y 10 caracteres',
    'entre 6 y 10 dígitos',
    'solo puede contener letras',
    'REF-2026-A1',
    'Calle 10 # 25-30',
  ]) {
    assert.equal(contentSource.includes(duplicatedDetail), false, duplicatedDetail);
  }
});
