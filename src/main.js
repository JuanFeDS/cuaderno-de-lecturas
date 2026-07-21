import DATOS from "./data/libros.json";
import MAPA from "./data/mapa.json";

const LIBROS = DATOS.libros;
const PAUSADOS = DATOS.pausados;

const NUM = new Intl.NumberFormat("es-CO");
const fmt = (valor) => valor == null ? "—" : NUM.format(valor);
const fmt1 = (valor) => valor == null ? "—" : valor.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const fmt2 = (valor) => valor == null ? "—" : valor.toLocaleString("es-CO", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const media = (lista) => lista.length ? lista.reduce((a, b) => a + b, 0) / lista.length : null;
const suma = (lista) => lista.reduce((a, b) => a + b, 0);

const GENEROS_SLOT = [
  { nombre: "Fantasía", varbl: "--s-fantasia" },
  { nombre: "Ciencia Ficción", varbl: "--s-cifi" },
  { nombre: "Realismo mágico", varbl: "--s-realismo" },
  { nombre: "Distopía", varbl: "--s-distopia" },
  { nombre: "Drama", varbl: "--s-drama", banda: true },
  { nombre: "Thriller", varbl: "--s-thriller", banda: true },
];
function slotDeLibro(libro) {
  for (const slot of GENEROS_SLOT) {
    if (libro.genero.includes(slot.nombre)) return slot;
  }
  return { nombre: "Otros géneros", varbl: "--s-otros" };
}
function pintarLeyendaGeneros(contenedor, libros) {
  contenedor.replaceChildren(...[...GENEROS_SLOT, { nombre: "Otros géneros", varbl: "--s-otros" }]
    .map((slot) => ({ slot, cuenta: libros.filter((l) => slotDeLibro(l).nombre === slot.nombre).length }))
    .filter(({ cuenta }) => cuenta > 0)
    .map(({ slot, cuenta }) => {
      const nodo = document.createElement("span");
      nodo.innerHTML = `<i class="${slot.banda ? "banda" : ""}" style="background-color:var(${slot.varbl})"></i>${slot.nombre} (${cuenta})`;
      return nodo;
    }));
}

/* ---------- tema ---------- */
const raiz = document.documentElement;
const temaGuardado = localStorage.getItem("tema-cuaderno");
if (temaGuardado) raiz.dataset.theme = temaGuardado;
document.getElementById("btn-tema").addEventListener("click", () => {
  const oscuroAhora = raiz.dataset.theme === "dark" ||
    (!raiz.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  raiz.dataset.theme = oscuroAhora ? "light" : "dark";
  localStorage.setItem("tema-cuaderno", raiz.dataset.theme);
});

/* ---------- pestañas ---------- */
const tabs = [...document.querySelectorAll('[role="tab"]')];
const TABS_AJUSTADAS = ["tab-estanteria", "tab-anios"];
function activarTab(tab) {
  tabs.forEach((otro) => {
    const activo = otro === tab;
    otro.setAttribute("aria-selected", String(activo));
    document.getElementById(otro.getAttribute("aria-controls")).classList.toggle("activa", activo);
  });
  document.body.classList.toggle("ajustada", TABS_AJUSTADAS.includes(tab.id));
  if (tab.id === "tab-anios") requestAnimationFrame(() => pintarGraficosAnios());
  if (tab.id === "tab-autores") requestAnimationFrame(() => pintarCintaTiempo());
}
document.body.classList.add("ajustada");
tabs.forEach((tab, indice) => {
  tab.addEventListener("click", () => activarTab(tab));
  tab.addEventListener("keydown", (evento) => {
    if (evento.key === "ArrowRight" || evento.key === "ArrowLeft") {
      const paso = evento.key === "ArrowRight" ? 1 : -1;
      const siguiente = tabs[(indice + paso + tabs.length) % tabs.length];
      siguiente.focus(); activarTab(siguiente);
    }
  });
});

/* ---------- tooltip ---------- */
const tooltip = document.getElementById("tooltip");
function mostrarTooltip(html, x, y) {
  tooltip.innerHTML = html;
  tooltip.style.display = "block";
  const ancho = tooltip.offsetWidth, alto = tooltip.offsetHeight;
  let px = x + 14, py = y + 14;
  if (px + ancho > innerWidth - 8) px = x - ancho - 14;
  if (py + alto > innerHeight - 8) py = y - alto - 14;
  tooltip.style.left = px + "px";
  tooltip.style.top = py + "px";
}
function ocultarTooltip() { tooltip.style.display = "none"; }

function filasFichaLibro(libro) {
  return [
    ["Autor", libro.autor], ["País", libro.nacionalidad.join(", ") || "—"],
    ["Publicado", libro.publicado || "—"], ["Leído", libro.anio],
    ["Género", libro.genero.join(", ") || "—"], ["Formato", libro.formato || "—"],
    ["Páginas", fmt(libro.paginas)], ["Días", fmt(libro.dias)],
    ["Ritmo", libro.ratio == null ? "—" : fmt1(libro.ratio) + " pág/día"],
    ["Calificación", fmt2(libro.calif)],
  ];
}
function fichaLibro(libro) {
  return `<div class="tt-titulo">${libro.libro}</div>` +
    filasFichaLibro(libro).map(([clave, valor]) => `<div class="tt-fila"><span>${clave}</span><b>${valor}</b></div>`).join("");
}

/* ---------- helpers SVG ---------- */
const NS = "http://www.w3.org/2000/svg";
function el(nombre, atributos, padre) {
  const nodo = document.createElementNS(NS, nombre);
  for (const clave in atributos) nodo.setAttribute(clave, atributos[clave]);
  if (padre) padre.appendChild(nodo);
  return nodo;
}
function techoLimpio(maximo) {
  const bruto = maximo * 1.08;
  const magnitud = Math.pow(10, Math.floor(Math.log10(bruto)));
  for (const factor of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    if (factor * magnitud >= bruto) return factor * magnitud;
  }
  return 10 * magnitud;
}
function marco(contenedor, opciones) {
  const { alto = 240, padIzq = 44, padDer = 14, padArr = 14, padAbj = 28, maxY, minY = 0, ticks = 4, fmtTick = fmt, ancho = 640 } = opciones;
  const svg = el("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: "grafico", role: "img" });
  const yDe = (valor) => padArr + (1 - (valor - minY) / (maxY - minY)) * (alto - padArr - padAbj);
  for (let i = 0; i <= ticks; i++) {
    const valor = minY + (maxY - minY) * (i / ticks);
    const y = yDe(valor);
    el("line", { x1: padIzq, x2: ancho - padDer, y1: y, y2: y, class: i === 0 ? "eje" : "grid" }, svg);
    const texto = el("text", { x: padIzq - 8, y: y + 4, "text-anchor": "end" }, svg);
    texto.textContent = fmtTick(Math.round(valor * 100) / 100);
  }
  contenedor.replaceChildren(svg);
  return { svg, ancho, alto, padIzq, padDer, padArr, padAbj, yDe };
}

function graficoColumnas(contenedor, datos, opciones = {}) {
  const maxY = techoLimpio(Math.max(...datos.map((d) => d.valor)));
  const m = marco(contenedor, { maxY, fmtTick: opciones.fmtTick || fmt, alto: opciones.alto || 240, ancho: opciones.ancho || 420 });
  const zona = m.ancho - m.padIzq - m.padDer;
  const banda = zona / datos.length;
  const anchoCol = Math.min(24, banda * 0.5);
  const color = opciones.color || "var(--acento)";
  datos.forEach((dato, i) => {
    const x = m.padIzq + banda * i + (banda - anchoCol) / 2;
    const y = m.yDe(dato.valor);
    const altoCol = m.alto - m.padAbj - y;
    const barra = el("path", {
      d: `M ${x} ${y + Math.min(4, altoCol)} q 0 -4 4 -4 h ${anchoCol - 8} q 4 0 4 4 v ${Math.max(0, altoCol - Math.min(4, altoCol))} h ${-anchoCol} Z`,
      fill: color,
    }, m.svg);
    const cap = el("text", { x: x + anchoCol / 2, y: y - 7, "text-anchor": "middle", class: "valor" }, m.svg);
    cap.textContent = (opciones.fmtValor || fmt)(dato.valor);
    const etiqueta = el("text", { x: x + anchoCol / 2, y: m.alto - m.padAbj + 18, "text-anchor": "middle" }, m.svg);
    etiqueta.textContent = dato.etiqueta;
    const zonaHover = el("rect", { x: m.padIzq + banda * i, y: m.padArr, width: banda, height: m.alto - m.padArr - m.padAbj, fill: "transparent" }, m.svg);
    if (opciones.tooltip) {
      zonaHover.addEventListener("mousemove", (ev) => mostrarTooltip(opciones.tooltip(dato), ev.clientX, ev.clientY));
      zonaHover.addEventListener("mouseleave", ocultarTooltip);
    }
  });
}

function graficoLinea(contenedor, datos, opciones = {}) {
  const valores = datos.map((d) => d.valor);
  const minY = opciones.minY ?? 0;
  const maxY = opciones.maxY ?? techoLimpio(Math.max(...valores));
  const m = marco(contenedor, { maxY, minY, fmtTick: opciones.fmtTick || fmt, alto: opciones.alto || 250 });
  const zona = m.ancho - m.padIzq - m.padDer;
  const banda = zona / datos.length;
  const xDe = (i) => m.padIzq + banda * i + banda / 2;
  const camino = datos.map((d, i) => `${i ? "L" : "M"} ${xDe(i)} ${m.yDe(d.valor)}`).join(" ");
  el("path", { d: camino, fill: "none", stroke: "var(--acento)", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, m.svg);
  datos.forEach((dato, i) => {
    el("circle", { cx: xDe(i), cy: m.yDe(dato.valor), r: 6.5, fill: "var(--superficie)" }, m.svg);
    el("circle", { cx: xDe(i), cy: m.yDe(dato.valor), r: 4.5, fill: "var(--acento)" }, m.svg);
    const cap = el("text", { x: xDe(i), y: m.yDe(dato.valor) - 12, "text-anchor": "middle", class: "valor" }, m.svg);
    cap.textContent = fmt2(dato.valor);
    const etiqueta = el("text", { x: xDe(i), y: m.alto - m.padAbj + 18, "text-anchor": "middle" }, m.svg);
    etiqueta.textContent = dato.etiqueta;
    const zonaHover = el("rect", { x: m.padIzq + banda * i, y: m.padArr, width: banda, height: m.alto - m.padArr - m.padAbj, fill: "transparent" }, m.svg);
    if (opciones.tooltip) {
      zonaHover.addEventListener("mousemove", (ev) => mostrarTooltip(opciones.tooltip(dato), ev.clientX, ev.clientY));
      zonaHover.addEventListener("mouseleave", ocultarTooltip);
    }
  });
}

function graficoRadar(contenedor, ejes, opciones = {}) {
  const maxValor = opciones.maxValor ?? 5, niveles = opciones.niveles ?? 5;
  const ancho = 380, alto = 300, cx = ancho / 2, cy = alto / 2, radio = 92;
  const n = ejes.length;
  const angulo = (i) => -Math.PI / 2 + i * (2 * Math.PI / n);
  const punto = (i, valor) => {
    const r = (valor / maxValor) * radio;
    return { x: cx + r * Math.cos(angulo(i)), y: cy + r * Math.sin(angulo(i)) };
  };
  const svg = el("svg", { viewBox: `0 0 ${ancho} ${alto}`, class: "grafico", role: "img" });
  for (let nivel = 1; nivel <= niveles; nivel++) {
    const puntos = ejes.map((_, i) => punto(i, (maxValor * nivel) / niveles));
    el("polygon", { points: puntos.map((p) => `${p.x},${p.y}`).join(" "), fill: "none", class: nivel === niveles ? "eje" : "grid" }, svg);
  }
  ejes.forEach((_, i) => {
    const p = punto(i, maxValor);
    el("line", { x1: cx, y1: cy, x2: p.x, y2: p.y, class: "grid" }, svg);
  });
  const color = opciones.color || "var(--acento)";
  const puntosDato = ejes.map((eje, i) => punto(i, eje.valor));
  el("polygon", {
    points: puntosDato.map((p) => `${p.x},${p.y}`).join(" "),
    fill: color, "fill-opacity": 0.18, stroke: color, "stroke-width": 2, "stroke-linejoin": "round",
  }, svg);
  ejes.forEach((eje, i) => {
    const p = puntosDato[i];
    el("circle", { cx: p.x, cy: p.y, r: 4.5, fill: "var(--superficie)", stroke: color, "stroke-width": 2 }, svg);
    const angEtiqueta = angulo(i);
    const lx = cx + (radio + 34) * Math.cos(angEtiqueta), ly = cy + (radio + 26) * Math.sin(angEtiqueta);
    const anclaje = Math.cos(angEtiqueta) > 0.3 ? "start" : Math.cos(angEtiqueta) < -0.3 ? "end" : "middle";
    const etq = el("text", { x: lx, y: ly, "text-anchor": anclaje }, svg);
    etq.textContent = eje.etiqueta;
    const val = el("text", { x: lx, y: ly + 15, "text-anchor": anclaje, class: "valor" }, svg);
    val.textContent = fmt2(eje.valor);
    const zonaHover = el("circle", { cx: p.x, cy: p.y, r: 13, fill: "transparent" }, svg);
    zonaHover.addEventListener("mousemove", (ev) => mostrarTooltip(
      `<div class="tt-titulo">${eje.etiqueta}</div><div class="tt-fila"><span>Valor</span><b>${fmt2(eje.valor)}</b></div>`,
      ev.clientX, ev.clientY));
    zonaHover.addEventListener("mouseleave", ocultarTooltip);
  });
  contenedor.replaceChildren(svg);
}

function graficoDispersion(contenedor, puntos, opciones) {
  const { xDe: valorX, yDe: valorY, maxY, minX, maxX, fmtEjeX, ticksX, alto = 280 } = opciones;
  const m = marco(contenedor, { maxY, alto, fmtTick: opciones.fmtTickY || fmt1 });
  const zona = m.ancho - m.padIzq - m.padDer;
  const xPix = (valor) => m.padIzq + ((valor - minX) / (maxX - minX)) * zona;
  ticksX.forEach((tick) => {
    const etiqueta = el("text", { x: xPix(tick), y: m.alto - m.padAbj + 18, "text-anchor": "middle" }, m.svg);
    etiqueta.textContent = fmtEjeX(tick);
  });
  const nodos = puntos.map((punto) => {
    const cx = xPix(valorX(punto)), cy = m.yDe(valorY(punto));
    const color = opciones.colorDe ? opciones.colorDe(punto) : "var(--acento)";
    el("circle", { cx, cy, r: 6.5, fill: "var(--superficie)" }, m.svg);
    el("circle", { cx, cy, r: 4.5, fill: color, "fill-opacity": 0.85 }, m.svg);
    return { cx, cy, punto };
  });
  m.svg.addEventListener("mousemove", (evento) => {
    const caja = m.svg.getBoundingClientRect();
    const mx = (evento.clientX - caja.left) * (m.ancho / caja.width);
    const my = (evento.clientY - caja.top) * (m.alto / caja.height);
    let mejor = null, mejorDist = Infinity;
    nodos.forEach((nodo) => {
      const dist = (nodo.cx - mx) ** 2 + (nodo.cy - my) ** 2;
      if (dist < mejorDist) { mejorDist = dist; mejor = nodo; }
    });
    if (mejor && mejorDist < 40 * 40) mostrarTooltip(fichaLibro(mejor.punto), evento.clientX, evento.clientY);
    else ocultarTooltip();
  });
  m.svg.addEventListener("mouseleave", ocultarTooltip);
}

function barrasH(contenedor, filas, opciones = {}) {
  const maximo = opciones.max || Math.max(...filas.map((f) => f.valor));
  contenedor.replaceChildren(...filas.map((fila) => {
    const nodo = document.createElement("div");
    nodo.className = "fila-h";
    const porcentaje = Math.max(1.5, (fila.valor / maximo) * 100);
    nodo.innerHTML =
      `<span class="cat" title="${fila.etiqueta}">${fila.etiqueta}</span>` +
      `<span class="pista"><span class="barra" style="width:${porcentaje}%"></span></span>` +
      `<span class="cifra">${(opciones.fmtValor || fmt)(fila.valor)}</span>`;
    if (fila.tooltip) {
      nodo.addEventListener("mousemove", (ev) => mostrarTooltip(fila.tooltip, ev.clientX, ev.clientY));
      nodo.addEventListener("mouseleave", ocultarTooltip);
    }
    return nodo;
  }));
}

function pictogramaCalificaciones(contenedor, filas) {
  contenedor.className = "filas-califs";
  contenedor.replaceChildren(...filas.map((fila) => {
    const nodo = document.createElement("div");
    nodo.className = "fila-calif";
    const cabecera = document.createElement("div");
    cabecera.className = "cabecera-calif";
    cabecera.innerHTML = `<span>${fila.etiqueta}</span><b>${fila.libros.length}</b>`;
    const tira = document.createElement("div");
    tira.className = "mini-lomos";
    fila.libros.forEach((libro) => {
      const slot = slotDeLibro(libro);
      const lomo = document.createElement("span");
      lomo.className = "mini-lomo" + (slot.banda ? " banda" : "");
      lomo.style.backgroundColor = `var(${slot.varbl})`;
      lomo.addEventListener("mousemove", (ev) => mostrarTooltip(fichaLibro(libro), ev.clientX, ev.clientY));
      lomo.addEventListener("mouseleave", ocultarTooltip);
      tira.appendChild(lomo);
    });
    nodo.append(cabecera, tira);
    return nodo;
  }));
}

function estanteriaGeneros(contenedor, filas) {
  const tira = document.createElement("div");
  tira.className = "mini-lomos";
  const leyenda = document.createElement("div");
  leyenda.className = "leyenda";
  filas.forEach((fila) => {
    const grupo = document.createElement("span");
    grupo.className = "grupo-lomos";
    for (let i = 0; i < fila.valor; i++) {
      const lomo = document.createElement("span");
      lomo.className = "mini-lomo" + (fila.banda ? " banda" : "") + (fila.veta ? ` ${fila.veta}` : "");
      lomo.style.backgroundColor = `var(${fila.varbl})`;
      const libro = fila.libros && fila.libros[i];
      if (libro) {
        lomo.addEventListener("mousemove", (ev) => mostrarTooltip(fichaLibro(libro), ev.clientX, ev.clientY));
        lomo.addEventListener("mouseleave", ocultarTooltip);
      }
      grupo.appendChild(lomo);
    }
    tira.appendChild(grupo);
    const item = document.createElement("span");
    const claseIcono = [fila.banda ? "banda" : "", fila.veta || ""].filter(Boolean).join(" ");
    item.innerHTML = `<i class="${claseIcono}" style="background-color:var(${fila.varbl})"></i>${fila.etiqueta} (${fila.valor})`;
    leyenda.appendChild(item);
  });
  contenedor.replaceChildren(tira, leyenda);
}

function listaLibros(contenedor, filas, opciones = {}) {
  contenedor.replaceChildren(...filas.map((fila, indice) => {
    const nodo = document.createElement("div");
    nodo.className = "item-libro" + (opciones.colorGenero ? " con-genero" : "");
    if (opciones.colorGenero) nodo.style.setProperty("--color-genero", `var(${slotDeLibro(fila.libro).varbl})`);
    nodo.innerHTML =
      `<span class="pos">${indice + 1}</span>` +
      `<span class="titulo">${fila.libro.libro}<small>${fila.libro.autor} · ${fila.libro.anio}</small></span>` +
      `<span class="dato">${fila.dato}</span>`;
    nodo.addEventListener("mousemove", (ev) => mostrarTooltip(fichaLibro(fila.libro), ev.clientX, ev.clientY));
    nodo.addEventListener("mouseleave", ocultarTooltip);
    return nodo;
  }));
}

function kpi(etiqueta, valor, detalle) {
  return `<div class="kpi"><div class="etiqueta">${etiqueta}</div><div class="valor">${valor}</div>` +
    (detalle ? `<div class="detalle">${detalle}</div>` : "") + `</div>`;
}

/* ================= datos derivados ================= */
const anios = [...new Set(LIBROS.map((l) => l.anio))].sort();
document.getElementById("ceja-rango").textContent =
  `Registro de lectura · ${anios[0]} — ${anios[anios.length - 1]}`;

const conCalif = LIBROS.filter((l) => l.calif != null);
const conPaginas = LIBROS.filter((l) => l.paginas != null);
const conRatio = LIBROS.filter((l) => l.ratio != null);

/* ---------- estantería ---------- */
const totalPaginas = suma(conPaginas.map((l) => l.paginas));
const totalDias = suma(LIBROS.filter((l) => l.dias != null).map((l) => l.dias));
const califGlobal = media(conCalif.map((l) => l.calif));
const libroLargo = conPaginas.reduce((a, b) => (b.paginas > a.paginas ? b : a));
document.getElementById("kpis-resumen").innerHTML =
  kpi("Libros terminados", fmt(LIBROS.length), `${anios.length} años de registro`) +
  kpi("Páginas leídas", fmt(totalPaginas),
    `${fmt(conPaginas.length)} libros con registro, ${Math.round(100 * suma(conPaginas.filter((l) => l.formato === "Digital").map((l) => l.paginas)) / totalPaginas)}% en digital`) +
  kpi("Días de lectura", fmt(totalDias), `entre inicio y fin de cada libro`) +
  kpi("Calificación media", fmt2(califGlobal), "sobre 5");

const maxPaginas = Math.max(...conPaginas.map((l) => l.paginas));
const contenedorEstantes = document.getElementById("estantes");
anios.forEach((anio) => {
  const grupo = document.createElement("div");
  grupo.className = "estante";
  const lomos = document.createElement("div");
  lomos.className = "lomos";
  const librosAnio = LIBROS.filter((l) => l.anio === anio);
  librosAnio.forEach((libro) => {
    const lomo = document.createElement("span");
    lomo.className = "lomo";
    const altura = libro.paginas == null ? 22 : 15 + (libro.paginas / maxPaginas) * 79;
    const slot = slotDeLibro(libro);
    lomo.style.height = altura.toFixed(1) + "%";
    lomo.style.backgroundColor = `var(${slot.varbl})`;
    if (slot.banda) lomo.classList.add("banda");
    lomo.addEventListener("mousemove", (ev) => {
      mostrarTooltip(fichaLibro(libro), ev.clientX, ev.clientY);
      lomo.classList.add("resaltado");
    });
    lomo.addEventListener("mouseleave", () => { ocultarTooltip(); lomo.classList.remove("resaltado"); });
    lomos.appendChild(lomo);
  });
  const etiqueta = document.createElement("div");
  etiqueta.className = "anio";
  etiqueta.innerHTML = `<b>${anio}</b> · ${librosAnio.length}`;
  grupo.append(lomos, etiqueta);
  contenedorEstantes.appendChild(grupo);
});

pintarLeyendaGeneros(document.getElementById("leyenda-generos"), LIBROS);

const mejorLibro = conCalif.reduce((a, b) => (b.calif > a.calif ? b : a));
document.getElementById("frase-resumen").innerHTML =
  `El libro más largo de la estantería es <b>${libroLargo.libro}</b> (${fmt(libroLargo.paginas)} páginas); ` +
  `el mejor calificado, <b>${mejorLibro.libro}</b> con <b>${fmt2(mejorLibro.calif)}</b>.`;

/* ---------- años ---------- */
const porAnio = anios.map((anio) => {
  const libros = LIBROS.filter((l) => l.anio === anio);
  return {
    anio, libros,
    paginas: suma(libros.filter((l) => l.paginas != null).map((l) => l.paginas)),
    calif: media(libros.filter((l) => l.calif != null).map((l) => l.calif)),
  };
});
function altoSegunCelda(id, anchoBase, altoDefecto, altoMin, altoMax) {
  const nodo = document.getElementById(id);
  const caja = nodo.getBoundingClientRect();
  const alto = (caja.width > 60 && caja.height > 60)
    ? Math.max(altoMin, Math.min(altoMax, anchoBase * (caja.height / caja.width)))
    : altoDefecto;
  return { nodo, alto: Math.round(alto) };
}
function pintarGraficosAnios() {
  const libros = altoSegunCelda("graf-libros-anio", 420, 240, 170, 420);
  graficoColumnas(libros.nodo,
    porAnio.map((d) => ({ etiqueta: String(d.anio), valor: d.libros.length })),
    { alto: libros.alto, tooltip: (d) => `<div class="tt-titulo">${d.etiqueta}</div><div class="tt-fila"><span>Libros</span><b>${d.valor}</b></div>` });
  const paginas = altoSegunCelda("graf-paginas-anio", 420, 240, 170, 420);
  graficoColumnas(paginas.nodo,
    porAnio.map((d) => ({ etiqueta: String(d.anio), valor: d.paginas })),
    { alto: paginas.alto, tooltip: (d) => `<div class="tt-titulo">${d.etiqueta}</div><div class="tt-fila"><span>Páginas</span><b>${fmt(d.valor)}</b></div>` });
  const calif = altoSegunCelda("graf-calif-anio", 640, 420, 260, 560);
  graficoLinea(calif.nodo,
    porAnio.map((d) => ({ etiqueta: String(d.anio), valor: Math.round(d.calif * 100) / 100 })),
    { minY: 2, maxY: 5, fmtTick: fmt2, alto: calif.alto });
}
pintarGraficosAnios();
window.addEventListener("resize", () => {
  if (document.getElementById("panel-anios").classList.contains("activa")) pintarGraficosAnios();
});

const mejorAnio = porAnio.reduce((a, b) => (b.calif > a.calif ? b : a));
const anioProlifico = porAnio.reduce((a, b) => (b.libros.length > a.libros.length ? b : a));
document.getElementById("frase-anios").innerHTML =
  `<b>${mejorAnio.anio}</b> fue el año mejor calificado (${fmt2(mejorAnio.calif)} de media) y ` +
  `<b>${anioProlifico.anio}</b> el más prolífico, con <b>${anioProlifico.libros.length}</b> libros terminados.`;

/* ---------- géneros y autores ---------- */
const conteoGeneros = {};
const califGeneros = {};
LIBROS.forEach((libro) => {
  libro.genero.forEach((genero) => {
    conteoGeneros[genero] = (conteoGeneros[genero] || 0) + 1;
    if (libro.calif != null) (califGeneros[genero] = califGeneros[genero] || []).push(libro.calif);
  });
});
const generosOrdenados = Object.entries(conteoGeneros).sort((a, b) => b[1] - a[1]);
const HUES_CICLO = GENEROS_SLOT.map((s) => s.varbl);
let indiceCola = 0;
const filasEstanteria = generosOrdenados.map(([genero, cuenta]) => {
  const libros = LIBROS.filter((l) => l.genero.includes(genero));
  const slot = GENEROS_SLOT.find((s) => s.nombre === genero);
  if (slot) return { etiqueta: genero, valor: cuenta, varbl: slot.varbl, banda: !!slot.banda, libros };
  const hue = HUES_CICLO[indiceCola % HUES_CICLO.length];
  const veta = Math.floor(indiceCola / HUES_CICLO.length) % 2 === 0 ? "veta-a" : "veta-b";
  indiceCola++;
  return { etiqueta: genero, valor: cuenta, varbl: hue, veta, libros };
});
estanteriaGeneros(document.getElementById("graf-generos"), filasEstanteria);

const califPorGenero = Object.entries(califGeneros)
  .filter(([, lista]) => lista.length >= 3)
  .map(([genero, lista]) => ({ etiqueta: `${genero} (${lista.length})`, valor: Math.round(media(lista) * 100) / 100 }))
  .sort((a, b) => b.valor - a.valor);
barrasH(document.getElementById("graf-calif-genero"), califPorGenero, { max: 5, fmtValor: fmt2 });

const conteoAutores = {};
LIBROS.forEach((libro) => libro.autor.split(",").forEach((autor) => {
  const nombre = autor.trim();
  if (nombre) conteoAutores[nombre] = (conteoAutores[nombre] || 0) + 1;
}));
const autoresTop = Object.entries(conteoAutores).sort((a, b) => b[1] - a[1]).slice(0, 8);
barrasH(document.getElementById("graf-autores"),
  autoresTop.map(([autor, cuenta]) => ({ etiqueta: autor, valor: cuenta })));

const conteoPaises = {};
LIBROS.forEach((libro) => libro.nacionalidad.forEach((pais) => {
  conteoPaises[pais] = (conteoPaises[pais] || 0) + 1;
}));

/* ---------- mapa de nacionalidades ---------- */
const PAIS_EN = {
  "Estados Unidos": "United States of America", "Reino Unido": "United Kingdom",
  "Colombia": "Colombia", "Japón": "Japan", "Francia": "France", "Alemania": "Germany",
  "China": "China", "Argentina": "Argentina", "Italia": "Italy", "Canadá": "Canada",
  "España": "Spain", "Polonia": "Poland", "Chile": "Chile", "Cuba": "Cuba",
  "Perú": "Peru", "Uruguay": "Uruguay", "India": "India", "Noruega": "Norway",
  "Irlanda": "Ireland", "Chequia": "Czechia",
};
const EN_A_ES = Object.fromEntries(Object.entries(PAIS_EN).map(([es, en]) => [en, es]));
const TRAMOS_MAPA = [
  { max: 1, etiqueta: "1", varbl: "--mapa-b1" },
  { max: 3, etiqueta: "2–3", varbl: "--mapa-b2" },
  { max: 8, etiqueta: "4–8", varbl: "--mapa-b3" },
  { max: Infinity, etiqueta: "9+", varbl: "--mapa-b4" },
];
const tramoDe = (cuenta) => TRAMOS_MAPA.find((tramo) => cuenta <= tramo.max);

let paisSeleccionado = null;
const nodosPais = {};
const svgMapa = el("svg", { viewBox: `0 0 ${MAPA.ancho} ${MAPA.alto}`, role: "img", "aria-label": "Mapa mundial de nacionalidades de los autores" });
Object.entries(MAPA.paises).forEach(([nombreEn, camino]) => {
  const nombreEs = EN_A_ES[nombreEn];
  const cuenta = nombreEs ? conteoPaises[nombreEs] : null;
  const nodo = el("path", { d: camino, class: "pais" }, svgMapa);
  if (cuenta) {
    nodo.classList.add("con-datos");
    nodo.style.fill = `var(${tramoDe(cuenta).varbl})`;
    nodo.setAttribute("tabindex", "0");
    nodo.setAttribute("role", "button");
    nodo.setAttribute("aria-label", `${nombreEs}: ${cuenta} ${cuenta === 1 ? "libro" : "libros"}`);
    nodo.addEventListener("mousemove", (ev) => mostrarTooltip(
      `<div class="tt-titulo">${nombreEs}</div><div class="tt-fila"><span>Libros</span><b>${cuenta}</b></div>`, ev.clientX, ev.clientY));
    nodo.addEventListener("mouseleave", ocultarTooltip);
    nodo.addEventListener("click", () => seleccionarPais(nombreEs));
    nodo.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); seleccionarPais(nombreEs); }
    });
    nodosPais[nombreEs] = nodo;
  }
});
document.getElementById("mapa").appendChild(svgMapa);

