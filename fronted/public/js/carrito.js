let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

function agregarCarrito(id) {
    carrito.push({ id, cantidad: 1 });
    localStorage.setItem("carrito", JSON.stringify(carrito));
    alert("Producto agregado");
}
