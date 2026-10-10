# Guía de usuario

**Español** | [English](USER_GUIDE.en.md)

## Qué necesitas instalar

Esta tarjeta es la interfaz visual. No inicia sesión en Honda ni obtiene por sí misma los datos del vehículo.

Los datos proceden de la integración comunitaria [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant), que crea el dispositivo, las entidades y los servicios que utiliza la tarjeta.

El flujo es:

```text
Servicios de Honda
       ↓
My Honda+ for Home Assistant
       ↓
Dispositivos, entidades y servicios de Home Assistant
       ↓
My Honda+ Vehicle Card
```

## Requisitos

- Home Assistant con Lovelace.
- [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant) instalada, autenticada y funcionando.
- Al menos un dispositivo de vehículo con entidades disponibles.
- HACS recomendado para instalar y actualizar la tarjeta.

Antes de continuar, abre **Ajustes → Dispositivos y servicios** y verifica que la integración muestra el vehículo y sus entidades. Si el vehículo no aparece ahí, la tarjeta tampoco podrá encontrarlo.

## Instalación

### Instalar la integración

Sigue las instrucciones del repositorio [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant). Completa la autenticación y comprueba que Home Assistant recibe datos del vehículo.

### Instalar la tarjeta

1. Abre **HACS**.
2. Añade `https://github.com/Danieldiazi/myhondaplus-vehicle-card` como repositorio personalizado de tipo **Dashboard**.
3. Instala **My Honda+ Vehicle Card**.
4. Recarga completamente el navegador o la aplicación de Home Assistant.
5. Añade una tarjeta y selecciona **My Honda+ Vehicle Card**.

## Configuración desde el editor

El editor visual permite elegir el vehículo, el modelo, el color, el diseño y las métricas, estados y controles visibles. Los estados pueden reordenarse con los botones de subir y bajar. Si se mantiene la selección predeterminada, la tarjeta detecta automáticamente cuáles existen y oculta los no compatibles. En la mayoría de los casos no es necesario editar YAML.

Configuración mínima equivalente:

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO
```

## Configuraciones habituales

### Diseño compacto

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO
layout: compact
```

### Sin animaciones

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO
animate: false
```

### Imagen personalizada

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO
image_mode: custom
vehicle_image: /local/coches/mi-civic.png
```

### Estados visibles y orden

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO
statuses:
  - location
  - doors
  - windows
  - trunk
  - hood
  - lights
  - charging
  - climate
```

El editor permite cambiar esta lista sin editar YAML. Un estado seleccionado solo se muestra cuando la integración publica su entidad.

### Entidades manuales

La detección automática puede sobrescribirse para instalaciones con nombres o entidades especiales:

```yaml
type: custom:myhondaplus-vehicle-card
device: ID_DEL_DISPOSITIVO
entities:
  lock: lock.mi_honda
  range: sensor.mi_honda_autonomia
  battery: sensor.mi_honda_bateria
  refresh_cached: button.mi_honda_actualizar_guardados
  refresh: button.mi_honda_actualizar_desde_coche