const leyendaMapa = document.getElementById("leyenda-mapa");
leyendaMapa.innerHTML =
  `<span><i style="background:var(--grid)"></i>Sin libros</span>` +
  TRAMOS_MAPA.map((tramo) => `<span><i style="background:var(${tramo.varbl})"></i>${tramo.etiqueta}</span>`).join("");

const tituloPaises = document.getElementById("titulo-paises");
const listaPaises = document.getElementById("lista-paises");
function pintarPanelPaises() {
  if (paisSeleccionado == null) {
    tituloPaises.textContent = "Todos los países";
    const contenedor = document.createElement("div");
    contenedor.className = "lista-scroll";
    contenedor.replaceChildren(...Object.entries(conteoPaises)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .map(([pais, cuenta]) => {
        const fila = document.createElement("button");
        fila.type = "button";
        fila.className = "fila-pais";
        fila.innerHTML = `<span>${pais}</span><span class="cuenta">${cuenta}</span>`;
        fila.addEventListener("click", () => seleccionarPais(pais));
        return fila;
      }));
    listaPaises.replaceChildren(contenedor);
  } else {
    tituloPaises.textContent = paisSeleccionado;
    const volver = document.createElement("button");
    volver.type = "button";
    volver.className = "volver";
    volver.textContent = "← Todos los países";
    volver.addEventListener("click", () => seleccionarPais(null));
    const contenedor = document.createElement("div");
    contenedor.className = "lista-libros";
    listaPaises.replaceChildren(volver, contenedor);
    const libros = LIBROS.filter((l) => l.nacionalidad.includes(paisSeleccionado))
      .sort((a, b) => (b.calif ?? -1) - (a.calif ?? -1));
    listaLibros(contenedor, libros.map((libro) => ({ libro, dato: fmt2(libro.calif) })));
  }
}
function seleccionarPais(pais) {
  paisSeleccionado = pais === paisSeleccionado ? null : pais;
  Object.entries(nodosPais).forEach(([nombre, nodo]) =>
    nodo.classList.toggle("seleccionado", nombre === paisSeleccionado));
  pintarPanelPaises();
}
pintarPanelPaises();

