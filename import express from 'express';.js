import express from 'express';
function slugify(text) {
return (text || '')
.toString()
.normalize('NFD').replace(/\p{Diacritic}/gu, '')
.toLowerCase()
.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}


function leerTemas() {
const files = fs.readdirSync(CONTENIDO_DIR).filter(f => f.endsWith('.json'));
const temas = files.map(f => {
const raw = fs.readFileSync(path.join(CONTENIDO_DIR, f), 'utf8');
try { return JSON.parse(raw); } catch (e) { return null; }
}).filter(Boolean);
// Ordenar por fecha desc
temas.sort((a, b) => new Date(b.fecha || 0) - new Date(a.fecha || 0));
return temas;
}


// API: listar temas
app.get('/api/temas', (req, res) => {
const temas = leerTemas().map(t => ({
slug: t.slug,
titulo: t.titulo,
categoria: t.categoria,
descripcion: t.descripcion,
fecha: t.fecha,
imagenPortada: t.imagenPortada || (t.imagenes?.[0] || null),
videos: t.videos || []
}));
res.json({ ok: true, temas });
});


// API: obtener un tema
app.get('/api/temas/:slug', (req, res) => {
const file = path.join(CONTENIDO_DIR, req.params.slug + '.json');
if (!fs.existsSync(file)) return res.status(404).json({ ok: false, error: 'Tema no encontrado' });
const raw = fs.readFileSync(file, 'utf8');
res.json({ ok: true, tema: JSON.parse(raw) });
});


// API: crear/actualizar tema
app.post('/api/temas', upload.array('imagenes', 10), (req, res) => {
try {
const { titulo, categoria, descripcion, cuerpo, fecha, videos, slug } = req.body;
if (!titulo) return res.status(400).json({ ok: false, error: 'Falta el título' });


const finalSlug = slug && slug.trim() !== '' ? slugify(slug) : slugify(titulo);
const archivo = path.join(CONTENIDO_DIR, finalSlug + '.json');


const imagenes = (req.files || []).map(f => `/contenido/medios/${f.filename}`);
const listaVideos = (videos || '')
.split(',')
.map(v => v.trim())
.filter(v => v.length > 0);


let existente = {};
if (fs.existsSync(archivo)) {
try { existente = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch {}
}


const data = {
...existente,
slug: finalSlug,
titulo: titulo?.trim(),
categoria: categoria?.trim() || 'General',
descripcion: descripcion?.trim() || '',
cuerpo: cuerpo?.trim() || '', // Markdown o texto
fecha: fecha || new Date().toISOString().slice(0, 10),
imagenes: [...(existente.imagenes || []), ...imagenes],
imagenPortada: existente.imagenPortada || imagenes[0] || null,
videos: listaVideos.length ? listaVideos : (existente.videos || [])
};


fs.writeFileSync(archivo, JSON.stringify(data, null, 2));
res.json({ ok: true, tema: data });
} catch (e) {
console.error(e);
res.status(500).json({ ok: false, error: 'Error guardando el tema' });
}
});


app.listen(PORT, () => console.log(`Cátedra Siliano corriendo en http://localhost:${PORT}`));

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));


const lista = $('#lista-temas');
const contenido = $('#contenido');
$('#anio').textContent = new Date().getFullYear();


async function cargarTemas() {
const q = ($('#buscador').value || '').toLowerCase();
const res = await fetch('/api/temas');
const data = await res.json();
const temas = (data.temas || []).filter(t => {
const blob = `${t.titulo} ${t.categoria} ${t.descripcion} ${(t.videos||[]).join(' ')}`.toLowerCase();
return blob.includes(q);
});


lista.innerHTML = '';
const grupos = {};
temas.forEach(t => {
grupos[t.categoria] = grupos[t.categoria] || [];
grupos[t.categoria].push(t);
});


Object.keys(grupos).sort().forEach(cat => {
const h = document.createElement('div');
h.innerHTML = `<div class="badge">${cat}</div>`;
lista.appendChild(h);
grupos[cat].forEach(t => {
const a = document.createElement('a');
a.href = `#${t.slug}`;
a.textContent = t.titulo;
a.addEventListener('click', (e)=>{ e.preventDefault(); mostrarTema(t.slug); });
lista.appendChild(a);
});
});
}


async function mostrarTema(slug){
const res = await fetch(`/api/temas/${slug}`);
const data = await res.json();
if(!data.ok){
contenido.innerHTML = `<p>No se encontró el tema.</p>`;
return;
}
const t = data.tema;
const gal = (t.imagenes||[]).map(src=>`<img src="${src}" alt="${t.titulo}">`).join('');
const vids = (t.videos||[]).map(v=>`<a href="${v}" target="_blank" rel="noopener">${v}</a>`).join('');


contenido.innerHTML = `
<article>
<h2>${t.titulo}</h2>
<div class="meta">${t.categoria} • ${t.fecha}</div>
${t.imagenPortada ? `<img src="${t.imagenPortada}" alt="${t.titulo}" style="width:100%;max-height:360px;object-fit:cover;border-radius:12px;border:1px solid #273045"/>` : ''}
${t.descripcion ? `<p>${t.descripcion}</p>` : ''}
${t.cuerpo ? `<div class="cuerpo">${renderMarkdown(t.cuerpo)}</div>` : ''}
${t.imagenes?.length ? `<h3>Galería</h3><div class="gallery">${gal}</div>` : ''}
${t.videos?.length ? `<h3>Videos</h3><div class="video-list">${vids}</div>` : ''}
</article>`;
window.scrollTo({ top: 0, behavior: 'smooth' });
}


// Markdown muy básico (negrita, itálica, enlaces, títulos)
function renderMarkdown(md){
let html = md
.replace(/^###\s+(.*)$/gm,'<h3>$1</h3>')
.replace(/^##\s+(.*)$/gm,'<h2>$1</h2>')
.replace(/^#\s+(.*)$/gm,'<h1>$1</h1>')
.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
.replace(/\*(.*?)\*/g,'<em>$1</em>')
.replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1<\/a>')
.replace(/\n/g,'<br/>');
return html;
}


$('#buscador').addEventListener('input', cargarTemas);


// Cargar lista inicial
cargarTemas();


// Navegación por hash
window.addEventListener('hashchange', () => {
const slug = location.hash.replace('#','');
if(slug) mostrarTema(slug);
});
if(location.hash){ mostrarTema(location.hash.replace('#','')); }