const API_KEY = '4966b7b5-4806-4bfe-81cf-8bed6dce9af8';
const API_BASE = 'https://api.balldontlie.io/v1';

const contenedorJugadores = document.getElementById('contenedor-jugadores');
const contenedorCarrusel = document.getElementById('contenedor-carrusel');
const seccionEquipos = document.getElementById('seccion-equipos');
const seccionJugadores = document.getElementById('seccion-jugadores');
const contenedorError = document.getElementById('contenedor-error');
const mensajeError = document.getElementById('mensaje-error');
const loader = document.getElementById('loader');
const inputBusqueda = document.getElementById('busqueda');
const botonBuscar = document.getElementById('boton-buscar');
const btnVerMas = document.getElementById('btn-ver-mas');
const contEquiposFav = document.getElementById('contenedor-equipos-favoritos');
const contJugadoresFav = document.getElementById('contenedor-jugadores-favoritos');
const contenedorProximos = document.getElementById('contenedor-proximos');

const modalElement = document.getElementById('modal-detalle');
const modalBS = modalElement ? new bootstrap.Modal(modalElement) : null;

if (modalElement) {
    modalElement.addEventListener('hide.bs.modal', () => {
        if (document.activeElement && modalElement.contains(document.activeElement)) {
            document.activeElement.blur();
        }
    });
}

let poolJugadores = [];
let listaEquiposNBA = []; 
let indiceActual = 0;

const mostrarCargando = (estado) => {
    if (!loader) return;
    if (estado) {
        loader.classList.remove('d-none');
        loader.classList.add('d-flex');
    } else {
        loader.classList.add('d-none');
        loader.classList.remove('d-flex');
    }
};

const fetchData = async (endpoint) => {
    const cacheKey = `nba_cache_${endpoint.replace(/\W/g, '_')}`;
    const datosCache = localStorage.getItem(cacheKey);
    if (datosCache) return JSON.parse(datosCache);
    mostrarCargando(true);
    try {
        const respuesta = await fetch(`${API_BASE}/${endpoint}`, {
            method: 'GET',
            headers: { 'Authorization': API_KEY }
        });
        if (!respuesta.ok) {
            if (respuesta.status === 429) {
                throw new Error("Has realizado demasiadas peticiones. Por favor, espera un minuto y vuelve a intentarlo.");
            }
            throw new Error(`Error ${respuesta.status}: No pudimos obtener los datos.`);
        }

        const datos = await respuesta.json();
        localStorage.setItem(cacheKey, JSON.stringify(datos));
        return datos;
    } catch (error) {
        if (contenedorError) {
            contenedorError.style.display = 'block';
            mensajeError.textContent = error.message;
            contenedorError.scrollIntoView({ behavior: 'smooth' });
        }
        return null;
    } finally {
        mostrarCargando(false);
    }
};

const gestionarVisibilidad = (esBusqueda) => {
    if (esBusqueda) {
        if (seccionEquipos) seccionEquipos.classList.add('d-none');
        if (btnVerMas) btnVerMas.classList.add('d-none');
    } else {
        if (seccionEquipos) seccionEquipos.classList.remove('d-none');
        if (btnVerMas) btnVerMas.classList.remove('d-none');
    }
};

const mostrarEquiposCarrusel = (equipos) => {
    if (!contenedorCarrusel) return;
    contenedorCarrusel.innerHTML = '';
    equipos.forEach((equipo, index) => {
        const div = document.createElement('div');
        div.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        const nombreArchivo = equipo.name.toLowerCase().replace(/\s+/g, '');
        div.innerHTML = `
            <div class="text-center py-5">
                <img src="imgs/${nombreArchivo}.svg" alt="${equipo.full_name}" class="mb-3" style="max-height: 150px; object-fit: contain;" onerror="this.src='imgs/logo.png'">
                <h3 class="display-6 fw-bold">${equipo.full_name}</h3>
                <p class="text-muted">${equipo.city} | ${equipo.conference}</p>
                <div class="mt-4">
                    <button class="btn btn-primary me-2" onclick="verDetalle(${equipo.id}, 'teams')">Ver Detalle</button>
                    <button class="btn btn-outline-warning" onclick="guardarFav(${JSON.stringify(equipo).replace(/"/g, '&quot;')}, 'equipos')">Favorito</button>
                </div>
            </div>`;
        contenedorCarrusel.appendChild(div);
    });
};

