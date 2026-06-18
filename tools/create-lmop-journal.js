#!/usr/bin/env node
// Script puntual: crea el journal "Recursos — Lost Mine of Phandelver" vía socket de control.
const net = require('net');

const paginaLeyenda = `<h2>Leyenda de estados de completado</h2>
<p>Cada recurso de la campaña tiene un <strong>estado</strong> (cuán completado está) y un <strong>Origen</strong> (de dónde sale el recurso). Son ejes independientes.</p>
<h3>Estados</h3>
<table>
<thead><tr><th>Icono</th><th>Estado</th><th>Significado</th></tr></thead>
<tbody>
<tr><td>⬜</td><td><strong>Pendiente</strong></td><td>Sin empezar. No hay ficha ni recurso preparado aún.</td></tr>
<tr><td>🟦</td><td><strong>Material reunido</strong></td><td>El recurso (imagen del usuario o ficha de Plutonium) ya está disponible, pero todavía no montado en Foundry.</td></tr>
<tr><td>🟨</td><td><strong>Parcial</strong></td><td>Montado en Foundry, pero le falta algo (imagen custom, token, muros/luces, datos incompletos…).</td></tr>
<tr><td>🟩</td><td><strong>Completado</strong></td><td>Terminado del todo. El recurso está en Foundry y listo para jugar.</td></tr>
<tr><td>⬛</td><td><strong>Omitido</strong></td><td>No se usará en esta campaña (se descarta intencionalmente).</td></tr>
</tbody>
</table>
<h3>Columna Origen</h3>
<table>
<thead><tr><th>Origen</th><th>Descripción</th></tr></thead>
<tbody>
<tr><td><strong>Plutonium</strong></td><td>Recurso oficial disponible en el módulo Plutonium (bestiario WotC, mapas oficiales, objetos SRD).</td></tr>
<tr><td><strong>Local</strong></td><td>Imagen o archivo UVTT del usuario, dejado en las carpetas de <code>campania/</code>.</td></tr>
<tr><td><strong>PDF</strong></td><td>Homebrew del PDF: stat block o reglas propias de la aventura que no están en compendios oficiales.</td></tr>
</tbody>
</table>
<hr>
<p><em>Este journal lo edita el usuario (cambia estados, añade sus propios mapas) y lo lee la skill <strong>populate-campaign</strong> como fuente de verdad.</em></p>`;

const paginaMapas = `<h2>Mapas</h2>
<blockquote><strong>⚠️ Recomendación Plutonium:</strong> Lost Mine of Phandelver está disponible como aventura oficial en Plutonium (LMoP, nivel 1-5, 8 capítulos). <strong>Importa la aventura en Plutonium primero</strong> (importador de Aventuras en la UI) para obtener todos los mapas con muros, criaturas, objetos y journals oficiales de una sola vez. Luego <code>populate-campaign</code> los reconcilia y superpone tus imágenes.</blockquote>
<table>
<thead><tr><th>Escena / Mapa</th><th>Estado</th><th>Origen</th><th>Ruta local / Notas</th></tr></thead>
<tbody>
<tr><td>00 — Costa de la Espada (mapa regional)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/00-costa-de-la-espada/</code> · Ilustración, no mapa de combate</td></tr>
<tr><td>01 — Guarida Cragmaw</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/01-guarida-cragmaw/</code> · Cueva, Parte 1</td></tr>
<tr><td>02 — Phandalin (pueblo)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/02-phandalin/</code> · Parte 2</td></tr>
<tr><td>02b — Guarida Bandas Rojas (Mansión Tresendar)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/02b-guarida-bandas-rojas/</code> · Mazmorra bajo Phandalin</td></tr>
<tr><td>03 — Ruinas de Thundertree</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/03-ruinas-thundertree/</code> · Ruinas exteriores, Parte 3</td></tr>
<tr><td>03b — Castillo Cragmaw</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/03b-castillo-cragmaw/</code> · Parte 3</td></tr>
<tr><td>04 — Cueva del Eco de las Olas</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/mapas/04-cueva-eco-de-las-olas/</code> · Mazmorra final, Parte 4</td></tr>
<tr><td colspan="4"><em>← Añade aquí tus propios mapas con su ruta local si los tienes</em></td></tr>
</tbody>
</table>`;

