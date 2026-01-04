# Documentación del Sistema LoopMe

## 1. División General del Sistema
El sistema está dividido en dos áreas principales:

### **Área Privada (Backoffice)**
- Dirigida al personal de la tienda  
- Requiere autenticación  
- Controla la operación interna  

### **Área Pública (E-Commerce)**
- Dirigida a clientes  
- No requiere login para navegar  
- Permite ver productos y comprar  

---

## 2. Roles del Sistema (Área Privada)

### **Administrador**
- Control total del sistema
- Gestión de usuarios
- Gestión de productos y precios
- Gestión de inventario
- Acceso a reportes y ventas

### **Vendedor**
- Registro de ventas
- Gestión de pedidos
- Consulta de stock
- No puede eliminar usuarios
- No puede modificar estructura del sistema

### **Encargado de Inventario**
- Administración del inventario
- Actualización de stock
- Atención de alertas
- No puede gestionar pagos ni usuarios

---

## 3. Área Privada — Funcionalidades Incluidas

### **3.1 Login de Trabajadores**
- Usuario y contraseña  
- Validación  
- Acceso según rol  

### **3.2 Dashboard**
Resumen general:
- Total de productos
- Pedidos
- Ventas resumidas
- Alertas de stock

### **3.3 Módulo Productos**
- Listar productos
- Crear producto
- Editar producto
- Eliminar producto
- Categorías
- Imagen opcional

### **3.4 Inventario**
- Consultar stock
- Modificar stock
- Alertas automáticas de stock bajo

### **3.5 Pedidos / Ventas**
- Registrar venta
- Ver pedidos
- Estado del pedido
- Detalles del pedido

### **3.6 Pagos**
- Registrar pago
- Consultar métodos de pago
- Relación con pedido

### **3.7 Reportes (Básico)**
- Listado de ventas
- Productos más vendidos

### **3.8 Gestión de Usuarios (Solo Administrador)**
- Crear usuarios
- Asignar roles
- Activar / desactivar usuarios

---

## 3.9 Área Privada — Funcionalidades No Incluidas
Para definir el alcance, el sistema NO incluye:
- Facturación fiscal completa  
- Integración real con Stripe (solo simulación si aplica)  
- Reportes avanzados tipo BI  
- Auditoría compleja  
- Funcionamiento offline  
- Aplicación móvil  

---

## 4. Área Pública (Clientes) — Funcionalidades Incluidas

### **4.1 Página Principal (Home)**
- Presentación de la tienda
- Acceso a tienda

### **4.2 Tienda**
- Visualización de productos
- Filtros por categoría
- Búsqueda
- Ver disponibilidad

### **4.3 Detalle de Producto**
- Información
- Precio
- Stock disponible

### **4.4 Carrito de Compras**
- Agregar productos
- Eliminar productos
- Modificar cantidad

### **4.5 Checkout**
- Registro de datos del cliente
- Confirmación de compra

---

## 4.6 Área Pública — Funcionalidades No Incluidas
- Sistema complejo de cuentas cliente  
- Historial de compras del cliente  
- Sistema avanzado de envíos  
- Pagos reales por pasarela (se puede simular si es necesario)  

---

## 5. Orden de Construcción del Frontend

### **Fase 1 — Área Privada**
1. Login  
2. Dashboard  
3. Productos  
4. Inventario  
5. Pedidos  
6. Pagos  
7. Reportes  
8. Usuarios  

### **Fase 2 — Área Pública**
9. Home  
10. Tienda  
11. Producto  
12. Carrito  
13. Checkout  

---

## 6. Justificación
El sistema se divide en un módulo administrativo interno para la gestión de inventario, productos, ventas y usuarios, y un módulo público orientado a clientes para visualización de productos y compras. Esta separación garantiza seguridad, organización y claridad operativa entre la gestión interna de la tienda y la experiencia del cliente.
