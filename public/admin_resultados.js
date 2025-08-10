
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs'

const supabase = createClient(
  'https://idvgzyyvgdbiwzgndxtk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
)

const juradoSelect = document.getElementById('jurado-select')
const rondaSelect = document.getElementById('ronda-select')
const tablaBody = document.querySelector('#tabla-resultados tbody')
const btnGlobal = document.getElementById('btn-global')
const btnPDF = document.getElementById('btn-exportar-pdf')
const btnExcel = document.getElementById('btn-exportar-excel')
const contenedorGlobal = document.getElementById('contenedor-global')
const seccionGlobal = document.getElementById('resultados-globales')

// Ocultar filtro de jurado
juradoSelect.style.display = 'none'
juradoSelect.parentElement.style.display = 'none'

// 1. Cargar tabla combinada por ronda
rondaSelect.addEventListener('change', cargarTablaCombinada)

async function cargarTablaCombinada() {
  const ronda = rondaSelect.value
  if (!ronda) return tablaBody.innerHTML = ''

  const jurados = ['j1', 'j2', 'j3']
  const evaluaciones = {}

  for (let j of jurados) {
    const tabla = `evaluacion_${j}_r${ronda}`
    const { data, error } = await supabase.from(tabla).select('*')
    if (error) continue

    data.forEach(row => {
      const key = row.participante + '|' + row.tema
      if (!evaluaciones[key]) {
        evaluaciones[key] = {
          participante: row.participante,
          tema: row.tema,
          jurado1: 0,
          jurado2: 0,
          jurado3: 0,
          comentarios: row.comentarios || '',
          ronda: row.ronda,
          fecha: row.creada_en
        }
      }

      const total = (row.presentacion || 0) + (row.dominio_tema || 0) +
                    (row.dominio_auditorio || 0) + (row.diccion || 0) +
                    (row.claridad_mensaje || 0) + (row.conclusion || 0)

      if (j === 'j1') evaluaciones[key].jurado1 = total
      if (j === 'j2') evaluaciones[key].jurado2 = total
      if (j === 'j3') evaluaciones[key].jurado3 = total

      if (!evaluaciones[key].fecha && row.creada_en) {
        evaluaciones[key].fecha = row.creada_en
      }
    })
  }

  tablaBody.innerHTML = ''
  let i = 1
  Object.values(evaluaciones).forEach(row => {
    const total = row.jurado1 + row.jurado2 + row.jurado3
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${i++}</td>
      <td>${row.participante}</td>
      <td>${row.tema}</td>
      <td>${row.jurado1}</td>
      <td>${row.jurado2}</td>
      <td>${row.jurado3}</td>
      <td><strong>${total}</strong></td>
      <td>${row.comentarios}</td>
      <td>${row.ronda}</td>
      <td>${new Date(row.fecha).toLocaleString()}</td>
    `
    tablaBody.appendChild(tr)
  })
}

// 2. Evaluaciones Globales
btnGlobal.addEventListener('click', async () => {
  seccionGlobal.style.display = 'block'
  contenedorGlobal.innerHTML = ''

  const rondas = [1, 2, 3]
  const jurados = ['j1', 'j2', 'j3']

  for (let ronda of rondas) {
    const header = document.createElement('h3')
    header.textContent = `Ronda ${ronda}`
    contenedorGlobal.appendChild(header)

    let todos = []
    for (let jurado of jurados) {
      const tabla = `evaluacion_${jurado}_r${ronda}`
      const { data, error } = await supabase.from(tabla).select('*')
      if (error || !data) continue

      data.forEach(row => {
        const total = (row.presentacion || 0) + (row.dominio_tema || 0) +
                      (row.dominio_auditorio || 0) + (row.diccion || 0) +
                      (row.claridad_mensaje || 0) + (row.conclusion || 0)
        todos.push({ ...row, total, jurado })
      })
    }

    for (let jurado of jurados) {
      const tabla = document.createElement('table')
      tabla.className = 'tabla-resultados'
      tabla.innerHTML = `
        <thead>
          <tr><th colspan="13">Jurado ${jurado.toUpperCase()}</th></tr>
          <tr>
            <th>Participante</th>
            <th>Tema</th>
            <th>Presentación</th>
            <th>Dominio Tema</th>
            <th>Dominio Auditorio</th>
            <th>Dicción</th>
            <th>Claridad</th>
            <th>Conclusión</th>
            <th>Total</th>
            <th>Comentarios</th>
            <th>Jurado</th>
            <th>Ronda</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody></tbody>
      `

      const tbody = tabla.querySelector('tbody')
      todos.filter(r => r.jurado === jurado).forEach((row, i) => {
        const tr = document.createElement('tr')
        tr.innerHTML = `
          <td>${row.participante}</td>
          <td>${row.tema}</td>
          <td>${row.presentacion}</td>
          <td>${row.dominio_tema}</td>
          <td>${row.dominio_auditorio}</td>
          <td>${row.diccion}</td>
          <td>${row.claridad_mensaje}</td>
          <td>${row.conclusion}</td>
          <td><strong>${row.total}</strong></td>
          <td>${row.comentarios || ''}</td>
          <td>${row.jurado}</td>
          <td>${row.ronda}</td>
          <td>${new Date(row.creada_en).toLocaleString()}</td>
        `
        tbody.appendChild(tr)
      })

      contenedorGlobal.appendChild(tabla)
    }
  }
})

// 3. Exportar a Excel
btnExcel.addEventListener('click', () => {
  const wb = XLSX.utils.book_new()
  document.querySelectorAll('.tabla-resultados').forEach((tabla, index) => {
    const ws = XLSX.utils.table_to_sheet(tabla)
    XLSX.utils.book_append_sheet(wb, ws, `Tabla_${index + 1}`)
  })
  XLSX.writeFile(wb, 'evaluaciones_globales.xlsx')
})

// 4. Exportar a PDF (usa print)
btnPDF.addEventListener('click', () => {
  window.print()
})

const btnDesempate = document.getElementById('activar-desempate-btn');

// Al final de cargar los datos:
function verificarEmpate() {
  const rows = [...tbody.querySelectorAll('tr')];
  const puntajes = rows.map(r => parseInt(r.children[6].innerText));
  const conteo = {};
  puntajes.forEach(p => conteo[p] = (conteo[p] || 0) + 1);
  
  const empate = Object.values(conteo).some(c => c > 1);
  if (empate) {
    btnDesempate.style.display = 'inline-block';
  }
}

btnDesempate.addEventListener('click', async () => {
  const { data, error } = await supabase
    .from('desempates')
    .insert([{ ronda: `7mo lugar`, activo: true }]);

  if (error) {
    alert("Error al activar desempate");
  } else {
    alert("Desempate activado para 7mo lugar");
    btnDesempate.disabled = true;
    btnDesempate.innerText = "Desempate activado";
  }
});

const { data: desempate } = await supabase
  .from('desempates')
  .select('activo')
  .eq('ronda', '7mo lugar')
  .eq('activo', true)
  .maybeSingle();

if (desempate) {
  document.getElementById('btn-desempate-container').style.display = 'block';
}

