# Contribuir

Gracias por mejorar My Honda+ Vehicle Card. Este documento resume el flujo de trabajo y los criterios de calidad del proyecto.

## Preparación

Requiere Node.js 24 o posterior.

```bash
npm ci
npx playwright install chromium
npm run check
npm run test:visual
```

## Flujo recomendado

1. Crea una rama desde `main`.
2. Mantén el cambio pequeño y centrado en un único objetivo.
3. Añade o actualiza tests cuando cambie el comportamiento.
4. Actualiza la documentación pública si cambia la configuración.
5. Ejecuta `npm run check` y, si afecta a la interfaz, `npm run test:visual`.
6. Comprueba que el bundle se genera correctamente; el workflow `Build distribution` actualizará `dist/` al integrar el cambio en `main`.
7. Abre un pull request explicando el problema, la solución y la validación realizada.

## Comandos

| Comando               | Propósito                                                                  |
| --------------------- | -------------------------------------------------------------------------- |
| `npm run dev`         | Recompila el bundle al detectar cambios                                    |
| `npm run format`      | Aplica Prettier                                                            |
| `npm run lint`        | Ejecuta ESLint                                                             |
| `npm run typecheck`   | Comprueba TypeScript estricto                                              |
| `npm test`            | Ejecuta Vitest                                                             |
| `npm run test:visual` | Ejecuta las pruebas visuales con Playwright                                |
| `npm run build`       | Genera el bundle HACS                                                      |
| `npm run check`       | Formato, ESLint, tipos, Vitest y build; Playwright se ejecuta por separado |

## Buenas prácticas

- Usa TypeScript estricto y evita `any` salvo que exista una justificación documentada.
- Mantén las funciones pequeñas y con una única responsabilidad.
- Extrae las reglas de detección a los resolvedores; no las mezcles con el renderizado.
- Prefiere nombres que expresen intención frente a comentarios que repitan el código.
- Documenta con TSDoc las funciones exportadas cuyo contrato no resulte evidente.
- No dependas de componentes internos no documentados de Home Assistant.
- Conserva compatibilidad con configuraciones YAML existentes.
- Toda opción nueva debe ser opcional o disponer de un valor en `DEFAULT_CONFIG`.
- Las acciones sensibles deben mantener confirmación o una protección equivalente.

## Tests

Cada corrección de un bug debería añadir un test que falle antes del cambio y pase después. Las reglas de detección deben probar coincidencias específicas, casos parecidos y fallback. Los cambios de interfaz deben cubrir, cuando proceda, tema claro y oscuro, anchura móvil y escritorio, y ausencia de solapamientos o desbordamiento horizontal.

## Commits y pull requests

Usa mensajes breves en modo imperativo, por ejemplo:

```text
fix: detect Honda e:Ny1 before Honda e
feat: add charging status indicator
docs: explain manual entity overrides
```

El pull request debe incluir:

- contexto del problema;
- comportamiento anterior y nuevo;
- pruebas realizadas;
- capturas cuando el cambio sea visual;
- posibles riesgos o limitaciones.

## Privacidad

No incluyas VIN, coordenadas, matrículas, tokens, correos ni otros datos privados en código, tests, logs, capturas o incidencias.

Consulta también [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) y la [guía de publicación](docs/RELEASING.md).

## Nuevas ilustraciones de vehículos

Hasta que exista una ilustración específica, el modelo debe utilizar el logotipo de Honda configurado como fallback oficial. Para proponer un SVG específico:

- usa una vista lateral y un `viewBox` ajustado al vehículo;
- conserva ruedas, cristales, luces y líneas separados del efecto de color;
- evita fuentes, imágenes enlazadas, scripts y recursos externos;
- optimiza el archivo sin alterar su geometría;
- documenta la procedencia y confirma que su licencia permite distribuirlo bajo las condiciones del proyecto;
- adjunta una captura de la tarjeta en tema claro y oscuro.

El SVG debe seguir siendo legible cuando el usuario desactive la sombra de color.

`npm run dev` recompila; no inicia un servidor web. Para explorar datos sintéticos, ejecuta `npm exec vite -- --host 127.0.0.1 --port 4173` y abre `http://127.0.0.1:4173/tests/visual/`. Las pruebas de navegador verifican comportamiento, disposición y desbordamiento; no comparan imágenes automáticamente. Adjunta capturas sintéticas claras y oscuras cuando cambie la interfaz.
