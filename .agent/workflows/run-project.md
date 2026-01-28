---
description: Cómo correr el proyecto LoopMe correctamente
---

Sigue estos pasos para iniciar el proyecto sin errores:

### 1. Preparar la Base de Datos (MySQL)
- Asegúrate de tener **MySQL** iniciado.
- Crea una base de datos llamada `loopme`:
  ```sql
  CREATE DATABASE loopme;
  ```
- Importa el archivo `sql.sql` ubicado en la raíz del proyecto para crear las tablas y los datos iniciales necesarios.

### 2. Configuración del Entorno (.env)
- Verifica que el archivo `backend/.env` tenga los datos correctos de tu servidor MySQL local:
  ```env
  PORT=3000
  DB_HOST=localhost
  DB_USER=tu_usuario (usualmente root)
  DB_PASSWORD=tu_contraseña
  DB_NAME=loopme
  JWT_SECRET=secreto_super_seguro
  ```

### 3. Instalar Dependencias
- Abre una terminal en la carpeta raíz del proyecto y ejecuta:
  ```bash
  npm install
  ```

### 4. Iniciar el Servidor
- Para arrancar el proyecto, ejecuta desde la raíz:
  ```bash
  node backend/server.js
  ```
- Verás un mensaje indicando que el servidor está corriendo en el puerto 3000.

### 5. Acceder a la Aplicación
- Abre tu navegador y dirígete a: `http://localhost:3000`
- **Tienda**: [http://localhost:3000/index.html](http://localhost:3000/index.html)
- **Admin**: [http://localhost:3000/admin/login.html](http://localhost:3000/admin/login.html)
  - Usuario: `admin@loopme.com`
  - Contraseña: `1234`
