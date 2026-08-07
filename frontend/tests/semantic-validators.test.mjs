import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';


const sourceUrl = new URL(
  '../src/app/shared/forms/semantic-validators.ts',
  import.meta.url,
);
const source = readFileSync(sourceUrl, 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
const validators = await import(moduleUrl);


test('acepta nombres reales con tildes, ñ, apóstrofos y guiones', () => {
  for (const value of ['José Ignacio Botero', 'María-José Muñoz', "D'Angelo Pérez"]) {
    assert.equal(validators.personNameError(value, 'nombre_completo'), '');
  }
});

test('rechaza números, mezclas numéricas, signos solos y espacios en nombres', () => {
  for (const value of ['54666656666', 'Juan123', '555Pedro', "---''", '   ']) {
    assert.notEqual(validators.personNameError(value, 'nombres'), '');
  }
});

test('valida lugares sin bloquear nombres compuestos', () => {
  for (const value of ['Colombia', 'Antioquia', 'El Carmen de Viboral', 'San Andrés y Providencia']) {
    assert.equal(validators.placeNameError(value, 'ciudad'), '');
  }
  for (const value of ['444444', 'Colombia123', 'Ciudad 55']) {
    assert.match(validators.placeNameError(value, 'ciudad'), /números/);
  }
});

test('valida el cargo del contacto como texto humano', () => {
  for (const value of ['Gerente comercial', 'Jefe de compras', 'Técnico-administrativo']) {
    assert.equal(validators.jobTitleError(value), '');
  }
  for (const value of ['555555', 'Gerente123']) {
    assert.match(validators.jobTitleError(value), /números/);
  }
});

test('acepta nombres comerciales alfanuméricos y rechaza valores numéricos', () => {
  for (const value of ['Cemento Tipo 1', 'Aceite 3 en 1', 'WD-40', '3M', 'Alcohol 70%']) {
    assert.equal(validators.commercialNameError(value, 'producto'), '');
  }
  assert.equal(validators.commercialNameError('Químicos 2K', 'categoria'), '');
  assert.equal(validators.commercialNameError('Distribuciones 24 Horas S.A.S.', 'razon_social'), '');
  assert.equal(validators.commercialNameError('Bodega Norte 2', 'almacen'), '');
  assert.match(validators.commercialNameError('44444444', 'producto'), /letra/);
  assert.match(validators.commercialNameError('7777777', 'categoria'), /números/);
  assert.match(validators.commercialNameError('123456', 'almacen'), /letra/);
  assert.notEqual(validators.commercialNameError('   ', 'razon_social'), '');
});

test('aplica documentos por tipo sin bloquear pasaportes o NIT', () => {
  assert.equal(validators.documentNumberError('1020304050', 'CC'), '');
  assert.notEqual(validators.documentNumberError('ABC123', 'CC'), '');
  assert.equal(validators.documentNumberError('AB123456', 'PA'), '');
  assert.equal(validators.documentNumberError('900123456-7', 'NIT'), '');
});

test('mantiene las excepciones alfanuméricas y normaliza espacios con seguridad', () => {
  assert.equal(validators.usernameError('alejo.dev_2026'), '');
  assert.notEqual(validators.usernameError('alejo dev'), '');
  assert.equal(validators.normalizeSemanticText('  María   José  '), 'María José');
  assert.equal(validators.normalizeSemanticText('REF-2026-A1'), 'REF-2026-A1');
  assert.equal(validators.normalizeSemanticText('Calle 10 # 25-30'), 'Calle 10 # 25-30');
});
