'use strict';

const $ = id => document.getElementById(id);
const paginas = window.PAGINAS;
const indice = paginas.find(p => p.esIndice);
const principales = paginas.filter(p => !p.padre && !p.fusionadaEn && !p.esIndice);
principales.splice(1, 0, indice);
const dialogoCuestionario = $('cuestionario');
let origenCuestionario;
const dialogo = $('tarjeta');
const barra = document.querySelector('.barra');
const sintetizador = window.speechSynthesis;
let pagina;
let tarjeta;
let voces = [];
let turno = 0;
let activador;
const escalas = [0.9, 1, 1.15, 1.3, 1.5, 1.75, 2];
let escalaActual = 1;

const buscar = numero => paginas[numero - 1];

function control(etiqueta, accion) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.textContent = etiqueta;
  boton.addEventListener('click', accion);
  return boton;
}

const ilustraciones = {
  1: [['peces', 'Tatuaje de Robe']]
};

const dibujos = {
  estudiante: ['Persona estudiando en una mesa', 'M8 5.6a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z', 'M4 18v-3a3.5 3.5 0 0 1 3.5-3.5H9l2.5 3H15M7 15v3h3l1.5 3M3 17v4m4-3-1 3M11 16h10m-8 0v5m7-5v5', 'M15 14.5h4l1-2h-4l-1 2Zm4.5-3.5V7l-2-2m-1 0h2.7l1.5 2H16z'],
  objetivo: ['Diana y flecha', 'M19 13a7.5 7.5 0 1 1-8-8m4.4 8.2a4 4 0 1 1-4.5-4.5', 'm12 12 7-7m-4.5 0H19v4.5'],
  descanso: ['Luna y estrella', 'M19.8 15.1A8 8 0 0 1 9 4.2a8 8 0 1 0 10.8 10.9Z', 'M17 4v5m-2.5-2.5h5'],
  memoria: ['Tarjetas de repaso', 'M5 8h12v11H5zM8 5h12v11M8 12h6m-6 3h4'],
  trabajo: ['Documento de trabajo', 'M6 3h8l4 4v14H6zM14 3v5h4M9 12h6m-6 4h6'],
  prueba: ['Ejercicio corregido', 'M7 5H5v16h14V5h-2M9 3h6v4H9z', 'm8 12 2 2 5-5m-7 8h7'],

  reloj: ['Reloj', 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z', 'M12 8v4l3 2m-5-12h4'],
  calendario: ['Calendario', 'M4 6h16v14H4zM4 10h16M8 4v4m8-4v4', 'm8 15 2 2 5-5'],
  mesa: ['Mesa de estudio y lámpara', 'M3 16h18M5 16v5m14-5v5M10 16v-5l4-5m-2 0h5l2 4h-7z', 'M4 14h4m-4-2h4'],
  pulso: ['Pulso de enfermería', 'M3 12h5l2-5 3 10 2-5h6', 'M20 7c-2-3-6-3-8 0-2-3-6-3-8 0m16 8c-2 3-5 5-8 7-3-2-6-4-8-7']
};
const dibujosPilares = {5:'calendario', 6:'mesa', 7:'descanso', 9:'memoria', 10:'prueba', 11:'trabajo'};
const numerosPilares = [4, 5, 6, 7, 9, 10, 11];
const dibujosPagina = {27:'calendario', 29:'reloj'};
const escenasPagina = {4:'actitud', 5:'reloj', 6:'escritorio', 7:'noche', 9:'repaso', 10:'examen', 17:'agenda', 18:'tomate', 19:'escritorio', 22:'corazon', 31:'progreso', 34:'examen', 35:'stop', 36:'semaforo', 37:'altavoz', 38:'evidencia', 39:'casa'};
const escenasSoluciones = {18:'tomate', 19:'escritorio', 20:'agenda'};
const ejemplos = {
  18: 'Pon 25 minutos para dibujar y revisar el ciclo del agua y resolver una pregunta sin mirar. Cuando suene, descansa cinco minutos.',
  19: 'Antes de estudiar, deja en la mesa el cuaderno y el material que necesitas. Pon el móvil en modo avión y guárdalo. Cuando acabes el bloque, levántate y descansa la vista.'
};

function dibujo(nombre) {
  const [, ...trazos] = dibujos[nombre];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [atributo, valor] of Object.entries({
    viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':'1.5',
    'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true'
  })) svg.setAttribute(atributo, valor);
  for (const trazo of trazos) {
    const camino = document.createElementNS(svg.namespaceURI, 'path');
    camino.setAttribute('d', trazo);
    svg.append(camino);
  }
  return svg;
}

function ilustracion(nombre, interactivo) {
  const icono = dibujo(nombre);
  const figura = interactivo ? control('Animar ilustración: ' + dibujos[nombre][0], () => {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      icono.animate([{transform:'rotate(0)'}, {transform:'rotate(-9deg) scale(1.1)'}, {transform:'rotate(0)'}],
        {duration:520});
    }
  }) : document.createElement('span');
  figura.className = 'dibujo';
  if (interactivo) {
    figura.setAttribute('aria-label', figura.textContent);
    figura.textContent = '';
  }
  figura.append(icono);
  return figura;
}

function libroConRotulador(interactivo) {
  const figura = document.createElement('figure');
  figura.className = 'escena-escritura' + (interactivo ? ' escritura-activa' : '');
  figura.innerHTML = `
    <svg viewBox="0 0 240 142" fill="none" aria-hidden="true">
      <path d="M24 34h192v91H24z" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="2" stroke-linejoin="round"/>
      <path d="M31 25c34-10 62-8 89 6 27-14 55-16 89-6v88c-34-8-62-6-89 7-27-13-55-15-89-7z"
        fill="var(--azul)" stroke="var(--tinta)" stroke-width="2" stroke-linejoin="round"/>
      <path d="M120 31v89" stroke="var(--tinta)" stroke-width="2"/>
      <path d="M44 47c25-4 43-3 63 4m-63 9c25-4 43-3 63 4m-63 9c25-4 43-3 63 4m-63 9c25-4 43-3 63 4
        M134 51c21-7 38-8 61-4m-61 17c21-7 38-8 61-4m-61 17c21-7 38-8 61-4m-61 17c21-7 38-8 61-4"
        stroke="var(--borde)" stroke-opacity=".22" stroke-width="1.6" stroke-linecap="round"/>
      <path class="trazo-escrito" pathLength="100" d="M136 88q24-7 49-5"
        stroke="var(--menta-fluorescente)" stroke-width="10" stroke-linecap="round"/>
      <g class="boli-escritura" stroke="var(--tinta)" stroke-width="1.6" stroke-linejoin="round">
        <path d="m136 88 3-11 8 4-7 9z" fill="var(--menta-fluorescente)"/>
        <path d="m139 76 33-36a3 3 0 0 1 4 0l8 7a3 3 0 0 1 0 4l-35 34z" fill="var(--rosa)"/>
        <path d="m167 46 12 10m-34 14 9 8" stroke="var(--verde-lectura)"/>
        <path d="m171 41 7-8 12 11-7 8z" fill="var(--verde-lectura)"/>
      </g>
    </svg>`;
  return figura;
}