const conteoTipos = {};
LIBROS.forEach((libro) => { if (libro.tipo) conteoTipos[libro.tipo] = (conteoTipos[libro.tipo] || 0) + 1; });
barrasH(document.getElementById("graf-tipos"),
  Object.entries(conteoTipos)
    .sort((a, b) => b[1] - a[1])
    .map(([clave, cuenta]) => ({ etiqueta: clave, valor: cuenta })));

function barraProporcion(contenedor, segmentos, unidad) {
  const total = suma(segmentos.map((s) => s.cuenta));
  const barra = document.createElement("div");
  barra.className = "barra-apilada";
  const detalle = document.createElement("div");
  detalle.className = "detalle-formato";
  segmentos.forEach((segmento) => {
    if (!segmento.cuenta) return;
    const porcentaje = Math.round(100 * segmento.cuenta / total);
    const nodo = document.createElement("div");
    nodo.className = "segmento";
    nodo.style.width = (100 * segmento.cuenta / total) + "%";
    nodo.style.background = `var(${segmento.varbl})`;
    nodo.addEventListener("mousemove", (ev) => mostrarTooltip(
      `<div class="tt-titulo">${segmento.nombre}</div><div class="tt-fila"><span>${unidad}</span><b>${segmento.cuenta} (${porcentaje}%)</b></div>`,
      ev.clientX, ev.clientY));
    nodo.addEventListener("mouseleave", ocultarTooltip);
    barra.appendChild(nodo);
    const fila = document.createElement("div");
    fila.className = "fila-formato";
    fila.innerHTML = `<span><i style="background:var(${segmento.varbl})"></i>${segmento.nombre}</span>` +
      `<span class="cifra">${fmt(segmento.cuenta)} · ${porcentaje}%</span>`;
    detalle.appendChild(fila);
  });
  contenedor.replaceChildren(barra, detalle);
}

