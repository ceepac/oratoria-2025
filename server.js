const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
dotenv.config();

// Inicializar app
const app = express();
const port = process.env.PORT || 3000;

// Inicializar cliente de Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/inicio.html'));
});

// ✅ Obtener todos los participantes
app.get('/api/participantes', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('participantes')
      .select('nombre, apellido1, apellido2');

    if (error) {
      console.error('Error al obtener participantes:', error);
      return res.status(500).json({ error: 'No se pudieron obtener los participantes' });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error('Error inesperado en /api/participantes:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ✅ Buscar un participante por nombre completo
app.get('/api/participante', async (req, res) => {
  const { nombre } = req.query;

  if (!nombre) {
    return res.status(400).json({ error: 'Nombre requerido' });
  }

  try {
    const partes = nombre.trim().split(' ');

    const { data, error } = await supabase
      .from('participantes')
      .select('*')
      .or(`nombre.ilike.%${partes[0]}%,apellido1.ilike.%${partes[1] || ''}%,apellido2.ilike.%${partes[2] || ''}%`);

    if (error) {
      console.error('Error al buscar participante:', error);
      return res.status(500).json({ error: 'Error al buscar participante' });
    }

    if (data.length === 0) {
      return res.status(404).json({ error: 'Participante no encontrado' });
    }

    res.status(200).json(data[0]);
  } catch (err) {
    console.error('Error en servidor:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ✅ Guardar evaluación (corrige el problema de jurado/ronda)
app.post('/api/evaluacion', async (req, res) => {
  try {
    const { tabla, jurado, ronda, ...resto } = req.body;

    if (!tabla || !jurado || !ronda) {
      return res.status(400).json({ error: 'Faltan campos requeridos: jurado, ronda o tabla' });
    }

    const evaluacion = {
      jurado,
      ronda,
      ...resto
    };

    const { error } = await supabase.from(tabla).insert([evaluacion]);

    if (error) {
      console.error('Error al insertar en Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(200).json({ message: 'Evaluación guardada correctamente' });
  } catch (err) {
    console.error('Error inesperado:', err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`✅ Servidor corriendo en: http://localhost:${port}`);
});
