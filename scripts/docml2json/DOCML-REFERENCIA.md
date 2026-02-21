# Referencia del Metalenguaje .docml

## Descripcion General

El formato `.docml` es un metalenguaje de texto plano para definir plantillas de documentos compatibles con **doc-assembly**. El script `docml2json.py` convierte archivos `.docml` a JSON valido del formato **PortableDocument v1.1.0**, listo para importar en el editor.

### Ventajas

- Un archivo `.docml` de ~40 lineas reemplaza ~500-1400 lineas de JSON
- Sintaxis legible, similar a Markdown
- IDs generados automaticamente (UUID5 estable y reproducible)
- Variables extraidas automaticamente del contenido
- Validacion contra el schema del editor

---

## Estructura del Archivo

Todo archivo `.docml` se divide en **4 secciones** obligatorias, separadas por marcadores `---seccion---`:

```
---meta---
(metadatos del documento)

---roles---
(roles de firmantes)

---workflow---
(configuracion del flujo de firma)

---content---
(contenido del documento)
```

---

## Seccion: meta

Define los metadatos del documento y la configuracion de pagina.

### Campos

| Campo         | Obligatorio | Descripcion                          | Ejemplo            |
|---------------|:-----------:|--------------------------------------|-------------------|
| `title`       | si          | Titulo del documento                 | `Comprobante de Matricula` |
| `description` | si          | Descripcion breve                    | `Acredita la formalizacion...` |
| `language`    | si          | Codigo de idioma (ISO 639-1)         | `es`              |
| `page`        | si          | Formato de pagina                    | `LETTER`          |
| `margins`     | no          | Margenes en px (valor unico, aplica a los 4 lados) | `72` |

### Formatos de pagina validos

| Formato   | Ancho (px) | Alto (px) |
|-----------|:----------:|:---------:|
| `LETTER`  | 816        | 1056      |
| `LEGAL`   | 816        | 1344      |
| `A4`      | 794        | 1123      |

### Ejemplo

```
---meta---
title: Comprobante de Matricula
description: Acredita la formalizacion de la matricula
language: es
page: LETTER
margins: 72
```

---

## Seccion: roles

Define los roles de firmantes del documento. Cada linea declara un rol.

### Formato

```
ref_id: Etiqueta visible [order:N]
```

| Parte       | Descripcion                                              |
|-------------|----------------------------------------------------------|
| `ref_id`    | Identificador interno (sin espacios, minusculas). Se usa para referenciar el rol en checkboxes y firmas |
| `Etiqueta`  | Nombre visible del rol en el documento                   |
| `[order:N]` | Orden de firma (1 = primer firmante)                     |

### Ejemplo

```
---roles---
apoderado: Apoderado/a [order:1]
secretario: Secretario/a [order:2]
director: Director/a [order:3]
```

### Generacion de IDs

El `id` UUID de cada rol se genera automaticamente con `uuid5(NAMESPACE_URL, ref_id)`, lo que garantiza que:
- El mismo `ref_id` siempre produce el mismo UUID
- Los IDs son estables entre ejecuciones del script

---

## Seccion: workflow

Configura el flujo de firma electronica.

### Campos

| Campo  | Valores posibles       | Descripcion                              |
|--------|----------------------|------------------------------------------|
| `mode` | `sequential`, `parallel` | Orden de firma entre roles              |

### Ejemplo

```
---workflow---
mode: sequential
```

Con `sequential`, cada firmante recibe la notificacion solo cuando el anterior ha firmado. Con `parallel`, todos pueden firmar simultaneamente.

---

## Seccion: content

Contiene el cuerpo del documento usando una sintaxis similar a Markdown con extensiones especificas para doc-assembly.

---

### Texto y Parrafos

Cada linea de texto se convierte en un parrafo (`paragraph`). Las lineas vacias generan parrafos separadores (spacer).

```
Este es un parrafo normal.

Este es otro parrafo, separado por una linea vacia.
```

---

### Formato de texto (Marks)

