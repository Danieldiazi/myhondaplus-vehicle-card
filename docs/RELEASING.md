# Guía de publicación

**Español** | [English](RELEASING.en.md)

Esta guía describe el proceso seguro para publicar una versión de My Honda+ Vehicle Card sin distribuir un bundle antiguo.

**Crear una release manual en GitHub no actualiza la versión del proyecto ni genera el JavaScript para HACS.** Prepara primero el pull request de versión y activa después el workflow **Release** siguiendo esta guía. Una etiqueta o una release sin el asset `myhondaplus-vehicle-card.js` no completa la publicación.

## 1. Elegir la versión

El proyecto sigue Semantic Versioning:

- parche para correcciones compatibles;
- menor para funciones nuevas compatibles;
- mayor para cambios incompatibles.

No reutilices una etiqueta publicada ni prepares una release manual desde un commit antiguo.

## 2. Preparar el pull request de versión

Crea una rama desde el último commit de `main` y actualiza conjuntamente:

- `package.json`;
- las dos apariciones de la versión del proyecto en `package-lock.json`;
- `CHANGELOG.md`, moviendo los cambios desde **Unreleased** a la nueva versión y fecha.

Comprueba que los tres archivos contienen exactamente la misma versión.

## 3. Validar antes de integrar

Ejecuta:

```bash
npm ci
npm run audit:prod
npm run check
npx playwright install chromium
npm run test:visual
```

Abre el pull request y no lo integres hasta que **CI**, **Validate** y **HACS** estén en verde y no queden comentarios de revisión accionables.

## 4. Esperar al bundle de `main`

Después del merge, el workflow **Build distribution** debe crear un commit posterior:

```text
Build dashboard distribution [skip ci]
```

La release debe partir de ese commit, no del merge anterior. Comprueba que el diff de `dist/myhondaplus-vehicle-card.js` contiene la versión nueva en el valor inyectado por Vite.

## 5. Activar la publicación

Crea `publish/vX.Y.Z` desde el commit final de distribución. Cuando se utiliza la conexión de GitHub, la mera creación de la referencia puede no producir un evento `push`; crea en esa rama el marcador:

```text
.release/vX.Y.Z
```

Incluye en él el SHA del commit de distribución. Ese commit activa el workflow **Release** sin modificar `main` ni el bundle.

El workflow:

1. deriva la etiqueta desde el nombre de la rama;
2. verifica que la etiqueta y `package.json` coincidan;
3. ejecuta `npm ci`, auditoría, comprobaciones, build y pruebas de navegador en Chromium;
4. crea la etiqueta y la GitHub Release;
5. adjunta `dist/myhondaplus-vehicle-card.js`.

## 6. Verificación posterior

No anuncies la release hasta comprobar:

- existe `vX.Y.Z`;
- la GitHub Release está publicada;
- el JavaScript aparece como asset;
- `package.json` bajo la etiqueta contiene la versión correcta;
- el bundle generado identifica esa misma versión;
- HACS puede ofrecerla como `latest_version` tras su comprobación periódica.

La aparición en HACS puede demorarse. Reiniciar Home Assistant no fuerza esa comprobación.

## Recuperación ante una release incorrecta

No sobrescribas silenciosamente una release ni muevas una etiqueta ya consumida. Corrige la causa, incrementa el parche y publica un nuevo artefacto desde el último commit válido de distribución.

Si una release distribuyó código antiguo, carece del asset JavaScript o etiqueta un paquete con una versión diferente:

1. identifica el último commit correcto de `main`;
2. sincroniza metadatos en un nuevo parche;
3. espera al nuevo commit de distribución;
4. verifica la versión interna;
5. publica una nueva etiqueta.

## Lista de control

- [ ] Versión SemVer elegida.
- [ ] Paquete, lockfile y changelog sincronizados.
- [ ] CI, Validate y HACS en verde.
- [ ] Bundle regenerado después del merge.
- [ ] Versión interna del bundle comprobada.
- [ ] Rama `publish/vX.Y.Z` creada desde el commit correcto.
- [ ] Etiqueta, release y asset comprobados.
- [ ] HACS detecta la versión o queda pendiente de su ciclo periódico.