const paginaCreaturas = `<h2>Criaturas</h2>
<h3>NPCs con nombre (stat blocks propios de LMoP)</h3>
<table>
<thead><tr><th>Criatura</th><th>CR</th><th>Cant.</th><th>Estado</th><th>Origen</th><th>Retrato / Token</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Sildar Hallwinter</td><td>—</td><td>1</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/npcs/retratos/sildar.webp</code><br><code>campania/npcs/tokens/sildar.webp</code></td><td>Aliado, Lords' Alliance</td></tr>
<tr><td>Iarno "Bastón de Cristal" Albrek</td><td>1</td><td>1</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/npcs/retratos/iarno.webp</code><br><code>campania/npcs/tokens/iarno.webp</code></td><td>Evil Mage, villano Parte 2</td></tr>
<tr><td>Nezznar, la Araña Negra</td><td>4</td><td>1</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/npcs/retratos/nezznar.webp</code><br><code>campania/npcs/tokens/nezznar.webp</code></td><td>Villano principal, drow</td></tr>
<tr><td>Gundren Rockseeker</td><td>—</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/npcs/retratos/gundren.webp</code><br><code>campania/npcs/tokens/gundren.webp</code></td><td>Patrón, Commoner (MM)</td></tr>
<tr><td>Mormesk el Espectro</td><td>—</td><td>1</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/npcs/retratos/mormesk.webp</code></td><td>Wave Echo Cave; Wraith custom LMoP</td></tr>
<tr><td>Klarg (bugbear jefe Cragmaw)</td><td>1</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/npcs/retratos/klarg.webp</code></td><td>Bugbear (MM)</td></tr>
<tr><td>King Grol (bugbear jefe tribu)</td><td>1</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/npcs/retratos/king-grol.webp</code></td><td>Bugbear (MM)</td></tr>
<tr><td>Venomfang (dragón verde joven)</td><td>8</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/npcs/retratos/venomfang.webp</code></td><td>Thundertree, encuentro opcional</td></tr>
<tr><td>NPCs civiles (Garaele, Daran, Halia, Harbin, Toblen, Barthen, Reidoth, Qelline…)</td><td>—</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/npcs/retratos/</code></td><td>Sin combate; Commoner/Guard (MM)</td></tr>
</tbody>
</table>
<h3>Monstruos genéricos del Monster Manual (Origen: Plutonium)</h3>
<table>
<thead><tr><th>Criatura</th><th>CR</th><th>Cant. aprox.</th><th>Estado</th><th>Origen</th><th>Retrato / Token</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Goblin</td><td>¼</td><td>20+</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/goblin.webp</code><br><code>campania/monstruos/tokens/goblin.webp</code></td><td>Partes 1 y 2</td></tr>
<tr><td>Wolf / Lobo</td><td>¼</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/wolf.webp</code></td><td>Cragmaw Hideout</td></tr>
<tr><td>Bugbear</td><td>1</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/bugbear.webp</code></td><td>Partes 1, 3 y 4</td></tr>
<tr><td>Hobgoblin</td><td>½</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/hobgoblin.webp</code></td><td>Parte 3</td></tr>
<tr><td>Skeleton / Esqueleto</td><td>¼</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/skeleton.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Zombie</td><td>¼</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/zombie.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Twig Blight</td><td>⅛</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/twig-blight.webp</code></td><td>Thundertree</td></tr>
<tr><td>Giant Spider / Araña Gigante</td><td>1</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/giant-spider.webp</code></td><td>Cragmaw Hideout, Wave Echo Cave</td></tr>
<tr><td>Ghoul</td><td>1</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/ghoul.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Grick</td><td>2</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/grick.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Orc</td><td>½</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/orc.webp</code></td><td>Thundertree (optional)</td></tr>
<tr><td>Ogre</td><td>2</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/ogre.webp</code></td><td>Cragmaw Castle</td></tr>
<tr><td>Owlbear</td><td>3</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/owlbear.webp</code></td><td>Parte 3</td></tr>
<tr><td>Stirge</td><td>⅛</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/stirge.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Ochre Jelly</td><td>2</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/ochre-jelly.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Nothic</td><td>3</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/nothic.webp</code></td><td>Phandalin (Guarida Bandas Rojas)</td></tr>
<tr><td>Flameskull</td><td>4</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/flameskull.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Spectator</td><td>3</td><td>1</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/spectator.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Doppelganger</td><td>3</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/doppelganger.webp</code></td><td>Phandalin</td></tr>
<tr><td>Cultist</td><td>⅛</td><td>varios</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/monstruos/retratos/cultist.webp</code></td><td>Thundertree</td></tr>
</tbody>
</table>
<h3>Criaturas homebrew de LMoP (Origen: PDF)</h3>
<table>
<thead><tr><th>Criatura</th><th>CR</th><th>Cant. aprox.</th><th>Estado</th><th>Origen</th><th>Retrato / Token</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Redbrand Ruffian</td><td>½</td><td>10+</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/monstruos/retratos/redbrand.webp</code></td><td>Stat block LMoP p. 20</td></tr>
<tr><td>Ash Zombie</td><td>¼</td><td>varios</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/monstruos/retratos/ash-zombie.webp</code></td><td>Thundertree; Zombie con resistencia al fuego</td></tr>
</tbody>
</table>`;