| Sintaxis       | Resultado    | Ejemplo                           |
|---------------|-------------|-----------------------------------|
| `**texto**`   | **Negrita**  | `**TITULO DEL DOCUMENTO**`       |
| `*texto*`     | *Cursiva*    | `*ver condiciones adjuntas*`     |
| `__texto__`   | Subrayado    | `__clausula importante__`        |

Los formatos se pueden combinar y anidar:

```
**Este texto es negrita y *tambien cursiva* dentro**
```

---

### Alineacion de parrafos

Se usa un prefijo `@alineacion` al inicio de la linea:

| Prefijo      | Alineacion                |
|-------------|--------------------------|
| `@center`   | Centrado                  |
| `@right`    | Alineado a la derecha     |
| `@justify`  | Justificado               |
| (ninguno)   | Alineado a la izquierda (por defecto) |

```
@center **TITULO CENTRADO**
@right Santiago, [today|Fecha]
@justify Este parrafo largo estara justificado en ambos margenes...
```

**Nota:** El prefijo de alineacion se aplica a toda la linea. Si una linea empieza con `@center`, todo su contenido (texto, negrita, variables) se centra.

---

### Variables (Injectors)

Las variables se insertan inline usando corchetes:

```
[variable_id|Etiqueta visible]
```

| Parte           | Descripcion                                              |
|-----------------|----------------------------------------------------------|
| `variable_id`   | Codigo de la variable (ej: `student_first_name`)        |
| `Etiqueta`      | Texto visible en el editor cuando no hay valor           |

#### Con tipo explicito

Por defecto el tipo es `TEXT`. Para especificar otro tipo:

```
[variable_id|Etiqueta|TIPO]
```

Tipos validos: `TEXT`, `DATE`, `NUMBER`

#### Ejemplos

```
Yo, [legalguardian_first_name|Primer Nombre] [legalguardian_first_last_name|Primer Apellido], RUT [legalguardian_id_number|RUT Apoderado/a], declaro:
```

```
**Fecha de firma electronica:** [today|Fecha de Firma]
```

**Nota:** Las variables usadas se extraen automaticamente para poblar el campo `variableIds` del JSON. No es necesario declararlas en otra parte.

---

### Encabezados (Headings)

| Sintaxis     | Nivel |
|-------------|:-----:|
| `# Texto`   | 1     |
| `## Texto`  | 2     |
| `### Texto` | 3     |

```
# Titulo Principal
## Subtitulo
### Seccion menor
```

Los encabezados soportan formato inline (negrita, variables, etc.).

---

### Listas

#### Lista con vinetas (bulletList)

```
- Primer elemento
- Segundo elemento
- Tercer elemento
```

#### Lista numerada (orderedList)

```
1. Primer paso
2. Segundo paso
3. Tercer paso
```

Los items de lista soportan formato inline (negrita, cursiva, variables).

**Nota:** Las listas consecutivas se agrupan automaticamente. Una linea vacia entre listas crea listas separadas.

---

### Tablas

Las tablas se definen usando sintaxis de pipes. La **primera fila** se interpreta como encabezado (`tableHeader`), las siguientes como datos (`tableCell`).

#### Formato

```
| Encabezado 1 | Encabezado 2 | Encabezado 3 |
| Celda 1      | Celda 2      | Celda 3      |
| Celda 4      | Celda 5      | Celda 6      |
```

#### Reglas

- Cada fila debe empezar y terminar con `|`
- Las celdas se separan con `|`
- Las celdas soportan formato inline: negrita, cursiva, subrayado y variables
- El `|` dentro de variables `[var_id|Label]` se respeta correctamente (no se confunde con delimitador de columna)
- Las filas de tabla deben ser consecutivas (una linea vacia rompe la tabla)

#### Ejemplo con variables

```
| Dato | Valor |
| Nombre Completo | [student_first_name|Nombre] [student_first_last_name|Apellido] |
| RUT | [student_id_number|RUT Estudiante] |
| Curso | [grade_name|Curso] |
```

#### Ejemplo con formato

```
| Concepto | Descripcion | Estado |
| **Matricula** | Proceso de inscripcion formal | *Pendiente* |
| **Mensualidad** | Pago mensual del servicio | __Activo__ |
```

