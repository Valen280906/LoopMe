# LoopMe - Sistema de Gestión e E-Commerce

LoopMe es un sistema web compuesto por un módulo administrativo (Backoffice) para la gestión de inventario, ventas, usuarios y control interno de la tienda; y un módulo público tipo e-commerce para navegación de productos por parte de clientes.

---

# 1. División General del Sistema

El sistema está dividido en dos áreas principales:

## Área Privada (Backoffice)
- Dirigida al personal de la tienda  
- Requiere autenticación  
- Controla la operación interna  

## Área Pública (E-Commerce)
- Dirigida a clientes  
- No requiere login para navegar  
- Permite ver productos y comprar  

---

# 2. Roles del Sistema (Área Privada)

## Administrador
- Control total del sistema
- Gestión de usuarios
- Gestión de productos y precios
- Gestión de inventario
- Acceso a reportes y ventas

## Vendedor
- Registro de ventas
- Gestión de pedidos
- Consulta de stock
- No puede eliminar usuarios
- No puede modificar estructura del sistema

## Encargado de Inventario
- Administración del inventario
- Actualización de stock
- Atención de alertas
- No puede gestionar pagos ni usuarios

---

# 3. Área Privada — Funcionalidades Incluidas

### 3.1 Login de Trabajadores
- Usuario y contraseña  
- Validación  
- Acceso según rol  

### 3.2 Dashboard
Resumen general:
- Total de productos
- Pedidos
- Ventas resumidas
- Alertas de stock

### 3.3 Módulo Productos
- Listar productos
- Crear producto
- Editar producto
- Eliminar producto
- Categorías
- Imagen opcional

### 3.4 Inventario
- Consultar stock
- Modificar stock
- Alertas automáticas de stock bajo

### 3.5 Pedidos / Ventas
- Registrar venta
- Ver pedidos
- Estado del pedido
- Detalles del pedido

### 3.6 Pagos
- Registrar pago
- Consultar métodos de pago
- Relación con pedido

### 3.7 Reportes (Básico)
- Listado de ventas
- Productos más vendidos

### 3.8 Gestión de Usuarios (Solo Administrador)
- Crear usuarios
- Asignar roles
- Activar / desactivar usuario

---

# 3.9 Área Privada — Funcionalidades No Incluidas
Para definir el alcance, el sistema NO incluye:
- Facturación fiscal completa  
- Integración real con Stripe (solo simulación si aplica)  
- Reportes avanzados tipo BI  
- Auditoría compleja  
- Funcionamiento offline  
- Aplicación móvil  

---

# 4. Área Pública (Clientes) — Funcionalidades Incluidas

### 4.1 Página Principal (Home)
- Presentación de la tienda
- Acceso a tienda

### 4.2 Tienda
- Visualización de productos
- Filtros por categoría
- Búsqueda
- Ver disponibilidad

### 4.3 Detalle de Producto
- Información
- Precio
- Stock disponible

### 4.4 Carrito de Compras
- Agregar productos
- Eliminar productos
- Modificar cantidad

### 4.5 Checkout
- Registro de datos del cliente
- Confirmación de compra

---

# 4.6 Área Pública — Funcionalidades No Incluidas
- Sistema complejo de cuentas cliente  
- Historial de compras del cliente  
- Sistema avanzado de envíos  
- Pagos reales por pasarela (se puede simular si es necesario)  

---

# 5. Tecnologías Utilizadas

- Node.js  
- Express  
- MySQL  
- Bootstrap  
- HTML / CSS / JavaScript  
- JWT (Autenticación)

---

# 6. Backend y Autenticación

El backend funciona bajo una arquitectura cliente-servidor utilizando Node.js y Express.

Se estableció conexión real con MySQL utilizando `mysql2`.

Se implementó autenticación segura basada en JSON Web Tokens (JWT).  
Al iniciar sesión:

1. El backend valida credenciales en MySQL.
2. Genera un token JWT firmado.
3. El token contiene:
   - id del usuario
   - nombre
   - rol
4. El token es enviado al frontend.
5. El token se usa para acceder a secciones privadas.

Este esquema permite proteger rutas, validar roles y mantener sesiones sin almacenar información en servidor.

---

# 7. Estructura del Proyecto

backend/
├─ middleware/
│ ├─ auth.js
├─ routes/
│ ├─ secure.js
│ ├─ auth.js
├─ server.js
├─ db.js
frontend/
├─ login.html
├─ dashboard.html


---

# 8. Usuario Administrador Inicial

Se crea manualmente en la BD:

email: admin@loopme.com

password: 1234
rol: Administrador


Este usuario es el responsable de crear:
- Usuarios Vendedor
- Usuarios Inventario

---

# 9. Ejecución del Sistema

## 1) Iniciar Backend
Dentro del proyecto ejecutar:

node backend/server.js
Debe mostrar:
"Backend corriendo en puerto 3000
Conectado a MySQL"

---

## 2) Login
Abrir desde navegador:
`login.html`
Ingresar:
admin@loopme.com
1234

Tras un login exitoso:
- Se genera token JWT
- Se guarda en localStorage
- Se redirige a dashboard
- El sistema queda autenticado
---
# 10. Verificación de Seguridad JWT
Ruta protegida:http://localhost:3000/api/secure/check
Petición se realiza con:
Authorization: Bearer TOKEN

Si el token es válido:
- Acceso permitido
- Devuelve datos del usuario

Si no:
- Token requerido
- Token inválido
- Token expirado

---

# 11. Justificación del Diseño

El sistema se divide en un módulo administrativo interno para la gestión de inventario, productos, ventas y usuarios, y un módulo público orientado a clientes para visualización de productos y compras. Esta separación garantiza seguridad, organización y claridad operativa entre la gestión interna de la tienda y la experiencia del cliente.

Para la autenticación del sistema LoopMe se decidió implementar un esquema basado en JWT debido a que el sistema funciona bajo una arquitectura cliente-servidor con frontend independiente. JWT permite manejar sesiones seguras sin almacenamiento de sesión en el servidor, mejora el control por roles y facilita la escalabilidad futura.

---


