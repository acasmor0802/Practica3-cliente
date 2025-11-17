// CRM con IndexedDB - Mejorado
let db;
let clientes = [];

const formulario = document.getElementById('client-form');
const botonAgregar = document.getElementById('add-btn');
const inputNombre = document.getElementById('name');
const inputEmail = document.getElementById('email');
const inputTelefono = document.getElementById('phone');
const listaClientes = document.getElementById('client-list');
const inputBusqueda = document.getElementById('search-client');
const emailError = document.getElementById('email-error');

// Inicializa la base de datos
const request = indexedDB.open("CRM_Database", 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id', autoIncrement: true });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    cargarClientes();
};

request.onerror = function(event) {
    alert("No se pudo abrir la base de datos");
};

// Validación de formulario y email en tiempo real
function validarCampos() {
    let nombreValido = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{4,}$/.test(inputNombre.value.trim());
    let emailValido = /^[\w\-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(inputEmail.value.trim());
    let telefonoValido = /^\d{3}-\d{3}-\d{4}$/.test(inputTelefono.value.trim());

    inputNombre.className = nombreValido ? 'valid' : 'invalid';
    inputEmail.className = emailValido ? 'valid' : 'invalid';
    inputTelefono.className = telefonoValido ? 'valid' : 'invalid';

    // Validación avanzada: Email único
    const emailEnUso = clientes.some(c => c.email.toLowerCase() === inputEmail.value.trim().toLowerCase() && c.id !== idEnEdicion);
    if (emailEnUso && emailValido) {
        emailError.textContent = "Ese email ya está registrado.";
        inputEmail.className = 'invalid';
        emailValido = false;
    } else {
        emailError.textContent = "";
    }

    botonAgregar.disabled = !(nombreValido && emailValido && telefonoValido);
    return nombreValido && emailValido && telefonoValido;
}

[inputNombre, inputEmail, inputTelefono].forEach(input => {
    input.addEventListener('blur', validarCampos);
    input.addEventListener('input', validarCampos);
});

inputEmail.addEventListener('input', validarCampos);

let idEnEdicion = null;

// Al enviar el formulario
formulario.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!validarCampos()) return;

    const nuevoCliente = {
        name: inputNombre.value.trim(),
        email: inputEmail.value.trim(),
        phone: inputTelefono.value.trim()
    };

    const transaccion = db.transaction(['clients'], 'readwrite');
    const store = transaccion.objectStore('clients');

    if (idEnEdicion) {
        nuevoCliente.id = idEnEdicion;
        store.put(nuevoCliente);
    } else {
        store.add(nuevoCliente);
    }

    transaccion.oncomplete = function() {
        cargarClientes();
        formulario.reset();
        botonAgregar.disabled = true;
        idEnEdicion = null;
        botonAgregar.textContent = "Agregar Cliente";
        [inputNombre, inputEmail, inputTelefono].forEach(i => i.className = '');
    };
});

// Carga todos los clientes en memoria
function cargarClientes() {
    clientes = [];
    const transaccion = db.transaction(['clients']);
    const store = transaccion.objectStore('clients');
    store.openCursor().onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            clientes.push(cursor.value);
            cursor.continue();
        } else {
            mostrarClientes(inputBusqueda.value.trim().toLowerCase());
        }
    };
}

// Filtrado y renderizado de la lista
function mostrarClientes(filtro = "") {
    listaClientes.innerHTML = '';
    clientes
    .filter(c =>
        c.name.toLowerCase().includes(filtro) ||
        c.email.toLowerCase().includes(filtro) ||
        c.phone.includes(filtro)
    )
    .forEach(cliente => {
        const li = document.createElement('li');
        li.classList.add('animacion-agregar');
        li.innerHTML = `
            <span>${cliente.name} | ${cliente.email} | ${cliente.phone}</span>
            <div class="actions">
                <button onclick="editarCliente(${cliente.id})">Editar</button>
                <button onclick="borrarCliente(${cliente.id}, this)">Eliminar</button>
            </div>`;
        listaClientes.appendChild(li);
    });
}

// Busqueda interactiva
inputBusqueda.addEventListener('input', function() {
    mostrarClientes(inputBusqueda.value.trim().toLowerCase());
});

// Editar cliente
window.editarCliente = function(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    inputNombre.value = cliente.name;
    inputEmail.value = cliente.email;
    inputTelefono.value = cliente.phone;
    idEnEdicion = id;
    botonAgregar.textContent = "Guardar Cambios";
    botonAgregar.disabled = false;
    validarCampos();
};

// Borrar cliente con animación
window.borrarCliente = function(id, boton) {
    const transaccion = db.transaction(['clients'], 'readwrite');
    transaccion.objectStore('clients').delete(id);
    // Animación: fadeout antes de borrar de la lista
    const item = boton.closest('li');
    item.classList.add('animacion-eliminar');
    setTimeout(cargarClientes, 600);

    // Si estábamos editando ese registro, resetea el formulario
    if (idEnEdicion === id) {
        formulario.reset();
        botonAgregar.textContent = "Agregar Cliente";
        botonAgregar.disabled = true;
        idEnEdicion = null;
        [inputNombre, inputEmail, inputTelefono].forEach(i => i.className = '');
        emailError.textContent = '';
    }
};