#### Estructura JSON generada

Las celdas usan `content: inline*` (contenido inline directo, sin wrapper de paragraph), conforme a la extension `TableCellExtension` del editor:

```
table → tableRow → tableHeader (fila 1) / tableCell (filas 2+) → inline nodes
```

---

### Linea horizontal

Una linea con exactamente `---` (tres guiones) genera un `horizontalRule`:

```
Texto antes de la linea.
---
Texto despues de la linea.
```

**Importante:** No confundir con los marcadores de seccion (`---meta---`, `---roles---`, etc.) que tienen texto adicional.

---

### Salto de pagina

Una linea con exactamente `===` genera un `pageBreak`:

```
Contenido de la primera pagina.
===
Contenido de la segunda pagina.
```

---

### Checkbox (InteractiveField)

Crea un campo interactivo de seleccion vinculado a un rol de firmante.

#### Formato

```
@checkbox(rol_ref) Etiqueta del campo
  | Texto de la opcion 1
  | Texto de la opcion 2
  | Texto de la opcion N
```

| Parte          | Descripcion                                              |
|----------------|----------------------------------------------------------|
| `rol_ref`      | Referencia al rol definido en `---roles---`              |
| `Etiqueta`     | Nombre del campo (ej: "Autorizacion Clases de Religion") |
| `\| Opcion`    | Cada opcion del checkbox (indentada con 2 espacios)      |

#### Opciones adicionales

Por defecto: `required: true`, `optionsLayout: "vertical"`. Para modificar:

```
@checkbox(apoderado, required:false, layout:inline) Preferencias
  | Opcion A
  | Opcion B
```

#### Ejemplo

```
@checkbox(apoderado) Autorizacion Clases de Religion
  | AUTORIZO a mi pupilo/a a participar en clases de Religion
  | NO AUTORIZO a mi pupilo/a a participar en clases de Religion
```

Esto genera un `interactiveField` con `fieldType: "checkbox"`, vinculado al rol `apoderado`.

---

### Firma (Signature)

Crea un bloque de firma electronica.

#### Formato

```
@signature(layout, ancho_linea)
  | rol_ref: Etiqueta de firma | Subtitulo
```

| Parte           | Descripcion                                     |
|-----------------|------------------------------------------------|
| `layout`        | Disposicion de las firmas (ver tabla abajo)     |
| `ancho_linea`   | Ancho de la linea de firma: `sm`, `md`, `lg`   |
| `rol_ref`       | Referencia al rol de `---roles---`              |
| `Etiqueta`      | Texto sobre la linea de firma                   |
| `Subtitulo`     | Texto bajo la linea (cargo o rol del firmante)  |

#### Layouts disponibles

| Cantidad | Layouts validos                                                |
|:--------:|---------------------------------------------------------------|
| 1 firma  | `single-left`, `single-center`, `single-right`               |
| 2 firmas | `dual-sides`, `dual-center`, `dual-left`, `dual-right`       |
| 3 firmas | `triple-row`, `triple-pyramid`, `triple-inverted`            |
| 4 firmas | `quad-grid`, `quad-top-heavy`, `quad-bottom-heavy`           |

La cantidad de firmas se determina automaticamente por el numero de lineas `| rol_ref:`.

#### Ejemplos

**Una firma centrada:**
```
@signature(single-center, md)
  | apoderado: Firma Apoderado/a | Apoderado/a
```

**Dos firmas a los lados:**
```
@signature(dual-sides, md)
  | director: Firma Director/a | Director/a
  | apoderado: Firma Apoderado/a | Apoderado/a
```

**Tres firmas en fila:**
```
@signature(triple-row, sm)
  | director: Director/a | Director/a
  | secretario: Secretario/a | Secretario/a
  | apoderado: Apoderado/a | Apoderado/a
```

---

## Ejemplo Completo

