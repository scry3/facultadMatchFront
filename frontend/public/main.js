/* ============================================================
   main.js - Lógica principal del front
   Comentado para entender qué hace cada función y por qué.
   ============================================================ */

/* URL base del backend: cuando lo subas a internet, cambiás esto */
const API_BASE = 'http://127.0.0.1:3000';


/* Extraemos del path el nombre del archivo HTML actual.
   Ej: si estás en /public/explorar.html → devuelve "explorar.html". */
const path = window.location.pathname.split('/').pop();

/* --------------------------------------------------------------
   onDOM(selector, cb)
   - selector: string tipo "#id" o ".clase"
   - cb: callback (función) que recibe el elemento encontrado
   Sirve para evitar "undefined" si la página no tiene ese elemento.
   -------------------------------------------------------------- */
function onDOM(selector, cb) {
    const el = document.querySelector(selector);
    if (el) cb(el);     // si existe, ejecuta la función
}

/* --------------------------------------------------------------
   jsonResponse(res)
   - res: respuesta del fetch
   Si el status no es OK (200-299), tira error.
   Si es OK, convierte la respuesta JSON → objeto JS.
   -------------------------------------------------------------- */
function jsonResponse(res) {
    if (!res.ok) throw new Error(res.statusText || 'Error en la respuesta');
    return res.json();
}

/* ============================================================
   1) REGISTRO
   POST /register
   ============================================================ */
function handleRegister() {

    onDOM('#registerForm', form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault(); // evita recargar la página

            // Armamos un objeto con los datos del formulario
            const data = {
                username: form.querySelector('#username').value.trim(),
                password: form.querySelector('#password').value,
                nombre: form.querySelector('#nombre').value.trim(),
                edad: Number(form.querySelector('#edad').value),
                carrera: form.querySelector('#carrera').value.trim(),
                descripcion: form.querySelector('#descripcion').value.trim(),
                instagram: form.querySelector('#instagram').value.trim()
            };

            // Validación básica del lado del cliente
            if (!data.username || !data.password) return alert('Usuario y contraseña obligatorios.');
            if (isNaN(data.edad) || data.edad < 18 || data.edad > 100) return alert('Edad inválida (18-100).');

            try {
                const res = await fetch(`${API_BASE}/api/auth/register`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const responseData = await jsonResponse(res); // guardamos la respuesta con info del usuario

                // Guardamos el id del usuario en localStorage
                localStorage.setItem('userId', responseData.data.id);

                alert('Registro exitoso. ¡Ahora podés explorar!');
                window.location.href = 'explorar.html'; // redirige directamente al explorer

            } catch (err) {
                console.error(err);
                alert('Error al registrar: ' + err.message);
            }
        });
    });
}


/* ============================================================
   2) LOGIN
   POST /login
   ============================================================ */
function handleLogin() {

    onDOM('#loginForm', form => {

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Tomamos usuario y contraseña
            const payload = {
                username: form.querySelector('#username').value.trim(),
                password: form.querySelector('#password').value
            };

            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await jsonResponse(res); // guardamos la respuesta con info del usuario

                // Guardamos el id del usuario logueado en localStorage
                localStorage.setItem('userId', data.data.id);

                // Login OK → pasamos a explorar
                window.location.href = 'explorar.html';

            } catch (err) {
                console.error(err);
                alert('Login falló: ' + err.message);
            }

        }
        );

    });

}

/* ============================================================
   3) EXPLORAR PERFILES
   GET /users
   POST /like/:id
   ============================================================ */

// Acá guardamos los perfiles que nos manda el backend
let perfiles = [];
let currentIndex = 0;


/* --------------------------------------------------------------
   cargarPerfiles()
   - Hace GET /users
   - Guarda la lista en "perfiles"
   - Muestra el primer perfil
   -------------------------------------------------------------- */
async function cargarPerfiles() {
    try {
        const res = await fetch(`${API_BASE}/api/auth/users`, {
            credentials: 'include' // necesario para que la sesión funcione
        });

        if (!res.ok) { // manejo de errores HTTP
            if (res.status === 401) {
                window.location.href = 'login.html';
                return;
            }
            throw new Error('Error al traer los perfiles');
        }

        perfiles = await res.json(); // array directo del backend
        if (currentIndex == null) currentIndex = 0;
        renderPerfil();
    } catch (err) {
        console.error(err);
        document.getElementById('perfilNombre').textContent = 'Error al cargar perfiles man.';
    }
}





/* --------------------------------------------------------------
   renderPerfil()
   - Muestra en pantalla el perfil actual (por currentIndex)
   - Si no hay más perfiles, muestra mensaje "No hay más"
   -------------------------------------------------------------- */
function renderPerfil() {
    const perfilCard = document.getElementById('perfilCard');
    const noMore = document.getElementById('noMore');

    // Si no hay perfiles o ya pasamos todos
    if (!perfiles.length || currentIndex >= perfiles.length) {
        perfilCard.style.display = 'none';
        noMore.style.display = 'block';
        return;
    }

    // Tomamos el perfil actual
    const p = perfiles[currentIndex];

    perfilCard.style.display = 'block';
    noMore.style.display = 'none';

    document.getElementById('perfilNombre').textContent = p.nombre || p.username;
    document.getElementById('perfilMeta').textContent = `${p.edad} • ${p.carrera}`;
    document.getElementById('perfilDescripcion').textContent = p.descripcion || '';
}