const mostrarJugadoresCards = (jugadores, limpiar = true) => {
    if (!contenedorJugadores) return;
    if (limpiar) contenedorJugadores.innerHTML = '';
    jugadores.forEach(j => {
        const col = document.createElement('div');
        col.className = 'col-12 col-sm-6 col-lg-4';
        col.innerHTML = `
            <div class="card h-100 shadow-sm border-0 border-top border-5 border-celeste position-relative">
                <button class="btn-estrella" onclick='guardarFav(${JSON.stringify(j).replace(/"/g, '&quot;')}, "jugadores")' title="Agregar a favoritos">
                    ★
                </button>
                
                <div class="card-body text-center d-flex flex-column justify-content-between">
                    <div>
                        <h5 class="card-title mt-2">${j.first_name} ${j.last_name}</h5>
                        <p class="badge bg-light text-dark border">${j.position || 'N/A'}</p>
                        <p class="card-text small text-muted mb-4">${j.team.full_name}</p>
                    </div>
                    
                    <div class="d-grid px-4">
                        <button class="btn btn-sm btn-outline-primary" onclick="verDetalle(${j.id}, 'players')">
                            Ver Detalle
                        </button>
                    </div>
                </div>
            </div>`;
        contenedorJugadores.appendChild(col);
    });
};

const renderizarSiguienteGrupo = () => {
    const limite = Math.min(indiceActual + 6, poolJugadores.length);
    mostrarJugadoresCards(poolJugadores.slice(indiceActual, limite), false);
    indiceActual = limite;
    if (indiceActual >= poolJugadores.length && btnVerMas) btnVerMas.classList.add('d-none');
};

const buscar = async () => {
    const termino = inputBusqueda.value.trim().toLowerCase();
    if (!termino) {
        gestionarVisibilidad(false);
        cargarInicio();
        return;
    }

    const equipoEncontrado = listaEquiposNBA.filter(e => 
        e.full_name.toLowerCase().includes(termino) || e.name.toLowerCase().includes(termino)
    );

    if (equipoEncontrado.length > 0) {
        gestionarVisibilidad(true);
        seccionEquipos.classList.remove('d-none'); 
        seccionJugadores.classList.add('d-none'); 
        mostrarEquiposCarrusel(equipoEncontrado);
        return; 
    }

    const data = await fetchData(`players?search=${termino}`);
    if (data && data.data) {
        const jugadoresActivos = data.data.filter(j => j.position && j.position !== "");
        gestionarVisibilidad(true);
        seccionJugadores.classList.remove('d-none'); 
        mostrarJugadoresCards(jugadoresActivos, true);
    }
};


const mostrarProximosPartidos = (partidos) => {
    if (!contenedorProximos) return;
    contenedorProximos.innerHTML = '';

    if (partidos.length === 0) {
        contenedorProximos.innerHTML = '<div class="carousel-item active"><p class="text-muted text-center p-3">No hay partidos próximos.</p></div>';
        return;
    }

    const generarHTML = (g, index, esClon = false) => {
        const timestamp = g.status.includes('T') ? g.status : g.date;
        const d = new Date(timestamp);
        const fechaAR = d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' });
        const horaAR = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Buenos_Aires' });

        const logoHome = g.home_team.name.toLowerCase().replace(/\s+/g, '');
        const logoVisitor = g.visitor_team.name.toLowerCase().replace(/\s+/g, '');

        return `
            <div class="partido-item">
                <div class="equipos-vs">
                    <img src="imgs/${logoHome}.svg" alt="" style="width: 25px; height: 25px;" onerror="this.src='imgs/logo.png'">
                    <span class="fw-bold">${g.home_team.abbreviation}</span>
                    <span class="small mx-1 opacity-75">vs</span>
                    <span class="fw-bold">${g.visitor_team.abbreviation}</span>
                    <img src="imgs/${logoVisitor}.svg" alt="" style="width: 25px; height: 25px;" onerror="this.src='imgs/logo.png'">
                </div>
                <div class="info-tiempo">
                    ${fechaAR} - ${horaAR} HS
                </div>
            </div>
        `;
    };

    partidos.forEach((g, index) => {
        const div = document.createElement('div');
        div.className = `carousel-item ${index === 0 ? 'active' : ''}`;
        div.innerHTML = generarHTML(g, index);
        contenedorProximos.appendChild(div);
    });

    partidos.forEach((g, index) => {
        const div = document.createElement('div');
        div.className = `carousel-item clon-marquee`; 
        div.innerHTML = generarHTML(g, index);
        contenedorProximos.appendChild(div);
    });
};

if(botonBuscar) botonBuscar.addEventListener('click', buscar);
btnVerMas?.addEventListener('click', renderizarSiguienteGrupo);