const conteoFormatos = {};
LIBROS.forEach((libro) => { if (libro.formato) conteoFormatos[libro.formato] = (conteoFormatos[libro.formato] || 0) + 1; });
barraProporcion(document.getElementById("graf-formato"), [
  { nombre: "Digital", varbl: "--s-fantasia", cuenta: conteoFormatos["Digital"] || 0 },
  { nombre: "Físico", varbl: "--s-cifi", cuenta: conteoFormatos["Fisico"] || 0 },
], "Libros");

const infoAutores = {};
LIBROS.forEach((libro) => libro.autor.split(",").forEach((autor, indice) => {
  const nombre = autor.trim();
  if (nombre && !infoAutores[nombre]) {
    infoAutores[nombre] = { sexo: libro.sexoAutor[indice], estado: libro.estadoAutor[indice] };
  }
}));
const listaAutores = Object.values(infoAutores);
barraProporcion(document.getElementById("graf-sexo"), [
  { nombre: "Hombres", varbl: "--s-thriller", cuenta: listaAutores.filter((a) => a.sexo === "H").length },
  { nombre: "Mujeres", varbl: "--s-drama", cuenta: listaAutores.filter((a) => a.sexo === "M").length },
], "Autores");
const cuentaMujeres = listaAutores.filter((a) => a.sexo === "M").length;
document.getElementById("frase-autores").innerHTML =
  `Has leído a <b>${listaAutores.length}</b> autores de <b>${Object.keys(conteoPaises).length}</b> países; ` +
  `el más frecuente es <b>${autoresTop[0][0]}</b> (${autoresTop[0][1]} libros) y las mujeres son el ` +
  `<b>${Math.round(100 * cuentaMujeres / listaAutores.length)}%</b> de tu biblioteca.`;