```
---meta---
title: Autorizacion Clases de Religion
description: Autorizacion o rechazo de participacion en clases de Religion
language: es
page: LETTER
margins: 72

---roles---
apoderado: Apoderado/a [order:1]

---workflow---
mode: sequential

---content---
@center [campus_name|Nombre Establecimiento]
@center **AUTORIZACION CLASES DE RELIGION**
@center **ANO ACADEMICO [academic_period_year|Ano Academico]**

Segun lo dispuesto en el Decreto Supremo N 924/1983 del Ministerio de Educacion, todos los establecimientos educacionales del pais deben ofrecer clases de Religion con caracter optativo para los alumnos y sus familias.

En conformidad con lo anterior, yo, [legalguardian_first_name|Primer Nombre Apoderado/a] [legalguardian_first_last_name|Primer Apellido Apoderado/a] [legalguardian_second_last_name|Segundo Apellido Apoderado/a], RUT [legalguardian_id_number|RUT Apoderado/a], Apoderado/a del/la estudiante [student_first_name|Primer Nombre Estudiante] [student_first_last_name|Primer Apellido Estudiante] [student_second_last_name|Segundo Apellido Estudiante], RUT [student_id_number|RUT Estudiante], curso [grade_name|Curso], declaro lo siguiente:

**DECISION RESPECTO A CLASES DE RELIGION**

@checkbox(apoderado) Autorizacion Clases de Religion
  | AUTORIZO a mi pupilo/a a participar en clases de Religion ofrecidas por el establecimiento
  | NO AUTORIZO a mi pupilo/a a participar en clases de Religion. Entiendo que el establecimiento dispondra las medidas pertinentes durante dicha asignatura

@signature(single-center, md)
  | apoderado: Firma Apoderado/a | Apoderado/a

**FIRMA ELECTRONICA**
Este documento es suscrito mediante firma electronica simple o avanzada, conforme a la Ley N 19.799 sobre Documentos Electronicos, Firma Electronica y Servicios de Certificacion. La firma tiene plena validez y efectos juridicos equivalentes a la firma manuscrita.

**Fecha de firma electronica:** [today|Fecha de Firma]
```

---

## Uso del Script

### Conversion individual

```bash
python3 docml2json.py mi-plantilla.docml
# Genera: mi-plantilla.json
```

### Con nombre de salida

```bash
python3 docml2json.py mi-plantilla.docml -o salida.json
```

### Conversion por lotes

```bash
python3 docml2json.py *.docml
# Genera un .json por cada .docml
```

---

## Valores Auto-generados

El script genera automaticamente los siguientes valores sin intervencion del usuario:

| Campo                     | Logica de generacion                                     |
|--------------------------|----------------------------------------------------------|
| `variableIds`            | Extraidos de todos los `[var_id\|...]` usados en el contenido |
| `signerRoles[].id`       | `uuid5(NAMESPACE_URL, ref_id)` — estable y reproducible  |
| `signature[].id`         | `uuid5` basado en rol + etiqueta                         |
| `interactiveField.id`    | `uuid5` basado en etiqueta del campo                     |
| `interactiveField.options[].id` | `uuid5` basado en etiqueta de opcion              |
| `exportInfo.exportedAt`  | Fecha/hora actual en formato `YYYY-MM-DDTHH:mm:ss.000Z` |
| `exportInfo.sourceApp`   | `"doc-assembly-web/1.1.0"`                               |
| `pageConfig.width/height`| Derivados del formato de pagina                          |

---

## Referencia Rapida

```
SECCIONES         ---meta--- / ---roles--- / ---workflow--- / ---content---
PARRAFO           Texto plano (una linea = un parrafo)
SEPARADOR         (linea vacia)
NEGRITA           **texto**
CURSIVA           *texto*
SUBRAYADO         __texto__
VARIABLE          [var_id|Etiqueta]     o   [var_id|Etiqueta|TIPO]
ALINEACION        @center / @right / @justify  (prefijo de linea)
ENCABEZADO        # / ## / ###
LISTA VINETAS     - item
LISTA NUMERADA    1. item
TABLA             | Col1 | Col2 |  (primera fila = header, resto = data)
LINEA HORIZONTAL  ---
SALTO DE PAGINA   ===
CHECKBOX          @checkbox(rol) Label  +  lineas  | Opcion
FIRMA             @signature(layout, ancho)  +  lineas  | rol: Label | Subtitle
```