const verDetalle = async (id, tipo) => {
    const contenido = document.getElementById('contenido-detalle');
    const titulo = document.getElementById('titulo-detalle');
    mostrarCargando(true);

    try {
        if (tipo === 'teams') {
            const f = new Date();
            const hoy = f.getFullYear() + "-" + 
                        String(f.getMonth() + 1).padStart(2, '0') + "-" + 
                        String(f.getDate()).padStart(2, '0');
            const temporada = f.getMonth() < 9 ? f.getFullYear() - 1 : f.getFullYear();

            const [resEquipo, resPartidos] = await Promise.all([
                fetchData(`teams/${id}`),
                fetchData(`games?team_ids[]=${id}&seasons[]=${temporada}&per_page=100&end_date=${hoy}`)
            ]);
            if (!resEquipo || !resPartidos) return;

            const equipo = resEquipo.data;
            const partidos = resPartidos.data
                .filter(g => g.status === 'Final')
                .sort((a, b) => new Date(b.date) - new Date(a.date)) 
                .slice(0, 5); 

            const nombreArchivo = equipo.name.toLowerCase().replace(/\s+/g, '');
            titulo.innerHTML = `<img src="imgs/${nombreArchivo}.svg" style="height:30px; margin-right:10px;"> ${equipo.full_name}`;
            
            let listaHTML = '<ul class="list-group list-group-flush small mt-3">';
            partidos.forEach(g => {
                const gano = (g.home_team.id === id) ? (g.home_team_score > g.visitor_team_score) : (g.visitor_team_score > g.home_team_score);
                listaHTML += `<li class="list-group-item d-flex justify-content-between align-items-center">
                    <div><small class="text-muted d-block">${new Date(g.date).toLocaleDateString()}</small>${g.home_team.abbreviation} ${g.home_team_score} - ${g.visitor_team_score} ${g.visitor_team.abbreviation}</div>
                    <strong class="${gano ? 'text-success' : 'text-danger'}">${gano ? 'V' : 'D'}</strong></li>`;
            });
            listaHTML += '</ul>';

            contenido.innerHTML = `
            <div class="row text-center mb-4 g-2 stats-destacadas">
                <div class="col border-end"><strong>Conferencia</strong>${equipo.conference}</div>
                <div class="col border-end"><strong>División</strong>${equipo.division}</div>
                <div class="col"><strong>Ciudad</strong>${equipo.city}</div>
            </div>
            <h6 class="fw-bold mb-3"><i class="bi bi-calendar-check me-2"></i>Últimos 5 Resultados:</h6>
            ${listaHTML}`;

        } else if (tipo === 'players') {
            const resPlayer = await fetchData(`players/${id}`);
            const p = resPlayer.data;
            titulo.textContent = `${p.first_name} ${p.last_name}`;
            
            contenido.innerHTML = `
            <div class="text-center mb-4">
                <span class="badge rounded-pill px-3 py-2 mb-2" style="background-color: var(--azul-oscuro)">${p.position || 'N/A'}</span>
                <h5 class="text-muted mb-0">#${p.jersey_number || 'S/N'} | ${p.team.full_name}</h5>
            </div>
            <div class="jugador-ficha shadow-sm p-3 rounded bg-light">
                <div class="jugador-info-item"><span>Altura</span><strong>${p.height || 'N/A'}</strong></div>
                <div class="jugador-info-item"><span>Peso</span><strong>${p.weight ? p.weight + ' lbs' : 'N/A'}</strong></div>
                <div class="jugador-info-item"><span>País</span><strong>${p.country || 'N/A'}</strong></div>
                <div class="jugador-info-item"><span>Universidad</span><strong>${p.college || 'N/A'}</strong></div>
                <div class="jugador-info-item"><span>Draft</span><strong>${p.draft_year ? p.draft_year + ' (Ronda ' + p.draft_round + ')' : 'N/A'}</strong></div>
            </div>`;
        }

        if (modalBS) modalBS.show();
    } catch (err) {
        if (contenedorError) {
            contenedorError.style.display = 'block';
            mensajeError.textContent = "Hubo un problema al cargar los detalles. Reintente en unos instantes.";
        }
        console.error("Error en verDetalle:", err);
    } finally {
        mostrarCargando(false);
    }
};

const guardarFav = (obj, tipo) => {
    const key = tipo === 'equipos' ? 'nba_fav_equipos' : 'nba_fav_jugadores';
    let favs = JSON.parse(localStorage.getItem(key)) || [];
    if (!favs.find(i => i.id === obj.id)) {
        favs.push(obj);
        localStorage.setItem(key, JSON.stringify(favs));
        alert('Agregado!');
    } else {
        alert('Ya es favorito');
    }
};

