import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';


function transpile(sourceUrl) {
  const source = readFileSync(sourceUrl, 'utf8');
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText;
}

const semanticSourceUrl = new URL(
  '../src/app/shared/forms/semantic-validators.ts',
  import.meta.url,
);
const semanticOutput = transpile(semanticSourceUrl);
const semanticModuleUrl = `data:text/javascript;base64,${Buffer.from(semanticOutput).toString('base64')}`;

const locationSourceUrl = new URL(
  '../src/app/shared/locations/location-form.ts',
  import.meta.url,
);
const locationOutput = transpile(locationSourceUrl).replace(
  /(['"])\.\.\/forms\/semantic-validators\1/,
  JSON.stringify(semanticModuleUrl),
);
const locationModuleUrl = `data:text/javascript;base64,${Buffer.from(locationOutput).toString('base64')}`;
const locations = await import(locationModuleUrl);

const catalog = JSON.parse(
  readFileSync(
    new URL('../../backend/catalogos/data/colombia.json', import.meta.url),
    'utf8',
  ),
);


test('Colombia es el valor predeterminado y la ciudad inicia deshabilitada', () => {
  const initial = locations.switchLocationMode('colombia');
  assert.deepEqual(initial, { pais: 'Colombia', departamento: '', ciudad: '' });
  assert.equal(locations.locationModeFor(initial), 'colombia');
  assert.equal(locations.isCitySelectorDisabled(initial, false, ''), true);
});

test('el catálogo compartido contiene 33 territorios y Bogotá D. C.', () => {
  assert.equal(catalog.department_count, 33);
  assert.equal(catalog.municipality_count, 1122);
  assert.equal(catalog.departments.length, 33);
  const bogota = catalog.departments.find((department) => department.code === '11');
  assert.equal(bogota.name, 'Bogotá D. C.');
  assert.deepEqual(bogota.municipalities, [{ code: '11001', name: 'Bogotá D. C.' }]);
});

test('carga únicamente municipios del departamento y limpia la ciudad al cambiarlo', () => {
  const antioquia = locations.findDepartment(catalog, 'Antioquia');
  assert.ok(antioquia.municipalities.some((municipality) => municipality.name === 'Medellín'));
  assert.equal(antioquia.municipalities.some((municipality) => municipality.name === 'Cali'), false);

  const changed = locations.changeLocationDepartment(
    { pais: 'Colombia', departamento: 'Antioquia', ciudad: 'Medellín' },
    'Valle del Cauca',
  );
  assert.equal(changed.ciudad, '');
  assert.equal(locations.isCitySelectorDisabled(changed, false, ''), false);
});

test('rechaza una ciudad que no pertenece al departamento seleccionado', () => {
  const errors = locations.validateLocationValue(
    { pais: 'Colombia', departamento: 'Antioquia', ciudad: 'Cali' },
    'colombia',
    catalog,
  );
  assert.match(errors.ciudad, /no pertenece/);
});

test('otro país usa campos manuales y ambos cambios de modo limpian valores ocultos', () => {
  const foreign = locations.switchLocationMode('foreign');
  assert.deepEqual(foreign, { pais: '', departamento: '', ciudad: '' });
  const colombia = locations.switchLocationMode('colombia');
  assert.deepEqual(colombia, { pais: 'Colombia', departamento: '', ciudad: '' });
});

test('valida y normaliza ubicaciones extranjeras con mensajes en español', () => {
  const valid = locations.validateLocationValue(
    { pais: 'México', departamento: 'Nuevo León', ciudad: 'San Nicolás' },
    'foreign',
    catalog,
  );
  assert.deepEqual(valid, {});

  const invalid = locations.validateLocationValue(
    { pais: '555', departamento: '   ', ciudad: 'Ciudad 77' },
    'foreign',
    catalog,
  );
  assert.match(invalid.pais, /números/);
  assert.match(invalid.departamento, /espacios/);
  assert.match(invalid.ciudad, /números/);
});

test('reconoce variantes antiguas y conserva un valor legacy sin coincidencia', () => {
  assert.deepEqual(
    locations.reconcileCatalogLocation(
      { pais: ' colombia ', departamento: 'bogota dc', ciudad: 'Bogota' },
      catalog,
    ),
    { pais: 'Colombia', departamento: 'Bogotá D. C.', ciudad: 'Bogotá D. C.' },
  );

  const legacy = { pais: 'Colombia', departamento: 'Cundinamarca', ciudad: 'Bogota' };
  assert.deepEqual(
    locations.validateLocationValue(legacy, 'colombia', catalog, '', legacy, true),
    {},
  );
});

test('cada código municipal pertenece al departamento que lo contiene', () => {
  for (const department of catalog.departments) {
    for (const municipality of department.municipalities) {
      assert.equal(municipality.code.slice(0, 2), department.code);
      assert.ok(municipality.name.trim());
    }
  }
});
