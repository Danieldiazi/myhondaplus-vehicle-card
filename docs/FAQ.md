# Preguntas frecuentes

**Español** | [English](FAQ.en.md)

## ¿Esta tarjeta se conecta directamente a Honda?

No. Utiliza exclusivamente los dispositivos, entidades y servicios creados por [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant). La autenticación y la comunicación con Honda pertenecen a esa integración.

## ¿Por qué no aparece la batería, la climatización u otra función?

La tarjeta detecta capacidades mediante las entidades reales del dispositivo, nunca mediante una lista fija por modelo. Si la integración no publica una entidad compatible, la tarjeta oculta esa función.

Una entidad temporalmente `unknown` o `unavailable` es diferente de una capacidad inexistente: la primera puede mostrarse como **Sin datos**; la segunda se oculta.

## ¿Por qué no aparecen los estados de puertas o ventanas?

La versión `1.0.4` corrige la detección de las claves `doors_open` y `windows_open` de My Honda+ for Home Assistant, manteniendo los alias anteriores. Los identificadores estables permiten detectar estas entidades aunque se hayan renombrado en Home Assistant.

Comprueba que los sensores binarios correspondientes estén habilitados y asociados al vehículo seleccionado. Tras actualizar la tarjeta y recargar el navegador sin caché, utiliza **Volver a detectar integración y entidades** en el editor. En el diseño compacto, añade puertas y ventanas a los estados seleccionados si quieres mostrarlas; sus valores predeterminados son climatización y ubicación.

Si la integración no publica estos sensores, la tarjeta no puede mostrar esos estados. Si existen pero están temporalmente `unknown` o `unavailable`, se muestran como **Sin datos**.

## ¿Por qué mi modelo muestra el logotipo de Honda?

El Civic dispone de una ilustración específica. Los modelos sin un SVG específico utilizan el logotipo de Honda como fallback oficial. Esto no afecta a las métricas, estados ni controles detectados.

## ¿Qué diferencia hay entre las dos actualizaciones?

- **Actualizar datos guardados** consulta de nuevo la información disponible en la nube de Honda.
- **Actualizar desde el coche** solicita información nueva directamente al vehículo.

No todos los vehículos publican ambas entidades. La opción `confirm_refresh` protege cualquiera de las dos que aparezca.

## ¿Por qué no aparece un botón?

El control debe estar seleccionado y la integración debe publicar una entidad compatible para el vehículo. Utiliza **Volver a detectar integración y entidades** después de habilitar o añadir entidades.

## ¿Qué elementos son acciones y cuáles solo muestran información?

Los controles inferiores —abrir/cerrar, climatización, bocina y luces y actualizaciones— llaman a servicios de Home Assistant. Las métricas, el cierre superior, la fecha de actualización, los estados y la ubicación abren el diálogo nativo `more-info` con atributos e historial.

## ¿Por qué aparece un aviso de datos antiguos?

El dato de última actualización ha superado `stale_after`, seis horas de forma predeterminada. Con `warn_stale_actions: true`, la tarjeta pide confirmación antes de determinadas acciones remotas. El aviso no actualiza el vehículo por sí mismo.

## ¿Por qué la fecha es desconocida después de actualizar la nube?

`last_updated` registra una escritura en HA; el estado del sensor de fecha describe los datos del vehículo. Una actualización de la nube puede conservar esa fecha. Las fechas incorrectas, futuras o no disponibles no se presentan como recientes. Si no existe ese sensor, la estimación de actualización de HA no elimina el aviso de fecha desconocida.

## ¿Por qué se puede pulsar un botón desconocido pero no accionar un cierre desconocido?

Los botones pueden permanecer `unknown` hasta su primera pulsación. Un cierre en `unknown`, `unavailable`, `locking`, `unlocking` o `jammed` no permite determinar una acción segura y se desactiva.

## ¿Por qué el diseño compacto muestra menos estados?

Si se omite `statuses`, el diseño compacto incluye climatización y ubicación y el completo todos los estados detectados. Una lista explícita sustituye ese valor, incluida una lista vacía. Cambiar métricas o controles conserva los estados implícitos.

## ¿Cómo compruebo la versión instalada?

HACS muestra la versión instalada y la última disponible en la página del repositorio. Home Assistant también crea una entidad de actualización con los atributos `installed_version` y `latest_version`. La versión cargada se anuncia además en la consola del navegador.

## HACS muestra una versión nueva, pero no puede descargarla

Comprueba que la release tiene el asset `myhondaplus-vehicle-card.js`. Una etiqueta y los archivos ZIP/TAR del código fuente no bastan. Si falta el JavaScript, instala la versión más reciente que sí lo adjunte e informa del problema; recargar el navegador o reiniciar HA no crea el archivo ausente. El mantenedor debe seguir la [guía de recuperación](RELEASING.md#recuperación-ante-una-release-incorrecta) y publicar un parche completo.

## HACS no detecta inmediatamente una release nueva

La detección depende de la comprobación periódica de HACS. Puedes actualizar la información del repositorio, pero reiniciar Home Assistant no garantiza que la release aparezca antes. Cuando HACS la instale, recarga el navegador sin caché.

## La tarjeta sigue mostrando una versión anterior

1. Confirma en HACS que la versión nueva está instalada.
2. Comprueba que el recurso sea `/hacsfiles/myhondaplus-vehicle-card/myhondaplus-vehicle-card.js`.
3. Recarga sin caché con `Ctrl + F5`, `Ctrl + Mayús + R` o `Cmd + Mayús + R`.
4. Cierra por completo la aplicación móvil antes de abrirla de nuevo.
5. Comprueba en la consola qué versión ha registrado la tarjeta.

No añadas una segunda URL del recurso para resolver la caché; puede cargar dos versiones del mismo custom element.

## ¿Qué información puedo compartir en una incidencia?

Comparte la versión de Home Assistant, integración, tarjeta y navegador; YAML sin datos privados; diagnóstico anonimizado y mensajes de consola relevantes. No publiques VIN, coordenadas, matrículas, credenciales, tokens ni identificadores completos.

## ¿Dónde debo informar del problema?

- Autenticación, vehículo ausente o comunicación con Honda: repositorio de My Honda+ for Home Assistant.
- Entidad existente no detectada, editor, diseño, traducción o controles: este repositorio.