barraProporcion(document.getElementById("graf-estado-autores"), [
  { nombre: "Vivos", varbl: "--s-cifi", cuenta: listaAutores.filter((a) => a.estado === "Vivo").length },
  { nombre: "Fallecidos", varbl: "--s-otros", cuenta: listaAutores.filter((a) => a.estado === "Fallecido").length },
  { nombre: "Suicidio", varbl: "--s-realismo", cuenta: listaAutores.filter((a) => a.estado === "Suicidio").length },
], "Autores");

const librosPublicados = LIBROS.filter((libro) => libro.publicado != null);
const porAnioPub = {};
librosPublicados.forEach((libro) => (porAnioPub[libro.publicado] = porAnioPub[libro.publicado] || []).push(libro));
const aniosPublicacion = Object.keys(porAnioPub).map(Number).sort((a, b) => a - b);
const cintaTiempo = document.getElementById("graf-publicacion");
cintaTiempo.className = "cinta-tiempo";
const capacidadCaja = Math.max(...Object.values(porAnioPub).map((lista) => lista.length));
const anchoSegmento = 15, anchoBloque = capacidadCaja * anchoSegmento;
const gapBase = 8, pxPorAnio = 4.5, gapMax = 130;
function pintarCintaTiempo() {
  const porDecadaPub = {};
  aniosPublicacion.forEach((anio) => {
    const decada = Math.floor(anio / 10) * 10;
    (porDecadaPub[decada] = porDecadaPub[decada] || []).push(anio);
  });
  const decadasPub = Object.keys(porDecadaPub).map(Number).sort((a, b) => a - b);
  cintaTiempo.replaceChildren(...decadasPub.map((decada) => {
    const filaNodo = document.createElement("div");
    filaNodo.className = "fila-tiempo";
    const etiquetaDecada = document.createElement("div");
    etiquetaDecada.className = "etiqueta-decada-fila";
    etiquetaDecada.textContent = decada + "s";
    filaNodo.appendChild(etiquetaDecada);
    porDecadaPub[decada].forEach((anio, indice) => {
      const anterior = porDecadaPub[decada][indice - 1];
      const gap = anterior == null ? 0 : gapBase + Math.min((anio - anterior - 1) * pxPorAnio, gapMax);
      const libros = porAnioPub[anio];
      const entrada = document.createElement("div");
      entrada.className = "entrada-anio";
      entrada.style.marginLeft = `${gap}px`;
      const etiqueta = document.createElement("div");
      etiqueta.className = "etiqueta-anio";
      etiqueta.textContent = anio;
      const caja = document.createElement("div");
      caja.className = "caja-anio";
      caja.style.width = `${anchoBloque}px`;
      libros.forEach((libro) => {
        const slot = slotDeLibro(libro);
        const segmento = document.createElement("span");
        segmento.className = "segmento-libro" + (slot.banda ? " banda" : "");
        segmento.style.backgroundColor = `var(${slot.varbl})`;
        segmento.addEventListener("mousemove", (ev) => mostrarTooltip(fichaLibro(libro), ev.clientX, ev.clientY));
        segmento.addEventListener("mouseleave", ocultarTooltip);
        caja.appendChild(segmento);
      });
      entrada.append(etiqueta, caja);
      filaNodo.appendChild(entrada);
    });
    return filaNodo;
  }));
}
pintarCintaTiempo();

