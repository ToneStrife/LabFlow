# Cómo funciona LabFlow

Guía visual del flujo de compra (con tu cuenta de Admin).  
App: [https://tonestrife.github.io/LabFlow/](https://tonestrife.github.io/LabFlow/)

Hay un mini-vídeo resumen (slideshow de pantallas reales):  
[`tutorial_flujo_labflow_carlos.mp4`](assets/tutorial_flujo_labflow_carlos.mp4) — también en los artefactos del agente.

---

## 1. Panel de Control

<img src="assets/tutorial_01_panel.png" alt="Panel de Control" width="900" />

Aquí empieza casi todo:

- **Tarjetas de fase**: Por aprobar → Presupuestos → PO pendientes → Por recibir → Sin facturar  
- **Sede activa** (CIBM / Farmacia / Todas) filtra lo que ves  
- **+ Nueva solicitud** (cabecera)  
- Tabla **Artículos pendientes** con botón **Recibir** por fila  

---

## 2. Nueva solicitud

<img src="assets/tutorial_04_nueva_solicitud.png" alt="Nueva solicitud" width="900" />

Formulario: proveedor, proyecto(s), dirección, líneas de producto y adjuntos.  
Al guardar entra en **Pending** (*Por aprobar*). Si subes cotización al crear, **sigue Pending** hasta que apruebe el IP o un Admin.

---

## 3. Detalle de solicitud (el corazón del flujo)

<img src="assets/tutorial_03_solicitud_archivos.png" alt="Detalle con cotización, PO y albaranes" width="900" />

### Dónde se suben las cosas

| Qué | Dónde en la ficha |
| --- | --- |
| **Cotización** | Panel derecho → *Archivos adjuntos* → **Cotización** (icono subir / “Ver cotización”) |
| **Orden de compra (PO)** | Mismo panel → **Orden de compra** |
| **Albaranes** | *Albaranes de recepción* → **Subir albarán** (o el asistente Recibir) |
| **Facturas** | *Facturas* → **Registrar factura** |

### Cómo se edita

- Lápiz junto al título / datos generales de la solicitud  
- Lápiz en cada línea de artículo  
- Botones de estado en **Acciones** (derecha), según el estado actual  

### Correos automáticos

En **Acciones** verás botones del tipo:

- Solicitar cotización / aprobar y pedir cotización  
- Solicitar PO («Cómprame»)  
- **Reenviar confirmación de pedido**  

Abren el diálogo de email con plantilla rellenada (destinatario del proveedor o gerente). Puedes revisar y enviar.

Las plantillas se editan en **Admin → Plantillas de Email**.

---

## 4. Recepción con albarán

Desde el panel (**Recibir**) o desde la ficha (**Recibir artículos**):

<img src="assets/tutorial_02_recibir_albaran.png" alt="Asistente Recibir paquete" width="900" />

Asistente en 3 pasos:

1. **Albarán** — foto/PDF + número (opcional)  
2. **Artículos** — cantidades recibidas (parcial OK)  
3. **Confirmar**  

Eso actualiza stock y el estado hacia **Received** cuando está completo.

---

## 5. Proveedores

<img src="assets/tutorial_05_editar_proveedor.png" alt="Listado de proveedores" width="900" />

Menú **Proveedores**:

- **+** / nuevo proveedor  
- Icono **lápiz** en cada fila → editar nombre, contacto, email, teléfono, marcas  
- Icono papelera → borrar (con cuidado)

El email del proveedor es el que usan los correos automáticos de cotización/pedido.

---

## 6. Admin y correos

<img src="assets/tutorial_06_plantillas_email.png" alt="Admin con pestaña Plantillas de Email" width="900" />

En **Admin**:

| Pestaña | Para qué |
| --- | --- |
| Usuarios | Invitar, rol, sede |
| Gerentes / Proyectos / Direcciones | Maestros del flujo |
| **Plantillas de Email** | Textos de cotización, PO, confirmación… |
| Registros de Email | Histórico de envíos |
| Notificaciones | Prueba push FCM |
| Permisos | Quién puede aprobar, recibir, etc. |

---

## 7. Ciclo completo (botones típicos)

```mermaid
flowchart TD
  A["+ Nueva solicitud"] --> B[Pending / Por aprobar]
  B -->|IP o Admin: Aprobar / Solicitar cotización| C[Quote Requested]
  C -->|Subir cotización + Solicitar PO| D[PO Requested]
  D -->|Subir PO + Marcar pedido| E[Ordered / Pedido]
  E -->|Recibir + albarán| F[Received]
  E -->|Reenviar confirmación| M[Email al proveedor]
  B -->|Denegar| X[Denied]
```

Inventario, Documentos y Gastos existen en el menú, pero el día a día del laboratorio es: **Panel → solicitud → cotización/PO → recepción**.

---

## Notas rápidas

- Rutas con hash: `#/dashboard`, `#/requests/<id>`, `#/vendors`, `#/admin`  
- La sede de la dirección de envío controla el filtro del panel  
- Push: un dispositivo activo por usuario; si ves dobles, reabre la PWA tras actualizar  