/* --------------------------------------------------------------
   setupSkip()
   - Al hacer click en "Skip", pasamos al siguiente perfil
   -------------------------------------------------------------- */
function setupSkip() {
    onDOM('#skipBtn', btn => {
        btn.addEventListener('click', () => {
            currentIndex++; // pasamos al próximo
            renderPerfil();
        });
    });
}

/* --------------------------------------------------------------
   setupLike()
   - Al hacer click en "Like":
       → Enviamos POST /like/:id
       → Backend devuelve si hubo match o no
       → Avanzamos al siguiente perfil
   -------------------------------------------------------------- */
function setupLike() {
    onDOM('#likeBtn', btn => {
        btn.addEventListener('click', async () => {
            const perfil = perfiles[currentIndex];
            if (!perfil) return;

            //const userId = localStorage.getItem('userId'); //// usamos el id guardado

            try {
                const res = await fetch(`${API_BASE}/api/like/${perfil.id}`, {
                    method: "POST",
                    credentials: "include"
                });

                const data = await jsonResponse(res);

                if (data.match) {
                    alert(`¡Match con ${data.partner.nombre || data.partner.username}! IG: ${data.partner.instagram}`);
                }

                currentIndex++;
                renderPerfil();

            } catch (err) {
                console.error(err);
                alert('Error al dar like.');
            }
        });

    });
}

/* ============================================================
   4) LISTAR MATCHES
   GET /matches
   ============================================================ */

/* --------------------------------------------------------------
   cargarMatches()
   - Hace GET /matches
   - Muestra la lista en match.html
   -------------------------------------------------------------- */
async function cargarMatches() {
    try {
        const res = await fetch(`${API_BASE}/api/match`, {
            credentials: 'include'
        });

        const lista = await jsonResponse(res);

        const ul = document.getElementById('matchesList');
        const noMatches = document.getElementById('noMatches');

        // Si no hay matches
        if (!lista.length) {
            noMatches.style.display = 'block';
            ul.innerHTML = '';
            return;
        }

        noMatches.style.display = 'none';
        ul.innerHTML = '';

        // Recorremos cada match y lo agregamos al HTML
        const idsVistos = new Set();

lista.forEach(m => {
    if (idsVistos.has(m.id)) return; // evita duplicados
    idsVistos.add(m.id);

    const li = document.createElement('li');
    li.className = 'card perfil-card'; // mismo estilo que explorar
    li.innerHTML = `
      <div class="card-body">
        <h3>${m.nombre || m.username}, ${m.edad} años, ${m.carrera}</h3>
        <p>${m.descripcion || ''}</p>
        <p><strong>@${m.instagram}</strong></p>
      </div>
    `;
    ul.appendChild(li);
});


    } catch (err) {
        console.error(err);

        // Si no hay sesión
        if (err.message.toLowerCase().includes('unauthorized')) {
            window.location.href = 'login.html';
        }
    }
}

/* ============================================================
   5) Inicialización por página
   Según la página donde estés, se ejecutan funciones distintas.
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    if (path === 'register.html') handleRegister();
    if (path === 'login.html') handleLogin();
    if (path === 'explorar.html') {
        cargarPerfiles();
        setupSkip();
        setupLike();
    }
    if (path === 'match.html') cargarMatches();
});






/* ============================================================
   6) actualizar info de perfil
   ============================================================ */
async function inicializarPerfil() {
    const inputDesc = document.getElementById('inputDescripcion');
    const previewDesc = document.getElementById('previewDescripcion');
    const inputIG = document.getElementById('inputInstagram');

    try {
        // Traemos los datos actuales del usuario desde su perfil
        const res = await fetch(`${API_BASE}/api/auth/profile`, {
            credentials: 'include'
        });
        if (!res.ok) throw new Error('No se pudieron cargar los datos del perfil');

        const user = await res.json();

        // Seteamos los valores actuales
        inputDesc.value = user.descripcion || '';
        previewDesc.textContent = user.descripcion || ''; // vista previa inicial
        inputIG.value = user.instagram || '';

    } catch (err) {
        console.error(err);
        previewDesc.textContent = 'Error al cargar tu perfil';
    }

    // Botón de actualizar perfil
    onDOM('#btnActualizarPerfil', btn => {
        btn.addEventListener('click', async () => {
            const descripcion = inputDesc.value;
            const instagram = inputIG.value;

            try {
                const res = await fetch(`${API_BASE}/api/auth/profile`, {
                    method: 'PATCH',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descripcion, instagram })
                });

                const data = await res.json();
                if (data.success) {
                    alert('Perfil actualizado!');
                    // Actualizamos la vista previa solo al actualizar
                    previewDesc.textContent = descripcion;
                } else {
                    throw new Error(data.message || 'Error al actualizar perfil');
                }
            } catch(err) {
                console.error(err);
                alert('Error al actualizar perfil.');
            }
        });
    });
}

// Llamar a la función al cargar la sección de edición
inicializarPerfil();