const generoTop = generosOrdenados[0];
const generoMejor = califPorGenero[0];
document.getElementById("frase-generos").innerHTML =
  `El género más frecuente es <b>${generoTop[0]}</b> (${generoTop[1]} libros) y también manda en calidad: ` +
  `el mejor calificado con al menos 3 lecturas es <b>${generoMejor.etiqueta.replace(/ \(\d+\)$/, "")}</b> con ${fmt2(generoMejor.valor)}.`;

/* ---------- calificaciones ---------- */
const tramos = [];
for (let inicio = 1.5; inicio < 5; inicio += 0.5) {
  const libros = conCalif.filter((l) => l.calif >= inicio && l.calif < inicio + 0.5).sort((a, b) => a.calif - b.calif);
  if (libros.length || tramos.length) tramos.push({ etiqueta: `${fmt2(inicio)}–${fmt2(inicio + 0.5)}`, libros });
}
while (tramos.length && !tramos[tramos.length - 1].libros.length) tramos.pop();
pictogramaCalificaciones(document.getElementById("graf-distribucion"), tramos);

const dimensiones = [
  ["Personajes", "personajes"], ["Narración", "narracion"],
  ["Otros", "otros"], ["Universo", "universo"], ["Historia", "historia"],
];

const CATEGORIAS_RANKING = [
  { nombre: "General", campo: "calif" },
  ...dimensiones.map(([nombre, campo]) => ({ nombre, campo })),
];
const filtrosDim = document.getElementById("filtros-dimension");
const listaDimTop = document.getElementById("lista-dim-top");
const listaDimFondo = document.getElementById("lista-dim-fondo");
const tituloDimTop = document.getElementById("titulo-dim-top");
const tituloDimFondo = document.getElementById("titulo-dim-fondo");
let categoriaRankingActual = CATEGORIAS_RANKING[0];
let excluirRueda = false;
function pintarRankingDimension() {
  const campo = categoriaRankingActual.campo;
  const ordenado = LIBROS
    .filter((l) => l[campo] != null && (!excluirRueda || !l.libro.startsWith("La Rueda del Tiempo")))
    .sort((a, b) => b[campo] - a[campo]);
  const etiqueta = categoriaRankingActual.nombre === "General" ? "calificación general" : categoriaRankingActual.nombre.toLowerCase();
  tituloDimTop.textContent = `Mejor ${etiqueta}`;
  tituloDimFondo.textContent = `Peor ${etiqueta}`;
  listaLibros(listaDimTop, ordenado.slice(0, 10).map((libro) => ({ libro, dato: fmt2(libro[campo]) })));
  listaLibros(listaDimFondo, ordenado.slice(-10).reverse().map((libro) => ({ libro, dato: fmt2(libro[campo]) })));
}
CATEGORIAS_RANKING.forEach((categoria, indice) => {
  const chip = document.createElement("button");
  chip.type = "button"; chip.className = "chip";
  chip.textContent = categoria.nombre;
  chip.setAttribute("aria-pressed", String(indice === 0));
  chip.addEventListener("click", () => {
    filtrosDim.querySelectorAll(".chip").forEach((otro) => otro.setAttribute("aria-pressed", String(otro === chip)));
    categoriaRankingActual = categoria;
    pintarRankingDimension();
  });
  filtrosDim.appendChild(chip);
});
const toggleRueda = document.createElement("label");
toggleRueda.className = "interruptor";
toggleRueda.innerHTML = `<input type="checkbox" id="excluir-rueda"> Excluir La Rueda del Tiempo`;
toggleRueda.querySelector("input").addEventListener("change", (ev) => {
  excluirRueda = ev.target.checked;
  pintarRankingDimension();
});
filtrosDim.appendChild(toggleRueda);
pintarRankingDimension();

const dimTop = dimensiones
  .map(([nombre, campo]) => [nombre, media(LIBROS.filter((l) => l[campo] != null).map((l) => l[campo]))])
  .sort((a, b) => b[1] - a[1]);
document.getElementById("frase-califs").innerHTML =
  `Lo que más pesa en tu gusto son los <b>${dimTop[0][0].toLowerCase()}</b> (${fmt2(dimTop[0][1])} de media global); ` +
  `lo más castigado, ${dimTop[dimTop.length - 1][0].toLowerCase()} (${fmt2(dimTop[dimTop.length - 1][1])}).`;

/* ---------- ritmo ---------- */
const ratioDigital = conRatio.filter((l) => l.formato === "Digital");
const ratioFisico = conRatio.filter((l) => l.formato === "Fisico");
const masRapido = conRatio.reduce((a, b) => (b.ratio > a.ratio ? b : a));
const masDias = LIBROS.filter((l) => l.dias != null).reduce((a, b) => (b.dias > a.dias ? b : a));
document.getElementById("kpis-ritmo").innerHTML =
  kpi("Ritmo digital", fmt1(media(ratioDigital.map((l) => l.ratio))) + " <span style='font-size:15px;font-weight:400'>pág/día</span>", `${ratioDigital.length} libros digitales con páginas`) +
  kpi("Ritmo en físico", fmt1(media(ratioFisico.map((l) => l.ratio))) + " <span style='font-size:15px;font-weight:400'>pág/día</span>", `solo ${ratioFisico.length} físicos tienen páginas registradas`) +
  kpi("El más veloz", fmt1(masRapido.ratio) + " <span style='font-size:15px;font-weight:400'>pág/día</span>", masRapido.libro) +
  kpi("El más paciente", fmt(masDias.dias) + " <span style='font-size:15px;font-weight:400'>días</span>", masDias.libro) +
  kpi("Días por libro", fmt1(totalDias / LIBROS.length), "duración media, en cualquier formato");