```

## Actualizaciones de datos

La tarjeta puede mostrar dos acciones diferentes, siempre que la integración publique sus entidades:

- **Actualizar datos guardados** (`refresh_cached`): vuelve a consultar la información disponible en la nube de Honda.
- **Actualizar desde el coche** (`refresh`): solicita información nueva directamente al vehículo.

Algunos vehículos solo ofrecen una de ellas. La tarjeta oculta automáticamente la que no exista; no es necesario crearla ni configurarla manualmente.

## Seguridad

La opción `confirm_unlock` está activada de forma predeterminada. Al pulsar el control para desbloquear, la tarjeta solicita confirmación antes de llamar al servicio de Home Assistant.

```yaml
confirm_unlock: true
```

También pueden activarse confirmaciones independientes:

```yaml
confirm_climate: true
confirm_horn_lights: true
confirm_refresh: true
```

`confirm_refresh` se aplica tanto a **Actualizar datos guardados** como a **Actualizar desde el coche**. Cada acción utiliza un texto de confirmación específico.

No se recomienda desactivar la confirmación de apertura en paneles compartidos o accesibles desde una pared.

La tarjeta no recibe ni almacena las credenciales de Honda. La autenticación pertenece exclusivamente a la integración My Honda+ y a Home Assistant.

## Datos desactualizados

`stale_after` define cuántos segundos pueden transcurrir antes de marcar los datos como antiguos. El valor predeterminado es seis horas.

```yaml
stale_after: 21600
```

Este aviso no fuerza una actualización del vehículo; solo informa sobre la antigüedad del último dato disponible. Con `warn_stale_actions: true` —valor predeterminado— la tarjeta solicita confirmación antes de enviar una acción remota cuando los datos están marcados como antiguos.

## Resolución de problemas

### La tarjeta no aparece

- Confirma que el recurso está instalado en HACS.
- Recarga el navegador sin caché.
- Comprueba que el tipo sea `custom:myhondaplus-vehicle-card`.

### No se encuentra ningún vehículo

- Verifica primero que My Honda+ for Home Assistant haya creado un dispositivo en Home Assistant.
- Comprueba que sus entidades no estén deshabilitadas.
- Recarga la integración y vuelve a abrir el editor de la tarjeta.

### No aparece el vehículo ni existen entidades

Este problema pertenece normalmente a la integración de datos, no a la tarjeta. Revisa la autenticación, los registros y las incidencias de [My Honda+ for Home Assistant](https://github.com/enricobattocchi/myhondaplus-homeassistant).

### Home Assistant tiene la entidad, pero la tarjeta no la detecta

Este problema sí corresponde a la tarjeta:

- activa el diagnóstico anonimizado;
- configura temporalmente la entidad mediante `entities`;
- abre una incidencia en este repositorio sin incluir VIN, coordenadas, tokens ni estados privados.

### Falta una métrica o un estado

- Revisa si la integración expone esa entidad para tu modelo.
- Configura una entidad manual en `entities`.
- Abre una incidencia incluyendo nombres de entidades anonimizados.

### El modelo visual no es correcto

Selecciona manualmente `vehicle_model` en el editor o en YAML. La detección automática utiliza el nombre y el modelo del dispositivo, que pueden variar entre instalaciones.

### HACS no muestra una actualización

- Comprueba que exista una release publicada con un tag de versión.
- Actualiza la información de HACS o espera a su siguiente comprobación periódica.
- Reiniciar Home Assistant no obliga a HACS a detectar inmediatamente una release nueva.
- Cuando HACS ya haya instalado la actualización, recarga el navegador sin caché para cargar el nuevo JavaScript.

Consulta también las [preguntas frecuentes](FAQ.md).

## Dónde solicitar ayuda

| Problema                                                        | Repositorio adecuado         |
| --------------------------------------------------------------- | ---------------------------- |
| Inicio de sesión, autenticación o conexión con Honda            | My Honda+ for Home Assistant |
| El vehículo o todas sus entidades no aparecen en Home Assistant | My Honda+ for Home Assistant |
| Una entidad existente no se detecta correctamente               | My Honda+ Vehicle Card       |
| Diseño, traducción, editor o controles de la tarjeta            | My Honda+ Vehicle Card       |

Al abrir una incidencia sobre la tarjeta, incluye:

- versión de Home Assistant;
- versión de My Honda+ for Home Assistant;
- versión de la tarjeta;
- navegador o aplicación utilizada;
- configuración YAML sin datos privados;
- diagnóstico anonimizado;
- captura del error de la consola, cuando exista.

## Antigüedad, valores predeterminados y recuperación

El estado del sensor de fecha determina la antigüedad del vehículo; su escritura en HA no indica cuándo el coche suministró los datos. Las fechas incorrectas o no disponibles muestran **Sin fecha de actualización**. Si no existe ese sensor, cualquier estimación de HA se etiqueta expresamente. Con `warn_stale_actions: true`, las órdenes remotas requieren confirmación cuando los datos son antiguos o su fecha es desconocida.

Las métricas predeterminadas son autonomía, batería, kilometraje, distancia mensual y consumo medio. Los controles predeterminados son cierre, climatización, bocina/luces y actualización directa; la actualización de datos guardados es opcional. El diseño completo incluye todos los estados detectados; el compacto, climatización y ubicación. Las listas explícitas sustituyen esos valores, incluidas las listas vacías.

Un error detiene los reintentos automáticos. Utiliza el botón de reintento de la tarjeta o **Volver a detectar integración y entidades** en el editor. Los eventos de registro actualizan las capacidades cuando HA permite suscripciones. `debug: true` añade otro botón de detección y un diagnóstico que distingue entidades asignadas, presentes y disponibles. Un cierre desconocido o transitorio no se puede accionar; un botón nunca pulsado con estado `unknown` puede seguir disponible.

La instalación manual está en el [README](../README.es.md#instalación-manual-sin-hacs); el contrato completo, en [Configuración](CONFIGURATION.md).
