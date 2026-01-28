/**
 * auth.js - Sistema centralizado de autenticación para LoopMe
 */

// Verificar si el usuario ha iniciado sesión
function verificarSesion(redirigirSiFalla = false) {
    const token = localStorage.getItem("cliente_token");
    const info = localStorage.getItem("cliente_info");

    if (!token || !info) {
        if (redirigirSiFalla) {
            window.location.href = "login-cliente.html";
        }
        return false;
    }

    try {
        JSON.parse(info);
        return true;
    } catch (e) {
        if (redirigirSiFalla) {
            window.location.href = "login-cliente.html";
        }
        return false;
    }
}

// Obtener info del usuario de forma segura
function getClienteInfo() {
    const info = localStorage.getItem("cliente_info");
    if (!info) return null;
    try {
        return JSON.parse(info);
    } catch (e) {
        return null;
    }
}

// Cerrar sesión y redirigir al inicio (Landing Page)
function logoutCliente() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        text: "Esperamos verte pronto por LoopMe",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#764ba2',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, salir',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem("cliente_token");
            localStorage.removeItem("cliente_info");
            // Redirigir siempre a la página de inicio de roles
            window.location.href = "index.html";
        }
    });
}

// Helper para claves de localStorage por usuario (ej: favoritos_user@mail.com)
function getUserKey(baseKey) {
    const cliente = getClienteInfo();
    if (!cliente || !cliente.email) return baseKey;
    return `${baseKey}_${cliente.email}`;
}

// Exponer funciones globalmente
window.verificarSesion = verificarSesion;
window.getClienteInfo = getClienteInfo;
window.logoutCliente = logoutCliente;
window.getUserKey = getUserKey;