const escenas = {
  altavoz: `<svg viewBox="0 0 220 150" aria-hidden="true">
    <g class="cuerpo-altavoz" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round">
      <path d="M43 55h35l43-27v94L78 95H43q-8 0-8-8V63q0-8 8-8z" fill="var(--rosa)"/>
      <path d="M78 55v40" fill="none"/>
    </g>
    <g class="ondas-altavoz" fill="none" stroke="var(--verde-lectura)" stroke-width="5" stroke-linecap="round">
      <path d="M140 55a27 27 0 0 1 0 40"/>
      <path d="M156 42a45 45 0 0 1 0 66"/>
      <path d="M173 30a63 63 0 0 1 0 90"/>
    </g>
  </svg>`,

  actitud: `<svg viewBox="0 0 240 145" aria-hidden="true">
    <rect x="33" y="26" width="174" height="91" rx="9" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3"/>
    <path d="M57 57h126m-126 35h73" stroke="var(--borde)" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/>
    <text x="57" y="79" font-size="21" font-weight="700" font-family="system-ui,sans-serif" fill="var(--tinta)">Mi meta</text>
    <path class="evidencia-check" pathLength="100" d="m148 80 12 11 24-29" fill="none" stroke="var(--verde-lectura)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  escritorio: `<svg viewBox="0 0 290 184" aria-hidden="true">
    <path d="M26 155h238" stroke="var(--borde)" stroke-opacity=".4" stroke-width="2"/>
    <g fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round">
      <path d="M48 90h192v10H48zm11 10h8v53h-8zm163 0h8v53h-8z"/>
      <path d="M116 113h48v8h-48zm4 8h7v32h-7zm33 0h7v32h-7z"/>
      <path d="M120 82q20-8 40 0v31h-40z"/>
    </g>
    <path d="M186 88h28m-14 0V63l-19-28m-5 0q13-13 25 0l-3 8h-25z" fill="none" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round"/>
    <path class="luz-escritorio" d="m177 48-8 12m19-9v13" stroke="var(--verde-lectura)" stroke-width="3" stroke-linecap="round"/>
    <path d="M66 86q12-7 24-2 13-5 25 2l-2 4H68z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="2"/>
    <path d="M70 78h31m-30-5h23" stroke="var(--verde-lectura)" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`,
  repaso: `<svg viewBox="0 0 260 165" aria-hidden="true">
    <rect x="48" y="38" width="158" height="92" rx="8" transform="rotate(-8 127 84)" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/>
    <g class="ficha-repaso">
      <rect x="58" y="43" width="158" height="92" rx="8" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3"/>
      <path d="M77 69h58m-58 16h81m-81 16h46" stroke="var(--borde)" stroke-opacity=".5" stroke-width="3" stroke-linecap="round"/>
      <path d="m164 105 11 10 23-26" fill="none" stroke="var(--verde-lectura)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </svg>`,
  examen: `<svg viewBox="0 0 260 185" aria-hidden="true">
    <path d="M52 23h125l25 25v115H52z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round"/>
    <path d="M177 23v25h25M75 60h68m-68 18h104m-104 18h82m-82 18h102m-102 18h72" fill="none" stroke="var(--borde)" stroke-opacity=".45" stroke-width="2.5" stroke-linecap="round"/>
    <path class="respuesta-examen" pathLength="100" d="M85 122q17-8 25-3t21-4l19-2" fill="none" stroke="var(--verde-lectura)" stroke-width="3" stroke-linecap="round"/>
    <g class="boli-examen" stroke="var(--tinta)" stroke-width="2" stroke-linejoin="round">
      <path d="m83 123 7-16 55-56 10 10-56 55z" fill="var(--ciruela-suave)"/>
      <path d="m145 51 8-9q3-3 7 1l3 3q3 4 0 7l-8 8z" fill="var(--tinta)"/>
      <path d="m83 123 7-16 9 9z" fill="var(--rosa)"/>
    </g>
  </svg>`,
  stop: `<svg viewBox="0 0 200 176" aria-hidden="true">
    <path d="M100 107v57m-25 0h50" stroke="var(--tinta)" stroke-width="6" stroke-linecap="round"/>
    <g class="cartel-stop">
      <path d="m72 11-31 31v44l31 31h56l31-31V42l-31-31z" fill="#a6414d" stroke="var(--tinta)" stroke-width="3"/>
      <path d="M75 17 47 45v38l28 28h50l28-28V45l-28-28z" fill="none" stroke="white" stroke-width="2"/>
      <text x="100" y="75" text-anchor="middle" font-family="system-ui,sans-serif" font-size="28" font-weight="800" fill="white">STOP</text>
    </g>
  </svg>`,
  evidencia: `<svg viewBox="0 0 255 170" aria-hidden="true">
    <path d="M38 30h127v114H38z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3"/>
    <path d="M59 56h83m-83 19h72m-72 19h78m-78 19h62" stroke="var(--borde)" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
    <path d="m165 110 41 39" stroke="var(--tinta)" stroke-width="11" stroke-linecap="round"/>
    <circle cx="145" cy="88" r="39" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="4"/>
    <path class="evidencia-check" pathLength="100" d="m126 89 14 13 25-29" fill="none" stroke="var(--verde-lectura)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  relojMarco: `<svg viewBox="0 0 190 175" aria-hidden="true">
    <rect x="29" y="14" width="132" height="148" rx="12" fill="var(--ciruela-suave)" stroke="var(--tinta)" stroke-width="3"/>
    <path d="M48 29v118m94-118v118M40 25h110M40 151h110" stroke="var(--tinta)" stroke-width="5" stroke-linecap="round"/>
    <path d="M62 30v10c0 18 9 31 29 45v6c-20 14-29 27-29 45v10h66v-10c0-18-9-31-29-45v-6c20-14 29-27 29-45V30z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="2.5"/>
    <path class="arena-superior" d="M67 47h56c-4 14-13 24-28 34-15-10-24-20-28-34z" fill="var(--verde-lectura)"/>
    <path class="arena-inferior" d="m95 110 25 31H70z" fill="var(--verde-lectura)"/>
    <path class="arena-cae" d="M95 82v45" stroke="var(--verde-lectura)" stroke-width="3" stroke-dasharray="2 4"/>
  </svg>`,

  noche: `<svg viewBox="0 0 230 140" aria-hidden="true">
    <path class="luna-noche" d="M144 100A49 49 0 0 1 91 29a49 49 0 1 0 53 71Z" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/>
    <g class="estrellas-noche" fill="var(--verde-lectura)">
      <path d="m159 33 4 11 11 4-11 4-4 11-4-11-11-4 11-4z"/><path d="m191 65 3 8 8 3-8 3-3 8-3-8-8-3 8-3z"/>
      <path d="m127 15 2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/>
    </g>
  </svg>`,
  agenda: `<svg viewBox="0 0 235 175" aria-hidden="true">
    <rect x="43" y="20" width="154" height="137" rx="9" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/>
    <rect x="55" y="29" width="129" height="117" rx="5" fill="var(--azul)" stroke="var(--tinta)" stroke-width="2"/>
    <path d="M43 43h24M43 68h24M43 93h24m-24 25h24" stroke="var(--tinta)" stroke-width="4" stroke-linecap="round"/>
    <path d="M79 52h85m-85 23h85m-85 23h85m-85 23h85m-59-67v65m29-65v65" stroke="var(--borde)" stroke-opacity=".45" stroke-width="2"/>
    <g class="marcas-agenda" fill="var(--verde-lectura)"><rect x="81" y="58" width="19" height="11" rx="2"/><rect x="109" y="81" width="20" height="11" rx="2"/><rect x="138" y="104" width="21" height="11" rx="2"/></g>
  </svg>`,
  tomate: `<svg viewBox="0 0 220 164" aria-hidden="true">
    <path d="M110 48c-49-27-87 6-68 58 16 49 119 52 137 0 18-52-21-85-69-58Z" fill="var(--ciruela-suave)" stroke="var(--tinta)" stroke-width="3"/>
    <path d="m110 57-25-12 21 1 4-15 6 15 22-2-22 14z" fill="var(--verde-lectura)"/>
    <circle cx="110" cy="98" r="32" fill="var(--azul)" stroke="var(--tinta)" stroke-width="2.5"/>
    <path d="M110 72v5m0 42v5m-26-26h5m42 0h5" stroke="var(--tinta)" stroke-width="2"/>
    <path class="aguja-tomate" d="M110 98V81" stroke="var(--verde-lectura)" stroke-width="4" stroke-linecap="round"/>
    <circle cx="110" cy="98" r="4" fill="var(--verde-lectura)"/>
  </svg>`,
  corazon: `<svg viewBox="0 0 250 175" aria-hidden="true">
    <path d="M125 151C101 130 41 97 39 65c-2-44 57-55 86-18 29-37 88-26 86 18-2 32-62 65-86 86Z" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/>
    <path d="M22 87h52l15-26 17 56 16-32h20l12-17 10 19h64" fill="none" stroke="var(--borde)" stroke-opacity=".28" stroke-width="4" stroke-linejoin="round"/>
    <path class="latido-trazo" pathLength="100" d="M22 87h52l15-26 17 56 16-32h20l12-17 10 19h64" fill="none" stroke="var(--verde-lectura)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  casa: `<svg viewBox="0 0 270 190" aria-hidden="true">
    <path d="M24 164h222" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round"/>
    <g class="casa-pared"><path d="M62 87h145v76H62z" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/><path d="M117 122h36v41h-36z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3"/></g>
    <path class="casa-techo" d="m44 89 91-62 91 62z" fill="var(--ciruela-suave)" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round"/>
    <g class="casa-ventanas" fill="var(--azul)" stroke="var(--tinta)" stroke-width="2.5"><path d="M79 107h25v26H79zm88 0h25v26h-25zM91 107v26m88-26v26m-100-13h25m63 0h25"/></g>
  </svg>`,
  gota: `<svg viewBox="0 0 245 124" aria-hidden="true">
    <path d="M122 13c-9 20-37 43-37 62a37 37 0 0 0 74 0c0-19-28-42-37-62Z"
      fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/>
    <path d="M98 76c0 11 8 18 15 21m-48-48 6-13m-25 29 14-5m114-25 6 13m5 12 14 5"
      fill="none" stroke="var(--verde-lectura)" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  semaforo: `<svg viewBox="0 0 150 200" aria-hidden="true">
    <rect x="41" y="11" width="68" height="151" rx="14" fill="var(--tinta)"/>
    <path d="M75 161v26m-25 0h50" stroke="var(--tinta)" stroke-width="6" stroke-linecap="round"/>
    <circle class="luz-roja" cx="75" cy="42" r="17" fill="#e46066"/><circle class="luz-ambar" cx="75" cy="86" r="17" fill="#f3bb4d"/><circle class="luz-verde" cx="75" cy="130" r="17" fill="#66c699"/>
  </svg>`,

  progreso: `<svg viewBox="0 0 300 220" fill="none" aria-hidden="true">
    <rect x="15" y="17" width="270" height="186" rx="12" fill="var(--azul)" stroke="var(--borde)" stroke-width="2"/>
    <path d="M46 44v129h210" stroke="var(--tinta)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M47 145h207M47 111h207M47 77h207" stroke="var(--borde)" stroke-opacity=".24" stroke-dasharray="3 5"/>
    <path d="M69 151h34v22H69zm55-22h34v44h-34zm55-30h34v74h-34z" fill="var(--rosa)"/>
    <path class="linea-progreso" pathLength="100" d="M64 149l28-34 20 16 29-44 21 19 29-43 20 16 34-40" stroke="var(--verde-lectura)"
      stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="punta-progreso" d="m227 43 18-4-3 18" stroke="var(--verde-lectura)"
      stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,
  jeringa: `<svg viewBox="20 0 230 142" fill="none" aria-hidden="true">
    <g transform="translate(105 80) rotate(-25)" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <g class="embolo-jeringa">
        <path d="M-61 0h38" stroke-width="7"/>
        <path d="M-63-20v40" stroke-width="9"/>
      </g>
      <rect x="-29" y="-27" width="103" height="54" rx="8" fill="var(--azul)"/>
      <path d="M-31-33v66M74-8h13v16H74m13-8h30" stroke-width="4"/>
      <path class="liquido-jeringa" d="M-21 17h87v-34H-21z" fill="var(--rosa)" stroke="none"/>
      <path d="M-13-18v12M3-18v8m16-8v12m16-12v8m16-8v12" stroke="var(--verde-lectura)" stroke-width="2.5"/>
    </g>
    <path class="gota-jeringa" d="M222 29c-4 7-9 12-9 18a9 9 0 0 0 18 0c0-6-5-11-9-18Z" fill="var(--verde-lectura)"/>
  </svg>`,
  avion: `<svg viewBox="0 0 170 72" fill="none" aria-hidden="true">
    <path class="estela-avion" d="M5 63c29 3 43-2 54-17 10-14 1-20-8-14-14 10 2 21 23 14 12-4 24-11 32-19"
      pathLength="100" stroke="var(--verde-lectura)" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 7"/>
    <g class="avion-papel" stroke="var(--verde-lectura)" stroke-width="2" stroke-linejoin="round">
      <path d="m102 19 59-15-27 47-10-19z" fill="var(--rosa)"/>
      <path d="m124 32 37-28-30 35-4 13z" fill="var(--azul)"/>
    </g>
  </svg>`,
  cerebro: `<svg viewBox="0 0 240 190" aria-hidden="true" fill="none">
    <path d="M120 40c-12-20-45-18-52 7-22-2-39 17-34 37-20 10-20 38 0 49 0 22 26 32 45 22 14 19 39 12 41-5
      2 17 27 24 41 5 19 10 45 0 45-22 20-11 20-39 0-49 5-20-12-39-34-37-7-25-40-27-52-7Z"
      fill="var(--rosa)" stroke="var(--verde-lectura)" stroke-width="4" stroke-linejoin="round"/>
    <path d="M120 40v110m-52-103c-3 14 6 21 18 21m-52 16c13-4 28 4 29 16m16 55c-5-13 2-26 13-32
      m-50 9c15 1 29-7 33-18m97-67c3 14-6 21-18 21m52 16c-13-4-28 4-29 16m-16 55c5-13-2-26-13-32m50 9c-15 1-29-7-33-18"
      stroke="var(--verde-lectura)" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M41 37l-9-9m155 4 9-10m20 38 14-5M21 62l-12-5" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round"/>
  </svg>`,
  reloj: `<svg viewBox="0 0 160 160" aria-hidden="true">
    <path d="M35 15h90M35 145h90" stroke="var(--tinta)" stroke-width="9" stroke-linecap="round"/>
    <path d="M45 20v12c0 25 13 33 31 46v4C58 95 45 103 45 128v12h70v-12c0-25-13-33-31-46v-4c18-13 31-21 31-46V20z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3"/>
    <path class="arena-superior" d="M51 39h58c-3 17-15 26-29 37-14-11-26-20-29-37z" fill="var(--verde-lectura)"/>
    <path class="arena-inferior" d="m80 106 27 29H53z" fill="var(--verde-lectura)"/>
    <path class="arena-cae" d="M80 77v42" stroke="var(--verde-lectura)" stroke-width="3" stroke-dasharray="2 4"/>
  </svg>`,
  lectura: `<svg viewBox="0 0 235 195" fill="none" aria-hidden="true">
    <g transform="translate(8 20)">
    <path d="m36 61 135 14-10 86-135-14z" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round"/>
    <path d="m49 49 124 10-7 90-124-10z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round"/>
    <path d="m63 74 64 6m-65 10 46 4m-48 11 59 5m-61 11 42 4" stroke="var(--borde)" stroke-opacity=".45" stroke-width="3" stroke-linecap="round"/>
    </g>
    <g transform="translate(-56 0)">
    <g class="nodos-ideas">
      <path d="M192 101v-10q0-10-9-19a31 31 0 1 1 46 0q-9 9-9 19v10Z" fill="var(--rosa)" stroke="var(--tinta)" stroke-width="3"/>
      <path d="M192 101h28m-25 8h22m-16 8h10m-10-16 1-22-7-7m14 29-1-22 7-7" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round"/>
      <path class="conexion-ideas" pathLength="100" d="m205 7 0 9m36 6-6 8m20 24-10 2m-77-34 6 8m-18 24 10 2" stroke="var(--verde-lectura)" stroke-width="4" stroke-linecap="round"/>
    </g>
    </g>
  </svg>`,
  mapa: `<svg viewBox="0 0 290 190" fill="none" aria-hidden="true">
    <path d="m20 37 78-17 88 19 82-20v134l-82 20-88-19-78 17z" fill="var(--azul)" stroke="var(--tinta)" stroke-width="3" stroke-linejoin="round"/>
    <path d="m98 20 0 134m88-115v134" stroke="var(--borde)" stroke-width="2" stroke-opacity=".48"/>
    <path d="M34 66q31-26 67-11t74 10q37-27 80-18M34 140q32-24 64-9t71 10q38-18 82-20" stroke="var(--borde)" stroke-opacity=".35" stroke-width="2"/>
    <path class="ruta-tactica" d="M48 120q38 10 77-36 31-35 93-21" stroke="var(--verde-lectura)" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 10"/>
    <path class="punta-tactica" d="m209 53 16 13-20 6" stroke="var(--verde-lectura)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="48" cy="120" r="10" fill="var(--rosa)" stroke="var(--verde-lectura)" stroke-width="3"/>
    <path d="M231 97V39l24 10-24 10" stroke="var(--tinta)" fill="var(--rosa)" stroke-width="3" stroke-linejoin="round"/>
    <path d="m75 72 13 13m0-13L75 85m85 23 13 13m0-13-13 13" stroke="var(--tinta)" stroke-width="3" stroke-linecap="round"/>
  </svg>`
};

function escena(nombre, interactivo) {
  const figura = document.createElement('figure');
  figura.className = 'escena escena-' + nombre;
  figura.innerHTML = escenas[nombre];
  if (interactivo) figura.classList.add('escena-activa');
  if (interactivo && ['reloj','relojMarco'].includes(nombre)) figura.classList.add('arena-activa');
  if (interactivo && nombre === 'cerebro') figura.classList.add('cerebro-activo');
  if (interactivo && nombre === 'avion') figura.classList.add('avion-activo');
  if (interactivo && nombre === 'jeringa') figura.classList.add('jeringa-activa');
  if (interactivo && nombre === 'lectura') figura.classList.add('ideas-activas');
  if (interactivo && nombre === 'progreso') figura.classList.add('progreso-activo');
  return figura;
}

function ejemploVisual(numero, interactivo) {
  const ejemplo = document.createElement('aside');
  ejemplo.className = 'ejemplo-tecnica ejemplo-visual';
  if (numero === 26) {
    ejemplo.append(elemento('h2', 'Ejemplo de flashcard'), escena('gota', interactivo));
    const pregunta = '¿Qué diferencia hay entre evaporación y condensación?';
    const respuesta = 'En la evaporación, el agua líquida se convierte en vapor, como cuando se seca un charco. En la condensación, el vapor se convierte en gotitas de agua, como las que aparecen en un espejo frío después de una ducha.';
    const tarjeta = elemento('p', pregunta);
    tarjeta.className = 'flashcard-demo';
    tarjeta.setAttribute('aria-live', 'polite');
    ejemplo.append(tarjeta);
    if (interactivo) {
      let vuelta = false;
      const girar = control('Ver respuesta', () => {
        parar();
        vuelta = !vuelta;
        tarjeta.textContent = vuelta ? respuesta : pregunta;
        girar.textContent = vuelta ? 'Volver a la pregunta' : 'Ver respuesta';
        tarjeta.classList.toggle('respuesta-flashcard', vuelta);
      });
      ejemplo.append(girar);
    } else {
      ejemplo.append(elemento('p', respuesta));
    }
    ejemplo.append(elemento('p', 'Intenta responder sin mirar. Vuelve a probar mañana y unos días después.'));
  } else if (numero === 28) {
    ejemplo.append(elemento('h2', 'Dos maneras de comparar'));
    const tablas = document.createElement('div');
    tablas.className = 'tablas-ejemplo';
    for (const [titulo, filas] of [
      ['Cambios de estado', [['Fusión','Sólido → líquido','El hielo se derrite'],['Solidificación','Líquido → sólido','El agua se congela']]],
      ['Tipos de texto', [['Narrativo','Cuenta lo que ocurre','Un cuento'],['Instructivo','Explica qué pasos seguir','Una receta']]]
    ]) {
      const tabla = document.createElement('table');
      tabla.append(elemento('caption', titulo));
      const cabecera = document.createElement('thead');
      const encabezados = document.createElement('tr');
      for (const etiqueta of ['Concepto','Qué lo distingue','Ejemplo']) {
        const columna = elemento('th', etiqueta);
        columna.scope = 'col';
        encabezados.append(columna);
      }
      cabecera.append(encabezados);
      tabla.append(cabecera);
      const cuerpo = document.createElement('tbody');
      for (const [concepto, diferencia, muestra] of filas) {
        const fila = document.createElement('tr');
        const celda = document.createElement('th');
        celda.scope = 'row';
        if (interactivo) {
          const seleccionar = control(concepto, () => {
            const activo = seleccionar.getAttribute('aria-pressed') === 'true';
            for (const otro of tabla.querySelectorAll('button')) {
              otro.setAttribute('aria-pressed', 'false');
            }
            seleccionar.setAttribute('aria-pressed', String(!activo));
          });
          seleccionar.setAttribute('aria-pressed', 'false');
          celda.append(seleccionar);
        } else {
          celda.textContent = concepto;
        }
        fila.append(celda, elemento('td', diferencia), elemento('td', muestra));
        cuerpo.append(fila);
      }
      tabla.append(cuerpo);
      tablas.append(tabla);
    }
    ejemplo.append(tablas);
  } else {
    ejemplo.append(elemento('h2', 'Ejemplos de mapas conceptuales'));
    const mapas = document.createElement('div');
    mapas.className = 'mapas-ejemplo';
    for (const [tema, vinculo, ramas] of [
      ['El agua', 'se presenta como', ['Sólido', 'Líquido', 'Gaseoso']],
      ['Un relato', 'se organiza en', ['Inicio', 'Nudo', 'Desenlace']]
    ]) {
      const mapa = document.createElement('div');
      mapa.className = 'mapa-conceptual';
      mapa.innerHTML = `<svg viewBox="0 0 520 230" role="img" aria-label="${tema} ${vinculo} ${ramas.join(', ')}.">
        <g fill="none" stroke="var(--verde-lectura)" stroke-width="3">
          <path d="M260 66v72M80 138v-20h360v20"/>
        </g>
        <rect x="185" y="16" width="150" height="50" rx="10" fill="var(--rosa)" stroke="var(--verde-lectura)" stroke-width="2"/>
        <g fill="var(--azul)" stroke="var(--borde)" stroke-width="2">
          <rect x="9" y="138" width="142" height="53" rx="8"/><rect x="189" y="138" width="142" height="53" rx="8"/><rect x="369" y="138" width="142" height="53" rx="8"/>
          <rect x="174" y="83" width="172" height="32" rx="6"/>
        </g>
        <g text-anchor="middle" fill="var(--tinta)" font-family="system-ui, sans-serif" font-size="22">
          <text x="260" y="48">${tema}</text><text x="260" y="105" font-size="16">${vinculo}</text>
          <text x="80" y="172">${ramas[0]}</text><text x="260" y="172">${ramas[1]}</text><text x="440" y="172">${ramas[2]}</text>
        </g>
      </svg>`;
      mapas.append(mapa);
    }
    ejemplo.append(mapas);
  }
  return ejemplo;
}

const palabrasClave = /\b(si el entorno ayuda o sabotea|distracciones constantes|reparto del tiempo|actitud sólida y constante|sueño, energía y fatiga|cansancio acumulado|comprender y retener|controlas el tiempo|planificación de tareas largas|búsqueda de info|aprendizaje (?:pasivo|activo)|gestión del tiempo|concentración|memoria|repaso activo|repetición espaciada|tiempo de descanso|errores frecuentes|modo avión|lista de errores|falsa sensación de familiaridad|conocimiento sólido y duradero|confrontación con la realidad|dominio real|control de tu tiempo|comprensión|cómo estudias|cómo te organizas|Método Pomodoro|Rutina Semanal|Higiene del Estudio|curva del olvido|zonas rojas|capacidad de resolución de problemas|autoengaño|datos reales|diagnóstico preciso|nivel de dominio|verificar si realmente lo entiendes|puntos clave|palabras de enlace|priorizar|autoevaluación|con tus propias palabras|sueño)\b/giu;

const palabrasIntroduccion = /\b(organizarte|menos distracciones|mejores resultados)\b/giu;
const palabrasReceta = /\b(te ofrecemos un diagnóstico|guía de acción|cualquier estudiante|herramientas|arquitecto|problemas|dolor|remedio)\b/giu;

const palabrasCierre = /\b(?:(mapa conceptual|efecto feynman|técnica del semáforo|flashcards)|(verificar si realmente lo entiendes|el arquitecto serás tú))(?![\p{L}\p{N}])/giu;

const palabrasEnNegrita = /\b(distracción|causa|he comprobado)\b/giu;

function resaltar(parrafo, linea, patron = palabrasClave) {
  let inicio = 0;
  for (const coincidencia of linea.matchAll(patron)) {
    parrafo.append(linea.slice(inicio, coincidencia.index));
    const marca = document.createElement((patron === palabrasEnNegrita || (patron === palabrasCierre && coincidencia[2])) ? 'strong' : 'mark');
    marca.textContent = coincidencia[0];
    parrafo.append(marca);
    inicio = coincidencia.index + coincidencia[0].length;
  }
  parrafo.append(linea.slice(inicio));
}

function componer(p, interactivo = true) {
  const hoja = document.createElement('section');
  hoja.className = 'hoja';
  if (p.numero === 1) hoja.classList.add('portada');
  if (p.esIndice) hoja.classList.add('hoja-indice');
  if (p.numero === 3) hoja.classList.add('hoja-pilares');
  if (p.numero === 2) hoja.classList.add('hoja-introduccion');
  if (p.numero === 16) hoja.classList.add('hoja-tiempo');
  if (p.numero === 23) hoja.classList.add('hoja-cerebro');
  if ([24,32].includes(p.numero)) hoja.classList.add('hoja-voz-alumno');
  if ([15,24,32,40,41].includes(p.numero)) {
    hoja.classList.add('hoja-avion');
    hoja.append(escena('avion', interactivo));
  }
  if (p.numero === 12) hoja.classList.add('hoja-medicina');
  if (p.numero === 17) hoja.classList.add('hoja-soluciones');
  if (p.numero === 21) hoja.classList.add('hoja-estrategia');
  if (dibujosPagina[p.numero] || p.numero === 13 || p.numero === 14) hoja.classList.add('hoja-ilustrada');
  if (p.numero === 13 || p.numero === 14) hoja.classList.add('hoja-escritura');
  if (p.numero === 14) hoja.classList.add('hoja-recetas');
  if (p.numero === 15) hoja.classList.add('hoja-mensaje');
  if ([13,14,22,31,35,39].includes(p.numero)) hoja.classList.add('dibujo-derecha');
  if ([22,31,35,39].includes(p.numero)) hoja.classList.add('hoja-relato');
  if (p.numero === 35) hoja.classList.add('hoja-parar');
  if ([24,25].includes(p.numero)) hoja.classList.add('hoja-problema-dos');
  if (p.numero === 33) hoja.classList.add('hoja-autoevaluacion');
  if (p.numero === 41) hoja.classList.add('hoja-cierre');
  if (p.numero === 40) hoja.classList.add('avion-derecha', 'hoja-compacta');
  if ([1, 2, 3, 12, 13, 14, 15, 23, 39, 41].includes(p.numero)) hoja.classList.add('caligrafia');
  if (p.padre) hoja.classList.add('ficha');
  if (numerosPilares.includes(p.numero)) hoja.classList.add('ficha-pilar');
  const cabecera = document.createElement('header');
  const titulo = document.createElement('h1');
  if (p.numero === 1) {
    const acento = document.createElement('span');
    acento.textContent = 'con método';
    titulo.append('Estudia ', acento);
  } else if (p.numero === 2) {
    const acento = elemento('span', 'mejorar');
    acento.className = 'acento-mejorar';
    titulo.append('Puedes ', acento, ' cómo estudias');
  } else if ([16,17,24,25,32].includes(p.numero)) {
    const etiqueta = elemento('span', p.numero === 17 ? 'problema 1' : p.titulo);
    etiqueta.className = 'etiqueta-manuscrita';
    if (p.numero === 17) titulo.append('Soluciones al ');
    titulo.append(etiqueta);
  } else if (p.numero === 14) {
    const recetas = elemento('span', 'recetas mágicas');
    recetas.className = 'recetas-animadas' + (interactivo ? ' recetas-activas' : '');
    titulo.append('Esta guía no contiene ', recetas, '.');
  } else if (p.numero === 31) {
    for (const [previo, palabra] of [['Del ', 'modo pasivo'], [' al ', 'modo activo']]) {
      const tramo = elemento('strong', palabra);
      tramo.className = 'etiqueta-manuscrita modo-enfasis';
      titulo.append(previo, tramo);
    }
  } else if (p.numero === 38) {
    titulo.append('De la ', elemento('em', 'esperanza'), ' a la ', elemento('em', 'evidencia'));
    titulo.className = 'titulo-evidencia';
  } else {
    titulo.textContent = p.titulo;
  }
  if (p.tituloSoloNavegacion) cabecera.className = 'solo-lectores';
  cabecera.append(titulo);
  if (p.numero === 1) {
    const subtitulo = document.createElement('p');
    subtitulo.className = 'subtitulo-portada';
    subtitulo.textContent = 'Descubre tus hábitos y elige qué mejorar';
    const ruta = elemento('p', 'Organiza · Practica · Comprueba');
    ruta.className = 'ruta-portada';
    cabecera.prepend(ruta);
    cabecera.append(subtitulo, elemento('p', '1.º y 2.º de ESO'));
  }
  for (const [nombre, descripcion] of ilustraciones[p.numero] || []) {
    const figura = document.createElement('img');
    figura.className = 'adorno adorno-' + nombre;
    figura.src = 'recursos/' + nombre + '.webp';
    figura.alt = descripcion;
    hoja.append(figura);
  }
  if (p.numero === 2) hoja.append(escena('progreso', interactivo));
  if (p.numero === 12) hoja.append(escena('jeringa', interactivo));
  if (p.numero === 13) hoja.append(escena('lectura', interactivo));
  if (p.numero === 14) hoja.append(libroConRotulador(interactivo));
  if (p.numero === 16) hoja.append(escena('relojMarco', interactivo));
  if (p.numero === 21) hoja.append(escena('mapa', interactivo));
  if (p.numero === 23) hoja.append(escena('cerebro', interactivo));
  if (dibujosPagina[p.numero]) hoja.append(ilustracion(dibujosPagina[p.numero], interactivo));
  if (escenasPagina[p.numero]) hoja.append(escena(escenasPagina[p.numero], interactivo));
  else if (p.numero === 11) hoja.append(libroConRotulador(interactivo));
  else if (dibujosPilares[p.numero]) hoja.append(ilustracion(dibujosPilares[p.numero], false));
  hoja.append(cabecera);
  const notas = document.createElement('div');
  notas.className = 'notas';
  for (const apartado of p.apartados) {
    const nota = document.createElement('section');
    nota.className = 'nota';
    if (apartado.titulo !== p.titulo) {
      const subtitulo = document.createElement('h2');
      const etiqueta = apartado.titulo + ':';
      if (['Qué mide', 'Problema típico', 'Lo que suele destapar', 'En qué consiste', 'Por qué funciona', 'Ideal para'].includes(apartado.titulo)) {
        subtitulo.append(elemento('mark', etiqueta));
      } else {
        subtitulo.textContent = etiqueta;
      }
      nota.append(subtitulo);
    }
    for (const linea of apartado.texto.split('\n').filter(Boolean)) {
      if (p.numero === 41 && linea === 'Orientadora Carmen Mora') continue;
      const parrafo = document.createElement('p');
      if (p.numero === 15) {
        parrafo.append('No estudies más horas, ', elemento('strong', 'estudia mejor.'));
      } else if (p.numero === 39 && linea === 'El sistema de estudio perfecto no está en esta lista.') {
        parrafo.append(elemento('strong', linea));
      } else if (p.numero === 13 && linea === 'La diferencia es abismal.') {
        parrafo.className = 'diferencia';
        parrafo.textContent = linea;
      } else if (p.numero === 13 && /^El aprendizaje (pasivo|activo)/.test(linea)) {
        const nombre = linea.match(/^El aprendizaje (?:pasivo|activo)/)[0];
        const etiqueta = elemento('strong', nombre);
        etiqueta.className = 'tipo-aprendizaje';
        parrafo.append(etiqueta, linea.slice(nombre.length));
      } else if ([24,25].includes(p.numero) && /asimilación y conexión de ideas/i.test(linea)) {
        parrafo.append(elemento('strong', linea));
      } else if (p.numero === 31) {
        const expresiones = /\b(salir de la simple relectura|ordenar las ideas, conectarlas, compararlas y distinguirlas)\b/giu;
        let inicio = 0;
        for (const coincidencia of linea.matchAll(expresiones)) {
          parrafo.append(linea.slice(inicio, coincidencia.index), elemento('strong', coincidencia[0]));
          inicio = coincidencia.index + coincidencia[0].length;
        }
        parrafo.append(linea.slice(inicio));
      } else if (p.numero === 36 && /^(Verde|Amarillo|Rojo):/.test(linea)) {
        const corte = linea.indexOf(':') + 1;
        const color = elemento('strong', linea.slice(0, corte));
        color.className = 'nivel-semaforo nivel-' + linea.slice(0, corte - 1).toLowerCase();
        parrafo.append(color, linea.slice(corte));
      } else if (p.numero === 12 && linea.includes('construirla')) {
        const [antes, despues] = linea.split('construirla');
        parrafo.append(antes, elemento('strong', 'construirla'), despues);
      } else if (p.numero === 16 && linea.startsWith('Este es el gran clásico:')) {
        const inicio = linea.indexOf('"');
        parrafo.append(linea.slice(0, inicio), elemento('q', linea.slice(inicio + 1, linea.lastIndexOf('"'))), linea.slice(linea.lastIndexOf('"') + 1));
      } else if ([24,32].includes(p.numero) && linea.startsWith('"')) {
        const cita = elemento('q', linea.slice(1, -1));
        cita.className = 'voz-alumno';
        parrafo.append(cita);
      } else {
        if (p.numero === 16 && /^["(]/.test(linea)) parrafo.className = 'frase-verde';
        resaltar(parrafo, linea, p.numero === 2 ? palabrasIntroduccion : p.numero === 14 ? palabrasReceta : [22,38].includes(p.numero) ? palabrasEnNegrita : p.numero === 40 ? palabrasCierre : palabrasClave);
      }
      nota.append(parrafo);
    }
    notas.append(nota);
  }
  if (p.numero === 1) {
    const firma = document.createElement('p');
    firma.className = 'firma';
    firma.textContent = '#orientadoracarmenmora';
    hoja.append(firma);
  } else if (p.apartados.some(apartado => apartado.texto)) {
    hoja.append(notas);
  }
  if (ejemplos[p.numero]) {
    const ejemplo = document.createElement('aside');
    ejemplo.className = 'ejemplo-tecnica';
    ejemplo.append(elemento('h2', 'Ejemplo práctico'), elemento('p', ejemplos[p.numero]));
    hoja.append(ejemplo);
  }
  if (p.numero === 20) {
    const recursos = document.createElement('div');
    recursos.className = 'enlaces-agenda';
    const enlace = elemento('a', 'Abrir agendas y plantillas de planificación');
    enlace.href = 'https://sites.google.com/view/orientadoracarmenmora/recursos/agendas';
    enlace.target = '_blank';
    enlace.rel = 'noopener noreferrer';
    recursos.append(enlace);
    const panel = document.createElement('aside');
    panel.className = 'panel-agenda';
    panel.append(recursos, escena('agenda', interactivo));
    hoja.append(panel);
  }
  if ([26,28,30].includes(p.numero)) hoja.append(ejemploVisual(p.numero, interactivo));
  if (interactivo && p.enlaces.length && !p.padre) {
    const fichas = document.createElement('div');
    fichas.className = 'fichas';
    if (p.esIndice) fichas.classList.add('fichas-indice');
    if (p.esIndice) {
      const cuestionario = control('Cuestionario de estudio', evento => abrirCuestionario(evento.currentTarget));
      cuestionario.className = 'enlace-cuestionario';
      fichas.append(cuestionario);
    }
    for (const enlace of p.enlaces) {
      const destino = buscar(enlace.destino);
      const boton = control(
        p.numero === 1 ? 'Empezar →' : enlace.etiqueta || '+ ' + destino.titulo,
        evento => ir(destino.numero, evento.currentTarget)
      );
      if (p.numero === 17 && escenasSoluciones[destino.numero]) {
        boton.prepend(escena(escenasSoluciones[destino.numero], interactivo).firstElementChild);
        boton.classList.add('boton-tecnica');
        if (interactivo) boton.classList.add('escena-activa');
      }
      if (p.numero === 3 && dibujosPilares[destino.numero]) {
        boton.prepend(dibujo(dibujosPilares[destino.numero]));
        boton.classList.add('boton-pilar');
      }
      if (p.esIndice) boton.classList.add('enlace-bloque');
      fichas.append(boton);
    }
    hoja.append(fichas);
  }
  if (p.numero === 41) {
    const firma = elemento('p', 'Orientadora Carmen Mora');
    firma.className = 'firma';
    hoja.append(firma);
  }
  if (interactivo && p.numero === 41) {
    const acceso = control('Cuestionario de estudio', evento => abrirCuestionario(evento.currentTarget));
    acceso.className = 'cuestionario-cierre';
    hoja.append(acceso);
  }
  if (!interactivo) {
    const pie = elemento('footer', '2026 Carmen Martínez Mora, todos los derechos reservados.');
    pie.className = 'derechos derechos-impresos';
    hoja.append(pie);
  }
  return hoja;
}

function mostrarDiapositiva(p, destino) {
  destino.replaceChildren(componer(p));
}

function ir(numero, origen) {
  if (location.hash !== '#pagina-' + numero) {
    history.pushState(null, '', '#pagina-' + numero);
  }
  mostrar(numero, origen);
}

function cerrarTarjeta() {
  if (tarjeta) ir(tarjeta.padre);
}

function mostrar(numero, origen) {
  const solicitada = buscar(numero) || principales[0];
  const destino = buscar(solicitada.fusionadaEn) || solicitada;
  if (destino === (tarjeta || pagina)) return;
  const base = destino.padre ? buscar(destino.padre) : destino;
  parar();
  if (base !== pagina) {
    pagina = base;
    mostrarDiapositiva(pagina, $('escenario'));
    const posicion = principales.indexOf(pagina);
    $('anterior').hidden = posicion === 0;
    $('ir-indice').hidden = posicion === 0 || pagina.esIndice === true;
    $('siguiente').hidden = posicion === 0 || posicion === principales.length - 1;
  }
  if (destino.padre) {
    activador = origen || activador;
    tarjeta = destino;
    $('titulo-tarjeta').textContent = destino.titulo;
    mostrarDiapositiva(destino, $('escenario-tarjeta'));
    if (!dialogo.open) {
      $('acceso').open = false;
      dialogo.prepend(barra);
      dialogo.showModal();
    }
    $('cerrar').focus();
  } else if (dialogo.open) {
    tarjeta = null;
    dialogo.close();
    $('acceso').open = false;
    document.body.prepend(barra);
    if (activador?.isConnected && activador.getClientRects().length) activador.focus();
    else $('escuchar').focus();
    activador = null;
  }
}

function desdeURL() {
  mostrar(Number(location.hash.match(/^#pagina-(\d+)$/)?.[1]));
}

function avanzar(paso) {
  const destino = principales[principales.indexOf(pagina) + paso];
  if (destino) ir(destino.numero);
}

function estado(mensaje) {
  $('estado').textContent = tarjeta || dialogoCuestionario.open ? '' : mensaje;
  $('estado-tarjeta').textContent = tarjeta ? mensaje : '';
  $('estado-cuestionario').textContent = dialogoCuestionario.open ? mensaje : '';
}

function controlesDetener(deshabilitado) {
  $('detener').disabled = deshabilitado;
  $('detener-cuestionario').disabled = deshabilitado;
}

function parar() {
  turno += 1;
  sintetizador?.cancel();
  controlesDetener(true);
  estado('');
}

function vozPredeterminada() {
  const navegador = globalThis.navigator?.userAgent || '';
  const esChrome = /(?:Chrome|Chromium|CriOS)\//.test(navegador);
  const esSafari = /Safari\//.test(navegador) && !esChrome && !/(?:FxiOS|EdgiOS|OPiOS)\//.test(navegador);
  const preferida = esChrome ? /google/i : esSafari ? /m[oó]nica/i : null;
  return (preferida && voces.find(voz => preferida.test(voz.name))) ||
    voces.find(voz => voz.default) || voces[0];
}

function cargarVoces() {
  const seleccion = $('voz').value;
  const anterior = seleccion === '' ? null : voces[Number(seleccion)];
  voces = (sintetizador?.getVoices() || []).filter(voz => /^es[-_]ES$/i.test(voz.lang))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const preferida = vozPredeterminada();
  const etiqueta = preferida ? 'Predeterminada · ' + preferida.name : 'Predeterminada (español de España)';
  $('voz').replaceChildren(new Option(etiqueta, ''));
  voces.forEach((voz, indice) => $('voz').add(new Option(voz.name, indice)));
  if (anterior) {
    const indice = voces.findIndex(voz => voz.voiceURI === anterior.voiceURI && voz.name === anterior.name);
    if (indice !== -1) $('voz').value = String(indice);
  }
}

const separadorDeFrases = typeof Intl.Segmenter === 'function'
  ? new Intl.Segmenter('es-ES', { granularity: 'sentence' })
  : null;

function textoParaVoz(texto) {
  return texto.replace(/["“”«»]/g, '').replace(/\bvs\.?(?=\s|$)/gi, 'versus').trim();
}

function hablar(p) {
  const titulo = p.numero === 17 ? 'Soluciones al problema 1' : p.titulo;
  const entradaTecnicas = {
    17: 'Para concentrarte y organizar tu tiempo, tienes estas técnicas:',
    25: 'Para entender y conectar las ideas, puedes elegir entre estas técnicas:',
    33: 'Para comprobar qué sabes antes de una prueba, tienes estas técnicas:'
  }[p.numero];
  if (entradaTecnicas) {
    const nombres = p.enlaces.map(({destino}) => buscar(destino).titulo.replace(/ \(Interleaving\)$/i, ''));
    const ultimo = nombres.pop();
    const lista = nombres.length ? nombres.join(', ') + ' y ' + ultimo : ultimo;
    reproducir([entradaTecnicas + ' ' + lista + '.'], titulo);
    return;
  }

  const bloques = [];
  if (p.numero === 1) bloques.push('Organiza, practica y comprueba.');
  if (!p.tituloSoloNavegacion) bloques.push(titulo);
  if (p.numero === 1) bloques.push('Primero y segundo de ESO.');
  for (const apartado of p.apartados) {
    const lineas = apartado.texto.split('\n').map(textoParaVoz).filter(linea =>
      linea && !/^(?:#orientadoracarmenmora|Orientadora Carmen Mora)$/i.test(linea)
    );
    if (apartado.titulo !== p.titulo && lineas.length) {
      lineas[0] = apartado.titulo + ': ' + lineas[0];
    }
    for (const linea of lineas) {
      const lista = linea.replace(/^(\d+)\.\s+/, '$1, ');
      if (lista.length <= 200 || !separadorDeFrases) {
        bloques.push(lista);
      } else {
        bloques.push(...Array.from(separadorDeFrases.segment(lista), ({segment}) => segment.trim()));
      }
    }
  }
  if (ejemplos[p.numero]) bloques.push('Ejemplo práctico. ' + ejemplos[p.numero]);
  if (p.numero === 28) bloques.push('Pulsa el nombre de un concepto para destacar su fila en la tabla.');
  if (p.numero === 30) bloques.push('El primer mapa muestra los estados del agua: sólido, líquido y gaseoso. El segundo muestra las partes de un relato: inicio, nudo y desenlace.');
  reproducir(bloques, titulo);
}

function reproducir(bloques, titulo) {
  parar();
  const frases = bloques.map(textoParaVoz).filter(Boolean);
  if (!frases.length) return;
  if (!sintetizador || typeof SpeechSynthesisUtterance === 'undefined') {
    estado('Este navegador no ofrece lectura en voz alta.');
    return;
  }
  const actual = turno;
  controlesDetener(false);
  estado('Leyendo · ' + titulo);
  const voz = $('voz').value === '' ? vozPredeterminada() : voces[Number($('voz').value)];
  let indice = 0;
  function siguiente() {
    if (actual !== turno) return;
    if (indice === frases.length) {
      controlesDetener(true);
      estado('Lectura terminada.');
      return;
    }
    const frase = new SpeechSynthesisUtterance(frases[indice++]);
    frase.lang = 'es-ES';
    if (voz) frase.voice = voz;
    frase.rate = Number($('velocidad').value);
    frase.onend = siguiente;
    frase.onerror = () => {
      if (actual !== turno) return;
      controlesDetener(true);
      estado('No se pudo reproducir la lectura. Prueba con otra voz del dispositivo.');
    };
    sintetizador.speak(frase);
  }
  siguiente();
}

function accesibilidad() {
  const escala = escalas[escalaActual];
  document.body.style.setProperty('--escala', escala);
  $('tamano').textContent = Math.round(escala * 100) + ' %';
  $('reducir').disabled = escalaActual === 0;
  $('ampliar').disabled = escalaActual === escalas.length - 1;
  const fuente = $('fuente').value;
  const contraste = $('contraste').value;
  document.body.classList.toggle('legible', fuente !== 'original');
  document.body.style.setProperty('--fuente-legible', fuente === 'Verdana' ? 'Verdana' : 'Arial');
  document.body.classList.toggle('contraste', contraste !== 'original');
  document.body.classList.toggle('contraste-inverso', contraste === 'blanco-negro');
}

function cargarPapel() {
  if ($('papel').childElementCount) return;
  $('papel').replaceChildren(...principales.flatMap(p => [p, ...paginas.filter(t => t.padre === p.numero)]).map(p => componer(p, false)));
}

$('ir-indice').onclick = () => ir(indice.numero);
$('indice-tarjeta').onclick = () => ir(indice.numero);
$('indice-cuestionario').onclick = () => { cerrarCuestionario(); ir(indice.numero); };
$('anterior').onclick = () => avanzar(-1);
$('siguiente').onclick = () => avanzar(1);
$('cerrar').onclick = cerrarTarjeta;
$('cerrar-tarjeta-abajo').onclick = cerrarTarjeta;
dialogo.addEventListener('cancel', e => { e.preventDefault(); cerrarTarjeta(); });
$('escuchar').onclick = () => hablar(tarjeta || pagina);
$('detener').onclick = parar;
$('voz').onchange = parar;
$('velocidad').onchange = parar;
for (const id of ['fuente', 'contraste']) $(id).onchange = accesibilidad;
$('reducir').onclick = () => { escalaActual--; accesibilidad(); };
$('ampliar').onclick = () => { escalaActual++; accesibilidad(); };
$('restablecer').onclick = () => {
  escalaActual = 1;
  $('fuente').value = 'original';
  $('contraste').value = 'original';
  accesibilidad();
  $('acceso').open = false;
  $('acceso').querySelector('summary').focus();
};
window.addEventListener('beforeprint', () => {
  if (!document.body.classList.contains('imprimir-resultado')) cargarPapel();
});
window.addEventListener('popstate', desdeURL);
window.addEventListener('hashchange', desdeURL);
window.addEventListener('keydown', e => {
  if (dialogoCuestionario.open || tarjeta || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented ||
      e.target.closest('select, input, textarea, [contenteditable]')) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); avanzar(1); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); avanzar(-1); }
});
sintetizador?.addEventListener('voiceschanged', cargarVoces);
cargarVoces();
accesibilidad();
desdeURL();

let lecturaCuestionario = [];
const datosCuestionario = { Nombre: '', Curso: '', Fecha: '' };

function camposDeIdentificacion() {
  const grupo = document.createElement('fieldset');
  grupo.className = 'datos-cuestionario';
  grupo.append(elemento('legend', 'Datos opcionales'));
  for (const etiqueta of Object.keys(datosCuestionario)) {
    const campo = elemento('label', etiqueta);
    const entrada = document.createElement('input');
    entrada.type = etiqueta === 'Fecha' ? 'date' : 'text';
    entrada.maxLength = etiqueta === 'Nombre' ? 100 : 40;
    entrada.value = datosCuestionario[etiqueta];
    entrada.addEventListener('input', () => { datosCuestionario[etiqueta] = entrada.value; });
    campo.append(entrada);
    grupo.append(campo);
  }
  return grupo;
}

const respuestas = habitos.map(pilar => pilar.preguntas.map(() => null));
const ordenPreguntas = habitos[0].preguntas.map((_, vuelta) =>
  [4, 1, 6, 2, 0, 5, 3].map((_, posicion, orden) => ({
    pilar: orden[(posicion + vuelta * 2) % orden.length],
    pregunta: vuelta
  }))
);

function abrirCuestionario(origen) {
  parar();
  origenCuestionario = origen;
  dialogoCuestionario.showModal();
  mostrarPreguntas(0);
}

function cerrarCuestionario() {
  parar();
  dialogoCuestionario.close();
  origenCuestionario?.focus();
}

function elemento(tipo, texto) {
  const item = document.createElement(tipo);
  item.textContent = texto;
  return item;
}

function mostrarPreguntas(indice) {
  parar();
  const ronda = ordenPreguntas[indice];
  const contenido = $('contenido-cuestionario');
  const titulo = elemento('h3', 'Preguntas ' + (indice * habitos.length + 1) + ' a ' + ((indice + 1) * habitos.length) + ' de ' + habitos.flatMap(p => p.preguntas).length);
  titulo.tabIndex = -1;
  const instrucciones = elemento('p', 'Piensa en las últimas dos semanas. Elige la frecuencia que más se parezca a lo que haces.');
  const formulario = document.createElement('form');
  ronda.forEach(({pilar, pregunta}, posicion) => {
    const [texto] = habitos[pilar].preguntas[pregunta];
    const etiqueta = elemento('label', (indice * habitos.length + posicion + 1) + '. ' + texto);
    etiqueta.className = 'pregunta';
    const opciones = document.createElement('select');
    opciones.required = true;
    opciones.add(new Option('Elige una respuesta', ''));
    ['Casi nunca', 'A veces', 'A menudo', 'Casi siempre'].forEach((texto, valor) =>
      opciones.add(new Option(texto, valor))
    );
    opciones.value = respuestas[pilar][pregunta] ?? '';
    opciones.addEventListener('change', () => { respuestas[pilar][pregunta] = opciones.value; });
    etiqueta.append(opciones);
    formulario.append(etiqueta);
  });
  const botones = document.createElement('div');
  botones.className = 'acciones-cuestionario';
  if (indice > 0) botones.append(control('← Anterior', () => mostrarPreguntas(indice - 1)));
  const ultimo = indice === ordenPreguntas.length - 1;
  lecturaCuestionario = indice === 0
    ? ['Vas a hacer un cuestionario sobre cómo estudias. Al terminar, verás una gráfica y recibirás orientaciones para mejorar.']
    : [];
  $('escuchar-cuestionario').hidden = indice !== 0;
  $('detener-cuestionario').hidden = indice !== 0;
  const avanzar = elemento('button', ultimo ? 'Ver mis resultados' : 'Siguiente →');
  avanzar.type = 'submit';
  botones.append(avanzar);
  formulario.append(botones);
  formulario.onsubmit = evento => {
    evento.preventDefault();
    if (ultimo) mostrarResultados();
    else mostrarPreguntas(indice + 1);
  };
  const identificacion = indice === 0 ? [camposDeIdentificacion()] : [];
  contenido.replaceChildren(titulo, instrucciones, ...identificacion, formulario,
    elemento('small', 'Cuestionario de reflexión. Las respuestas no se envían ni se guardan al cerrar la página.'));
  titulo.focus();
}

function puntuaciones(datos = respuestas) {
  return habitos.map((pilar, indice) => {
    const valores = datos[indice].map(Number);
    const puntos = valores.reduce((total, valor) => total + valor, 0);
    const maximo = 3 * valores.length;
    return {
      titulo: pilar.titulo,
      tarjeta: pilar.tarjeta,
      motivo: pilar.motivo,
      puntos,
      maximo,
      fortaleza: Math.max(...valores) >= 2 ? pilar.preguntas[valores.indexOf(Math.max(...valores))][4] : '',
      porcentaje: Math.round(100 * puntos / maximo),
      porPracticar: pilar.preguntas.flatMap(([habito, consejo, destino], n) =>
        valores[n] < 2 ? [{habito, consejo, destino, frecuencia: valores[n]}] : []
      ).sort((a, b) => a.frecuencia - b.frecuencia)
    };
  });
}

function mostrarResultados() {
  parar();
  const incompleto = ordenPreguntas.findIndex(ronda => ronda.some(({pilar, pregunta}) =>
    respuestas[pilar][pregunta] === null || respuestas[pilar][pregunta] === ''
  ));
  if (incompleto !== -1) {
    mostrarPreguntas(incompleto);
    return;
  }
  const informe = crearInforme(puntuaciones(), datosCuestionario);
  $('escuchar-cuestionario').hidden = false;
  $('detener-cuestionario').hidden = false;
  const acciones = document.createElement('div');
  acciones.className = 'acciones-cuestionario';
  acciones.append(control('Guardar resultado como PDF', () => guardarResultado(informe)),
    control('Revisar mis respuestas', () => mostrarPreguntas(0)));
  $('contenido-cuestionario').replaceChildren(informe, acciones);
  informe.querySelector('h3').focus();
}

const mensajesParaMantener = {
  'Lugar de estudio': 'Vas bien preparando tu sitio de estudio y apartando las distracciones. Sigue así.',
  'Plan de trabajo': 'Vas bien eligiendo tus tareas y repartiendo el repaso. Mantén ese plan.',
  'Actitud ante el estudio': 'Vas bien intentando resolver lo que entiendes y pidiendo ayuda cuando te atascas. Sigue así.',
  'Descanso y energía': 'Vas bien cuidando las pausas, el sueño y la comodidad. Mantén esos hábitos.',
  'Técnicas de estudio': 'Vas bien recordando sin mirar y explicando las ideas con tus palabras. Sigue practicando así.',
  'Trabajos': 'Vas bien ordenando las ideas y revisando el trabajo antes de entregar. Mantén esa rutina.',
  'Exámenes y ejercicios': 'Vas bien practicando sin mirar y corrigiendo tus errores. Sigue haciéndolo antes de las pruebas.'
};

function crearInforme(resultados, identificacion = {}) {
  const titulo = elemento('h3', 'Tu perfil de hábitos');
  titulo.tabIndex = -1;
  const intro = elemento('p', 'Cada barra representa uno de los siete pilares. Debajo encontrarás una idea para mejorar o un hábito que ya haces bien y puedes mantener.');
  const grafica = document.createElement('ul');
  grafica.className = 'grafica-habitos';
  grafica.setAttribute('aria-label', 'Resultados de los siete pilares');
  const filasPorPilar = new Map();
  for (const resultado of resultados) {
    const {titulo, porcentaje, puntos, maximo} = resultado;
    const fila = document.createElement('li');
    const barra = document.createElement('div');
    barra.className = 'barra-habito';
    barra.setAttribute('aria-hidden', 'true');
    barra.style.setProperty('--resultado', porcentaje + '%');
    const valor = elemento('span', porcentaje + ' % · ' + puntos + '/' + maximo);
    valor.className = 'valor-habito';
    fila.append(elemento('strong', titulo), valor, barra);
    filasPorPilar.set(titulo, fila);
    grafica.append(fila);
  }
  lecturaCuestionario = ['Tu perfil de hábitos. Debajo de cada barra tienes una orientación.'];
  for (const resultado of resultados) {
    const bloque = document.createElement('section');
    bloque.className = 'devolucion-habitos orientacion-pilar';
    bloque.setAttribute('aria-label', 'Orientación de ' + resultado.titulo);
    const sugerencia = resultado.porPracticar[0];
    const balance = resultado.porcentaje > 60 ? 'En general, vas bien.' : '';
    const paso = sugerencia && resultado.fortaleza
      ? 'Para mejorar, ' + sugerencia.consejo[0].toLocaleLowerCase('es') + sugerencia.consejo.slice(1)
      : sugerencia?.consejo;
    const mensaje = sugerencia
      ? [balance, resultado.fortaleza, paso].filter(Boolean).join(' ')
      : mensajesParaMantener[resultado.titulo];
    bloque.append(elemento('p', mensaje));
    lecturaCuestionario.push(resultado.titulo + ', ' + resultado.porcentaje + ' por ciento. ' + mensaje);
    if (sugerencia) {
      const tecnica = buscar(sugerencia.destino).titulo;
      const recurso = control('Ver técnica · ' + tecnica, () => {
        cerrarCuestionario();
        ir(sugerencia.destino);
      });
      recurso.className = 'recurso-habito';
      bloque.append(recurso);
      const referencia = elemento('p', 'Técnica relacionada: ' + tecnica);
      referencia.className = 'referencia-habito';
      bloque.append(referencia);
    }
    filasPorPilar.get(resultado.titulo).append(bloque);
  }
  const informe = document.createElement('section');
  informe.className = 'informe-habitos';
  const cabecera = document.createElement('header');
  cabecera.append(elemento('p', 'ESTUDIA CON MÉTODO · CÓMO ESTUDIO'), titulo);
  const datos = document.createElement('dl');
  datos.className = 'identificacion-informe';
  for (const [etiqueta, entrada] of Object.entries(identificacion)) {
    const valor = entrada.trim();
    if (!valor) continue;
    const linea = document.createElement('div');
    linea.append(elemento('dt', etiqueta), elemento('dd', etiqueta === 'Fecha' ? valor.split('-').reverse().join('/') : valor));
    datos.append(linea);
  }
  if (datos.childElementCount) cabecera.append(datos);
  cabecera.append(intro);
  informe.append(cabecera, grafica);
  return informe;
}

$('cerrar-cuestionario').onclick = cerrarCuestionario;
$('escuchar-cuestionario').onclick = () => reproducir(lecturaCuestionario, 'Cuestionario de estudio');
$('detener-cuestionario').onclick = parar;
dialogoCuestionario.addEventListener('cancel', evento => {
  evento.preventDefault();
  cerrarCuestionario();
});

function guardarResultado(informe) {
  const papel = $('papel-resultado');
  const copia = informe.cloneNode(true);
  papel.replaceChildren(copia);
  document.body.classList.add('imprimir-resultado');
  const limpiar = () => {
    document.body.classList.remove('imprimir-resultado');
    papel.replaceChildren();
  };
  window.addEventListener('afterprint', limpiar, { once: true });
  try {
    window.print();
  } catch (error) {
    window.removeEventListener('afterprint', limpiar);
    limpiar();
    throw error;
  }
}