const leyendaRitmo = document.getElementById("leyenda-ritmo");
[["Digital", "--s-fantasia", ratioDigital.length], ["Físico", "--s-cifi", ratioFisico.length]].forEach(([nombre, varbl, cuenta]) => {
  const nodo = document.createElement("span");
  nodo.innerHTML = `<i style="background:var(${varbl})"></i>${nombre} (${cuenta})`;
  leyendaRitmo.appendChild(nodo);
});

const fechaNum = (iso) => new Date(iso + "T12:00:00").getTime();
const puntosRitmo = conRatio.filter((l) => l.fin);
const minFecha = fechaNum(`${anios[0]}-01-01`);
const maxFecha = fechaNum(`${anios[anios.length - 1] + 1}-01-01`);
graficoDispersion(document.getElementById("graf-ritmo-tiempo"), puntosRitmo, {
  xDe: (l) => fechaNum(l.fin), yDe: (l) => l.ratio,
  minX: minFecha, maxX: maxFecha,
  maxY: techoLimpio(Math.max(...puntosRitmo.map((l) => l.ratio))),
  ticksX: anios.map((anio) => fechaNum(`${anio}-07-01`)),
  fmtEjeX: (tick) => String(new Date(tick).getFullYear()),
  fmtTickY: fmt, alto: 300,
  colorDe: (libro) => libro.formato === "Fisico" ? "var(--s-cifi)" : "var(--s-fantasia)",
});

const ordenRitmo = [...conRatio].sort((a, b) => b.ratio - a.ratio);
listaLibros(document.getElementById("lista-rapidos"),
  ordenRitmo.slice(0, 5).map((libro) => ({ libro, dato: fmt1(libro.ratio) })));
listaLibros(document.getElementById("lista-lentos"),
  ordenRitmo.slice(-5).reverse().map((libro) => ({ libro, dato: fmt1(libro.ratio) })));

/* ---------- colecciones ---------- */
const COLECCIONES = [
  {
    nombre: "Nobel de Literatura",
    nota: "El libro más asociado a cada laureado — no cualquiera del autor",
    libros: [
      { titulo: "Cien años de soledad", dato: "1982" },
    ],
  },
  {
    nombre: "Tinta Club del Libro",
    nota: "Cajas literarias mensuales de tintaclubdellibro.com",
    libros: [
      { titulo: "Seda", dato: "Caja 31" },
      { titulo: "La loca de la casa", dato: "Caja 30" },
      { titulo: "La formula preferida del profesor", dato: "Caja 29" },
      { titulo: "Orlando", dato: "Caja 27" },
      { titulo: "La medición del mundo", dato: "Caja 26" },
      { titulo: "Morir en la arena", dato: "Caja 25" },
      { titulo: "Primer amor", dato: "Caja 24" },
      { titulo: "¿Quién quiere ser millonario?", dato: "Caja 23" },
      { titulo: "Las cosas que llevaron los hombres que lucharon", dato: "Caja 11" },
      { titulo: "Reflejos en un ojo dorado", dato: "Caja 1" },
    ],
  },
];
const subtabsColecciones = document.getElementById("subtabs-colecciones");
const tituloColeccion = document.getElementById("titulo-coleccion");
const notaColeccion = document.getElementById("nota-coleccion");
const leyendaColeccion = document.getElementById("leyenda-coleccion");
const listaColeccion = document.getElementById("lista-coleccion");
function pintarColeccion(coleccion) {
  tituloColeccion.textContent = coleccion.nombre;
  notaColeccion.textContent = coleccion.nota;
  const filas = coleccion.libros
    .map(({ titulo, dato }) => ({ libro: LIBROS.find((l) => l.libro === titulo), dato }))
    .filter((fila) => fila.libro)
    .sort((a, b) => parseInt(a.dato.match(/\d+/)[0]) - parseInt(b.dato.match(/\d+/)[0]));
  pintarLeyendaGeneros(leyendaColeccion, filas.map((fila) => fila.libro));
  listaLibros(listaColeccion, filas, { colorGenero: true });
}
COLECCIONES.forEach((coleccion, indice) => {
  const chip = document.createElement("button");
  chip.type = "button"; chip.className = "chip";
  chip.textContent = `${coleccion.nombre} (${coleccion.libros.length})`;
  chip.setAttribute("aria-pressed", String(indice === 0));
  chip.addEventListener("click", () => {
    subtabsColecciones.querySelectorAll(".chip").forEach((otro) => otro.setAttribute("aria-pressed", String(otro === chip)));
    pintarColeccion(coleccion);
  });
  subtabsColecciones.appendChild(chip);
});
pintarColeccion(COLECCIONES[0]);
const totalColecciones = COLECCIONES.reduce((suma_, c) => suma_ + c.libros.length, 0);
document.getElementById("frase-colecciones").innerHTML =
  `<b>${totalColecciones}</b> libros de tu estantería pertenecen a alguna colección curada: ` +
  COLECCIONES.map((c) => `<b>${c.libros.length}</b> de ${c.nombre.toLowerCase()}`).join(" y ") + ".";

/* ---------- ficha de lectura ---------- */
const radarFicha = document.getElementById("radar-ficha");
const datosFicha = document.getElementById("datos-ficha");
const entradaBuscador = document.getElementById("buscador-libro");
const listaSugerencias = document.getElementById("sugerencias-libro");
const LIBROS_ALFA = [...LIBROS].sort((a, b) => a.libro.localeCompare(b.libro, "es"));
const LIBROS_LECTURA = [...LIBROS].sort((a, b) => a.fin.localeCompare(b.fin));
const normalizar = (texto) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const btnLibroAnterior = document.getElementById("libro-anterior");
const btnLibroSiguiente = document.getElementById("libro-siguiente");
const contadorLibro = document.getElementById("contador-libro");
let indiceLectura = 0;

function pintarFichaLibro(libro) {
  indiceLectura = LIBROS_LECTURA.findIndex((l) => l.libro === libro.libro && l.autor === libro.autor);
  contadorLibro.textContent = `${indiceLectura + 1} / ${LIBROS_LECTURA.length}`;
  btnLibroAnterior.disabled = indiceLectura <= 0;
  btnLibroSiguiente.disabled = indiceLectura >= LIBROS_LECTURA.length - 1;
  entradaBuscador.value = libro.libro;
  const slot = slotDeLibro(libro);
  graficoRadar(radarFicha, dimensiones.map(([nombre, campo]) => ({ etiqueta: nombre, valor: libro[campo] ?? 0 })), { color: `var(${slot.varbl})` });
  const metaLinea = [libro.autor, slot.nombre, libro.anio].filter(Boolean).join(" · ");
  const pares = [
    ["País", libro.nacionalidad.join(", ") || "—"], ["Publicado", libro.publicado || "—"],
    ["Formato", libro.formato || "—"], ["Páginas", fmt(libro.paginas)],
    ["Días", fmt(libro.dias)], ["Ritmo", libro.ratio == null ? "—" : fmt1(libro.ratio) + " pág/día"],
  ];
  datosFicha.innerHTML =
    `<div class="ficha-cabecera">` +
    `<span class="ficha-punto" style="background:var(${slot.varbl})"></span>` +
    `<div class="ficha-identidad"><div class="ficha-titulo">${libro.libro}</div><div class="ficha-meta">${metaLinea}</div></div>` +
    `<div class="ficha-calif">${fmt2(libro.calif)}</div>` +
    `</div>` +
    `<div class="ficha-grid">${pares.map(([clave, valor]) => `<div><span>${clave}</span><b>${valor}</b></div>`).join("")}</div>`;
}