const paginaObjetos = `<h2>Objetos y conjuros</h2>
<h3>Objetos mágicos</h3>
<table>
<thead><tr><th>Objeto / Conjuro</th><th>Estado</th><th>Origen</th><th>Icono (ruta)</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Bastón de Defensa (Staff of Defense)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/baston-defensa.webp</code></td><td>Iarno lo lleva; Partes 2</td></tr>
<tr><td>Bastón de la Araña (Spider Staff)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/baston-arana.webp</code></td><td>Nezznar; Parte 4</td></tr>
<tr><td>Lightbringer (Maza +1, brillante)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/lightbringer.webp</code></td><td>Wave Echo Cave; objeto único LMoP</td></tr>
<tr><td>Dragonguard (Coraza +1)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/dragonguard.webp</code></td><td>Cragmaw Castle; objeto único LMoP</td></tr>
<tr><td>Guanteletes de Poder de Ogro</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/guanteletes-ogro.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Botas de Zancada y Salto</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/botas-zancada.webp</code></td><td>Cragmaw Castle</td></tr>
<tr><td>Varita de Proyectiles Mágicos</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/varita-proyectiles.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Anillo de Protección</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/anillo-proteccion.webp</code></td><td>Wave Echo Cave</td></tr>
<tr><td>Talon (Espada larga +1)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/talon.webp</code></td><td>Wave Echo Cave; objeto único LMoP</td></tr>
<tr><td>Hew (Hacha de batalla +1)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/hew.webp</code></td><td>Wave Echo Cave; objeto único LMoP</td></tr>
<tr><td>Pociones de Curación (varias)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/pocion-curacion.webp</code></td><td>Repartidas en varios encuentros</td></tr>
<tr><td>Pergaminos de conjuros (varios)</td><td>⬜ Pendiente</td><td>Plutonium</td><td><code>campania/objetos/pergamino.webp</code></td><td>Wave Echo Cave y Guarida Bandas Rojas</td></tr>
</tbody>
</table>
<h3>Documentos / handouts</h3>
<table>
<thead><tr><th>Documento</th><th>Estado</th><th>Origen</th><th>Ruta</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Carta de la Araña Negra a Iarno</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/documentos/carta-arana.webp</code></td><td>Handout Guarida Bandas Rojas</td></tr>
<tr><td>Diario de Urmon (Wave Echo Cave)</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/documentos/diario-urmon.webp</code></td><td>Lore de la Forja de Conjuros</td></tr>
<tr><td>Mapa de Gundren a Wave Echo Cave</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/documentos/mapa-gundren.webp</code></td><td>Handout clave de la aventura</td></tr>
<tr><td>Boceto de recompensa hobgoblins</td><td>⬜ Pendiente</td><td>PDF</td><td><code>campania/documentos/recompensa-hobgoblins.webp</code></td><td>Handout Cragmaw Castle</td></tr>
</tbody>
</table>`;

const args = {
  name: 'Recursos — Lost Mine of Phandelver',
  folderName: 'Lost Mine of Phandelver',
  pages: [
    { name: 'Leyenda de estados', content: paginaLeyenda },
    { name: 'Mapas', content: paginaMapas },
    { name: 'Criaturas', content: paginaCreaturas },
    { name: 'Objetos y conjuros', content: paginaObjetos },
  ],
};

const message =
  JSON.stringify({
    id: 'create-lmop-journal-1',
    method: 'call_tool',
    params: { name: 'create-journal', args },
  }) + '\n';

const client = net.createConnection({ host: '127.0.0.1', port: 31414 }, () => {
  console.log('Conectado al backend. Enviando create-journal...');
  client.write(message);
});

let buffer = '';
client.setEncoding('utf8');
client.on('data', data => {
  buffer += data;
  const lines = buffer.split('\n');
  buffer = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const resp = JSON.parse(line);
      if (resp.id === 'create-lmop-journal-1') {
        console.log('Respuesta recibida:');
        console.log(JSON.stringify(resp, null, 2));
        client.end();
      }
    } catch (e) {
      // ignore partial lines
    }
  }
});

client.on('error', err => {
  console.error('Error de conexión:', err.message);
  process.exit(1);
});

client.on('end', () => {
  console.log('Conexión cerrada.');
});

// Timeout de seguridad
setTimeout(() => {
  console.error('Timeout: no hubo respuesta en 30s');
  client.end();
  process.exit(1);
}, 30000);
