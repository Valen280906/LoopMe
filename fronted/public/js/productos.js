fetch("/api/products")
.then(res => res.json())
.then(data => {
    const contenedor = document.getElementById("listaProductos");

    data.products.forEach(p => {
        contenedor.innerHTML += `
        <div class="col-md-3 mb-4">
          <div class="card h-100">
            <img src="${p.imagen || 'https://via.placeholder.com/300'}" class="card-img-top">
            <div class="card-body">
              <h5>${p.nombre}</h5>
              <p>$${p.precio}</p>
              <button class="btn btn-dark w-100" onclick="agregarCarrito(${p.id})">
                Agregar
              </button>
            </div>
          </div>
        </div>
        `;
    });
});
