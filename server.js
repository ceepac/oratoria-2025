// server.js — ESM listo para Render (sin dotenv)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// === Supabase ===
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Middlewares
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// Servir estáticos con inicio.html como página principal
const pathPublic = path.join(__dirname, "public");
app.use(express.static(pathPublic, { index: "inicio.html" }));

// Home
app.get("/", (_req, res) => {
  res.sendFile(path.join(pathPublic, "inicio.html"));
});

// Aux: participantes
app.get("/api/participantes", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("participantes")
      .select("nombre_completo, edad, nivel_estudios, experiencia_oratoria")
      .order("nombre_completo", { ascending: true });

    if (error) throw error;
    res.status(200).json(data || []);
  } catch (err) {
    console.error("Error /api/participantes:", err);
    res.status(500).json({ error: "No se pudieron obtener los participantes" });
  }
});

app.get("/api/participante", async (req, res) => {
  const { nombre } = req.query;
  if (!nombre) return res.status(400).json({ error: "Nombre requerido" });

  try {
    const { data, error } = await supabase
      .from("participantes")
      .select("*")
      .eq("nombre_completo", nombre)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: "Participante no encontrado" });
    res.status(200).json(data);
  } catch (err) {
    console.error("Error /api/participante:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

// Guardar evaluación
const TABLAS_PERMITIDAS = new Set([
  "evaluacion_j1_r1","evaluacion_j1_r2","evaluacion_j1_r3",
  "evaluacion_j2_r1","evaluacion_j2_r2","evaluacion_j2_r3",
  "evaluacion_j3_r1","evaluacion_j3_r2","evaluacion_j3_r3"
]);

app.post("/api/evaluacion", async (req, res) => {
  try {
    const { tabla, jurado, ronda, ...resto } = req.body || {};
    if (!tabla || !TABLAS_PERMITIDAS.has(tabla)) {
      return res.status(400).json({ error: "Tabla no permitida o ausente" });
    }
    if (!jurado || !ronda) {
      return res.status(400).json({ error: "Faltan jurado o ronda" });
    }
    if (!resto.participante || !resto.tema) {
      return res.status(400).json({ error: "Faltan participante o tema" });
    }

    const evaluacion = {
      jurado,
      ronda,
      ...resto,
      creada_en: resto.creada_en || new Date().toISOString(),
    };

    const { error } = await supabase.from(tabla).insert([evaluacion]);
    if (error) throw error;

    res.status(201).json({ ok: true, mensaje: "Evaluación guardada correctamente" });
  } catch (err) {
    console.error("Error /api/evaluacion:", err);
    res.status(500).json({ error: "Error al guardar la evaluación" });
  }
});

// Fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(pathPublic, "inicio.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});

const TABLAS_PERMITIDAS = new Set([
  "evaluacion_j1_r1","evaluacion_j1_r2","evaluacion_j1_r3",
  "evaluacion_j2_r1","evaluacion_j2_r2","evaluacion_j2_r3",
  "evaluacion_j3_r1","evaluacion_j3_r2","evaluacion_j3_r3",
  // 👇 NUEVAS
  "desempate_j1_r1","desempate_j2_r1","desempate_j3_r1",
  "desempate_j1_r2","desempate_j2_r2","desempate_j3_r2"
]);