let sugerenciasActuales = [];
let indiceActivo = -1;
function pintarSugerencias() {
  listaSugerencias.classList.toggle("abierta", sugerenciasActuales.length > 0);
  entradaBuscador.setAttribute("aria-expanded", String(sugerenciasActuales.length > 0));
  listaSugerencias.replaceChildren(...sugerenciasActuales.map((libro, indice) => {
    const opcion = document.createElement("div");
    opcion.className = "opcion" + (indice === indiceActivo ? " activa" : "");
    opcion.setAttribute("role", "option");
    opcion.innerHTML = `<span>${libro.libro}</span><small>${libro.autor}</small>`;
    opcion.addEventListener("mousedown", (ev) => { ev.preventDefault(); elegirLibro(libro); });
    return opcion;
  }));
}
function elegirLibro(libro) {
  sugerenciasActuales = [];
  pintarSugerencias();
  pintarFichaLibro(libro);
  entradaBuscador.blur();
}
function buscarLibros(texto) {
  const consulta = normalizar(texto.trim());
  sugerenciasActuales = consulta
    ? LIBROS_ALFA.filter((libro) => normalizar(libro.libro + " " + libro.autor).includes(consulta)).slice(0, 8)
    : LIBROS_ALFA.slice(0, 8);
  indiceActivo = -1;
  pintarSugerencias();
}
entradaBuscador.addEventListener("input", () => buscarLibros(entradaBuscador.value));
entradaBuscador.addEventListener("focus", () => buscarLibros(entradaBuscador.value));
entradaBuscador.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") { sugerenciasActuales = []; pintarSugerencias(); return; }
  if (!sugerenciasActuales.length) return;
  if (ev.key === "ArrowDown") { ev.preventDefault(); indiceActivo = Math.min(indiceActivo + 1, sugerenciasActuales.length - 1); pintarSugerencias(); }
  else if (ev.key === "ArrowUp") { ev.preventDefault(); indiceActivo = Math.max(indiceActivo - 1, 0); pintarSugerencias(); }
  else if (ev.key === "Enter") { ev.preventDefault(); elegirLibro(sugerenciasActuales[indiceActivo] ?? sugerenciasActuales[0]); }
});
document.addEventListener("click", (ev) => {
  if (!ev.target.closest(".buscador-libro")) { sugerenciasActuales = []; pintarSugerencias(); }
});
btnLibroAnterior.addEventListener("click", () => { if (indiceLectura > 0) pintarFichaLibro(LIBROS_LECTURA[indiceLectura - 1]); });
btnLibroSiguiente.addEventListener("click", () => { if (indiceLectura < LIBROS_LECTURA.length - 1) pintarFichaLibro(LIBROS_LECTURA[indiceLectura + 1]); });
pintarFichaLibro(LIBROS_LECTURA[0]);

/* ---------- catálogo ---------- */
const COLUMNAS = [
  { clave: "libro", titulo: "Libro", num: false },
  { clave: "anio", titulo: "Año", num: true },
  { clave: "generoTexto", titulo: "Género", num: false },
  { clave: "paisTexto", titulo: "País", num: false },
  { clave: "tipo", titulo: "Tipo", num: false },
  { clave: "formato", titulo: "Formato", num: false },
  { clave: "paginas", titulo: "Páginas", num: true },
  { clave: "dias", titulo: "Días", num: true },
  { clave: "ratio", titulo: "Ritmo", num: true },
  { clave: "calif", titulo: "Calif.", num: true },
];
const filasCatalogo = LIBROS.map((libro) => ({
  ...libro,
  generoTexto: libro.genero.join(", "),
  paisTexto: libro.nacionalidad.join(", "),
}));
let orden = { clave: "anio", asc: true };
let filtroAnio = "Todos";
let filtroTexto = "";

const filtros = document.getElementById("filtros-catalogo");
["Todos", ...anios].forEach((valor) => {
  const chip = document.createElement("button");
  chip.type = "button"; chip.className = "chip";
  chip.textContent = valor;
  chip.setAttribute("aria-pressed", String(valor === "Todos"));
  chip.addEventListener("click", () => {
    filtroAnio = valor;
    filtros.querySelectorAll(".chip").forEach((otro) => otro.setAttribute("aria-pressed", String(otro === chip)));
    pintarTabla();
  });
  filtros.appendChild(chip);
});
const busqueda = document.createElement("input");
busqueda.type = "search"; busqueda.placeholder = "Buscar por título o autor";
busqueda.addEventListener("input", () => { filtroTexto = busqueda.value.toLowerCase(); pintarTabla(); });
filtros.appendChild(busqueda);

const tabla = document.getElementById("tabla-catalogo");
function pintarTabla() {
  const visibles = filasCatalogo.filter((fila) =>
    (filtroAnio === "Todos" || fila.anio === filtroAnio) &&
    (!filtroTexto || (fila.libro + " " + fila.autor).toLowerCase().includes(filtroTexto)));
  visibles.sort((a, b) => {
    const va = a[orden.clave], vb = b[orden.clave];
    if (va == null) return 1;
    if (vb == null) return -1;
    const comparado = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "es");
    return orden.asc ? comparado : -comparado;
  });
  const cabecera = "<thead><tr>" + COLUMNAS.map((col) =>
    `<th data-clave="${col.clave}" aria-sort="${orden.clave === col.clave ? (orden.asc ? "ascending" : "descending") : "none"}">` +
    `${col.titulo} <span class="flecha">${orden.clave === col.clave ? (orden.asc ? "▲" : "▼") : ""}</span></th>`).join("") + "</tr></thead>";
  const cuerpo = "<tbody>" + visibles.map((fila) => "<tr>" + COLUMNAS.map((col) => {
    if (col.clave === "libro") return `<td>${fila.libro}<span class="autor">${fila.autor}</span></td>`;
    const valor = fila[col.clave];
    const texto = valor == null ? "—" :
      (col.clave === "anio" ? String(valor) :
       col.clave === "ratio" ? fmt1(valor) :
       col.clave === "calif" ? fmt2(valor) :
       typeof valor === "number" ? fmt(valor) : valor);
    return `<td class="${col.num ? "num" : ""}">${texto}</td>`;
  }).join("") + "</tr>").join("") + "</tbody>";
  tabla.innerHTML = cabecera + cuerpo;
  tabla.querySelectorAll("th").forEach((th) => th.addEventListener("click", () => {
    const clave = th.dataset.clave;
    orden = { clave, asc: orden.clave === clave ? !orden.asc : true };
    pintarTabla();
  }));
  tabla.querySelectorAll("tbody tr").forEach((tr, indice) => {
    tr.addEventListener("click", () => pintarFichaLibro(visibles[indice]));
  });
}
pintarTabla();

const tablaPausados = document.getElementById("tabla-pausados");
tablaPausados.innerHTML =
  "<thead><tr><th>Libro</th><th>Género</th><th>Estado</th><th>Páginas leídas</th><th>Inicio</th><th>Pausa</th></tr></thead><tbody>" +
  PAUSADOS.map((fila) =>
    `<tr><td>${fila.libro}<span class="autor">${fila.autor || ""}</span></td><td>${fila.genero || "—"}</td>` +
    `<td>${fila.estado}</td><td class="num">${fmt(fila.paginasLeidas)}</td>` +
    `<td class="num">${fila.inicio || "—"}</td><td class="num">${fila.pausa || "—"}</td></tr>`).join("") + "</tbody>";