const cargarEquiposFavoritos = () => {
    if (!contEquiposFav) return;
    const equipos = JSON.parse(localStorage.getItem('nba_fav_equipos')) || [];
    contEquiposFav.innerHTML = '';

    if (equipos.length === 0) {
        contEquiposFav.innerHTML = '<p class="text-muted small">No tenés equipos favoritos aún.</p>';
        return;
    }

    equipos.forEach(equipo => {
        const div = document.createElement('div');
        div.className = 'col-12 col-md-6 col-lg-3';
        const nombreArchivo = equipo.name.toLowerCase().replace(/\s+/g, '');
        
        div.innerHTML = `
            <div class="card h-100 shadow-sm border-0 border-top border-5 border-celeste">
                <div class="card-body text-center d-flex flex-column">
                    <img src="imgs/${nombreArchivo}.svg" alt="" class="mx-auto mb-3" style="height: 50px; object-fit: contain;" onerror="this.src='imgs/logo.png'">
                    <h6 class="fw-bold text-azul">${equipo.full_name}</h6>
                    <p class="small text-muted">${equipo.city}</p>
                    <div class="mt-auto d-grid gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="verDetalle(${equipo.id}, 'teams')">Ver Detalle</button>
                        <button class="btn btn-sm btn-danger opacity-75" onclick="eliminarFav(${equipo.id}, 'equipos')">Quitar</button>
                    </div>
                </div>
            </div>`;
        contEquiposFav.appendChild(div);
    });
};

const cargarJugadoresFavoritos = () => {
    if (!contJugadoresFav) return;
    const jugadores = JSON.parse(localStorage.getItem('nba_fav_jugadores')) || [];
    contJugadoresFav.innerHTML = '';

    if (jugadores.length === 0) {
        contJugadoresFav.innerHTML = '<p class="text-muted small">No tenés jugadores en tu draft.</p>';
        return;
    }

    jugadores.forEach(j => {
        const div = document.createElement('div');
        div.className = 'col-12 col-md-6 col-lg-3';
        div.innerHTML = `
            <div class="card h-100 shadow-sm border-0 border-top border-5 border-success border-opacity-50">
                <div class="card-body text-center d-flex flex-column">
                    <h6 class="fw-bold text-azul mb-1">${j.first_name} ${j.last_name}</h6>
                    <p class="badge bg-light text-dark border mb-3">${j.position || 'N/A'}</p>
                    <div class="mt-auto d-grid gap-2">
                        <button class="btn btn-sm btn-outline-primary" onclick="verDetalle(${j.id}, 'players')">Ver Detalle</button>
                        <button class="btn btn-sm btn-danger opacity-75" onclick="eliminarFav(${j.id}, 'jugadores')">Quitar</button>
                    </div>
                </div>
            </div>`;
        contJugadoresFav.appendChild(div);
    });
};

const eliminarFav = (id, tipo) => {
    const key = tipo === 'equipos' ? 'nba_fav_equipos' : 'nba_fav_jugadores';
    let favs = (JSON.parse(localStorage.getItem(key)) || []).filter(i => i.id !== id);
    localStorage.setItem(key, JSON.stringify(favs));
    
    cargarEquiposFavoritos();
    cargarJugadoresFavoritos();
};

const cargarInicio = async () => {
    const ahora = new Date(); 
        const hoy = ahora.getFullYear() + "-" + 
                String(ahora.getMonth() + 1).padStart(2, '0') + "-" + 
                String(ahora.getDate()).padStart(2, '0');

    const resTeams = await fetchData('teams');
    const resPlayers = await fetchData('players?per_page=35');
    const resProximos = await fetchData(`games?start_date=${hoy}&per_page=50`);

    if (!resTeams || !resPlayers || !resProximos) return;

    if (resTeams) {
        listaEquiposNBA = resTeams.data.filter(e => e.division !== "" && e.division !== null);
        mostrarEquiposCarrusel(listaEquiposNBA);
    }
    
    if (resPlayers) {
        poolJugadores = resPlayers.data.filter(j => j.position !== "").sort(() => Math.random() - 0.5);
        indiceActual = 0;
        contenedorJugadores.innerHTML = '';
        renderizarSiguienteGrupo();
        if (btnVerMas) btnVerMas.classList.remove('d-none');
    }

    if (resProximos && resProximos.data) {
        const proximos = resProximos.data
            .filter(g => {
                const fechaPartido = new Date(g.status.includes('T') ? g.status : g.date);
                return g.status !== 'Final' && fechaPartido > ahora;
            })
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 10);
        
        mostrarProximosPartidos(proximos);
    }
};

if (seccionJugadores) {
    cargarInicio();
} else if (contEquiposFav || contJugadoresFav) {
    cargarEquiposFavoritos();
    cargarJugadoresFavoritos();
}

document.getElementById('boton-reintentar')?.addEventListener('click', () => location.reload());