const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const lista = $('#lista-temas');
const contenido = $('#contenido');
if ($('#anio')) $('#anio').textContent = new Date().getFullYear();

async function cargarTemas() {
  const q = ($('#buscador')?.value || '').toLowerCase();
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
  const res = await fetch(`/api/temas/${encodeURIComponent(slug)}`);
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

// Markdown muy básico
function renderMarkdown(md){
  let html = md
    .replace(/^###\s+(.*)$/gm,'<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm,'<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm,'<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.*?)\*/g,'<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g,'<br/>');
  return html;
}

if ($('#buscador')) $('#buscador').addEventListener('input', cargarTemas);

// Cargar lista inicial
cargarTemas();

// Navegación por hash
window.addEventListener('hashchange', () => {
  const slug = location.hash.replace('#','');
  if(slug) mostrarTema(slug);
});
if(location.hash){ mostrarTema(location.hash.replace('#','')); }