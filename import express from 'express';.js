import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3000;
const CONTENIDO_DIR = path.join(process.cwd(), 'contenido');
const MEDIOS_DIR = path.join(process.cwd(), 'public', 'contenido', 'medios');

// Asegurar directorios
fs.mkdirSync(CONTENIDO_DIR, { recursive: true });
fs.mkdirSync(MEDIOS_DIR, { recursive: true });

// Multer: guardar archivos subidos en public/contenido/medios
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, MEDIOS_DIR),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  }
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // servir archivos estáticos

function slugify(text) {
  return (text || '')
    .toString()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function leerTemas() {
  const files = fs.readdirSync(CONTENIDO_DIR).filter(f => f.endsWith('.json'));
  const temas = files.map(f => {
    const raw = fs.readFileSync(path.join(CONTENIDO_DIR, f), 'utf8');
    try { return JSON.parse(raw); } catch (e) { return null; }
  }).filter(Boolean);
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
  try {
    res.json({ ok: true, tema: JSON.parse(raw) });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'JSON inválido' });
  }
});

// API: crear/actualizar tema
// Campo 'imagenes' se sube como archivos (hasta 10). Otros campos via form-data o JSON.
app.post('/api/temas', upload.array('imagenes', 10), (req, res) => {
  try {
    const { titulo, categoria, descripcion, cuerpo, fecha, videos, slug } = req.body;
    if (!titulo) return res.status(400).json({ ok: false, error: 'Falta el título' });

    const finalSlug = slug && slug.trim() !== '' ? slugify(slug) : slugify(titulo);
    const archivo = path.join(CONTENIDO_DIR, finalSlug + '.json');

    const imagenes = (req.files || []).map(f => `/contenido/medios/${f.filename}`);
    // videos puede venir como JSON (array) o cadena separada por comas
    let listaVideos = [];
    if (typeof videos === 'string') {
      listaVideos = videos.split(',').map(v => v.trim()).filter(Boolean);
    } else if (Array.isArray(videos)) {
      listaVideos = videos.map(v => String(v).trim()).filter(Boolean);
    }

    let existente = {};
    if (fs.existsSync(archivo)) {
      try { existente = JSON.parse(fs.readFileSync(archivo, 'utf8')); } catch {}
    }

    const data = {
      ...existente,
      slug: finalSlug,
      titulo: titulo?.trim(),
      categoria: (categoria?.trim() || 'General'),
      descripcion: descripcion?.trim() || '',
      cuerpo: cuerpo?.trim() || '',
      fecha: fecha || (existente.fecha || new Date().toISOString().slice(0, 10)),
      imagenes: [...(existente.imagenes || []), ...imagenes],
      imagenPortada: existente.imagenPortada || imagenes[0] || null,
      videos: listaVideos.length ? listaVideos : (existente.videos || [])
    };

    fs.writeFileSync(archivo, JSON.stringify(data, null, 2), 'utf8');
    res.json({ ok: true, tema: data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: 'Error guardando el tema' });
  }
});

app.listen(PORT, () => console.log(`Cátedra Siliano corriendo en http://localhost:${PORT}`));