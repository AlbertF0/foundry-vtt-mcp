#!/usr/bin/env node
// Actualiza las páginas del journal "Recursos — Lost Mine of Phandelver" con estados reales.
const net = require('net');

// IDs del journal y páginas (obtenidos de list-journals)
const journalId = 'ZLsw9L4IkxU6QJuH';
const pages = {
  mapas: 'ZNYLXy2PnrmiBoqe',
  criaturas: 'KV362szhYbKqpeoZ',
  objetos: 'l734jsoNK8f23M9L',
};

const paginaMapas = `<h2>Mapas</h2>
<blockquote><strong>✅ Importado desde Plutonium.</strong> Todos los mapas están en Foundry con muros oficiales. El Castillo Cragmaw tiene tu imagen custom como fondo manteniendo los 392 muros.</blockquote>
<table>
<thead><tr><th>Escena / Mapa</th><th>Estado</th><th>Origen</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>00 — Costa de la Espada (mapa regional)</td><td>🟩 Completado</td><td>Plutonium</td><td>Sin muros (ilustración regional)</td></tr>
<tr><td>01 — Guarida Cragmaw</td><td>🟩 Completado</td><td>Plutonium</td><td>295 muros/puertas</td></tr>
<tr><td>02 — Phandalin (pueblo)</td><td>🟩 Completado</td><td>Plutonium</td><td>Sin muros interiores (mapa de pueblo)</td></tr>
<tr><td>02b — Guarida Bandas Rojas (Mansión Tresendar)</td><td>🟩 Completado</td><td>Plutonium</td><td>201 muros/puertas</td></tr>
<tr><td>03 — Ruinas de Thundertree</td><td>🟩 Completado</td><td>Plutonium</td><td>191 muros/puertas</td></tr>
<tr><td>03b — Castillo Cragmaw</td><td>🟩 Completado</td><td>Plutonium + Local</td><td>392 muros · fondo: CragmawCastleWM_88x64.jpg</td></tr>
<tr><td>04 — Cueva del Eco de las Olas</td><td>🟩 Completado</td><td>Plutonium</td><td>919 muros/puertas (mapa grande)</td></tr>
</tbody>
</table>`;

const paginaCreaturas = `<h2>Criaturas</h2>
<blockquote><strong>✅ Todos los actores importados desde Plutonium y organizados.</strong> NPCs únicos en carpetas por capítulo; monstruos genéricos en carpeta "Monstruos". Nombres en español. Nótico con retrato/token custom.</blockquote>

<h3>NPCs únicos por capítulo</h3>
<table>
<thead><tr><th>Criatura</th><th>Estado</th><th>Carpeta</th><th>Origen</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Gundren Peñabuscador</td><td>🟩 Completado</td><td>Parte 1 — Flechas Goblin</td><td>Plutonium (LMoP)</td><td></td></tr>
<tr><td>Sildar Hallinvierno</td><td>🟩 Completado</td><td>Parte 1 — Flechas Goblin</td><td>Plutonium (LMoP)</td><td></td></tr>
<tr><td>Iarno «Bastón de Cristal» Albrek</td><td>🟩 Completado</td><td>Parte 2 — Phandalin</td><td>Plutonium (LMoP)</td><td>Evil Mage</td></tr>
<tr><td>Nundro Peñabuscador</td><td>🟩 Completado</td><td>Parte 2 — Phandalin</td><td>Plutonium (LMoP)</td><td></td></tr>
<tr><td>Colmillo Venenoso</td><td>🟩 Completado</td><td>Parte 3 — La Red de la Araña</td><td>Plutonium (LMoP)</td><td>Dragón verde joven</td></tr>
<tr><td>Nezznar la Araña Negra</td><td>🟩 Completado</td><td>Parte 4 — Cueva del Eco de las Olas</td><td>Plutonium (LMoP)</td><td>Villano principal</td></tr>
<tr><td>Mormesk el Espectro</td><td>🟩 Completado</td><td>Parte 4 — Cueva del Eco de las Olas</td><td>Plutonium (LMoP)</td><td></td></tr>
</tbody>
</table>

<h3>Monstruos genéricos (carpeta Monstruos)</h3>
<table>
<thead><tr><th>Criatura</th><th>Estado</th><th>Origen</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Guerrero Goblin</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Lobo</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Guerrero Bugbear</td><td>🟩 Completado</td><td>Plutonium</td><td>Klarg / King Grol</td></tr>
<tr><td>Esqueleto</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Nótico</td><td>🟩 Completado</td><td>Plutonium + Local</td><td>Retrato/token custom aplicados</td></tr>
<tr><td>Stirge</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Ogro</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Guerrero Hobgoblin</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Matón</td><td>🟩 Completado</td><td>Plutonium</td><td>Tough</td></tr>
<tr><td>Lechuoso</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Ghoul</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Zombi</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Plaga Ramilla</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Araña Gigante</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Dragón Verde Joven</td><td>🟩 Completado</td><td>Plutonium</td><td>Stat block genérico</td></tr>
<tr><td>Cultista</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Grick</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Doppelgänger</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Aldeano</td><td>🟩 Completado</td><td>Plutonium</td><td>NPCs civiles</td></tr>
<tr><td>Gelatina Ocre</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Cráneo en Llamas</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Espectador</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Zombi de Ceniza</td><td>🟩 Completado</td><td>Plutonium (LMoP)</td><td>Homebrew LMoP</td></tr>
<tr><td>Matón de la Banda Roja</td><td>🟩 Completado</td><td>Plutonium (LMoP)</td><td>Homebrew LMoP</td></tr>
</tbody>
</table>`;

const paginaObjetos = `<h2>Objetos y conjuros</h2>
<blockquote><strong>✅ Importados desde Plutonium</strong> (carpetas Items y Spells).</blockquote>
<h3>Objetos mágicos</h3>
<table>
<thead><tr><th>Objeto</th><th>Estado</th><th>Origen</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Lightbringer (Maza +1)</td><td>🟩 Completado</td><td>Plutonium</td><td>Wave Echo Cave</td></tr>
<tr><td>Staff of Defense (Bastón de Defensa)</td><td>🟩 Completado</td><td>Plutonium</td><td>Iarno lo lleva</td></tr>
<tr><td>Spider Staff (Bastón de la Araña)</td><td>🟩 Completado</td><td>Plutonium</td><td>Nezznar lo lleva</td></tr>
<tr><td>Dragonguard (Coraza +1)</td><td>🟩 Completado</td><td>Plutonium</td><td>Cragmaw Castle</td></tr>
<tr><td>Ring of Protection (Anillo de Protección)</td><td>🟩 Completado</td><td>Plutonium</td><td>Wave Echo Cave</td></tr>
<tr><td>Gauntlets of Ogre Power</td><td>🟩 Completado</td><td>Plutonium</td><td>Wave Echo Cave</td></tr>
<tr><td>Boots of Striding and Springing</td><td>🟩 Completado</td><td>Plutonium</td><td>Cragmaw Castle</td></tr>
<tr><td>Wand of Magic Missiles</td><td>🟩 Completado</td><td>Plutonium</td><td>Wave Echo Cave</td></tr>
<tr><td>+1 Weapon (Talon / Hew)</td><td>🟨 Parcial</td><td>Plutonium</td><td>Genérico; Talon y Hew son únicos de LMoP — renombrar si quieres</td></tr>
<tr><td>+1 Armor</td><td>🟨 Parcial</td><td>Plutonium</td><td>Genérico</td></tr>
<tr><td>Potion of Healing</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Potion of Invisibility</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Potion of Flying</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Potion of Vitality</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Spell Scrolls (varios)</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Thieves' Tools</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
<tr><td>Studded Leather Armor</td><td>🟩 Completado</td><td>Plutonium</td><td></td></tr>
</tbody>
</table>
<h3>Conjuros</h3>
<table>
<thead><tr><th>Conjuro</th><th>Estado</th><th>Origen</th></tr></thead>
<tbody>
<tr><td>Detect Magic, Mage Armor, Darkness, Misty Step, Lightning Bolt</td><td>🟩 Completado</td><td>Plutonium</td></tr>
<tr><td>Augury, Silence, Revivify, Invisibility, Identify</td><td>🟩 Completado</td><td>Plutonium</td></tr>
</tbody>
</table>
<h3>Documentos / handouts</h3>
<table>
<thead><tr><th>Documento</th><th>Estado</th><th>Notas</th></tr></thead>
<tbody>
<tr><td>Journal "Lost Mine of Phandelver" (8 páginas)</td><td>🟩 Completado</td><td>Importado de Plutonium — texto completo de la aventura</td></tr>
<tr><td>Cartas y handouts individuales</td><td>⬜ Pendiente</td><td>Deja los archivos en <code>campania/documentos/</code> si los tienes</td></tr>
</tbody>
</table>`;

function sendUpdate(pageId, content, label) {
  return new Promise((resolve, reject) => {
    const msg =
      JSON.stringify({
        id: `update-page-${pageId}`,
        method: 'call_tool',
        params: {
          name: 'update-journal-page',
          args: { journalId, pageId, content },
        },
      }) + '\n';

    const client = net.createConnection({ host: '127.0.0.1', port: 31414 }, () => {
      client.write(msg);
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
          if (resp.id === `update-page-${pageId}`) {
            if (resp.error) {
              console.log(`❌ ${label}: ${resp.error.message}`);
            } else {
              console.log(`✅ ${label}: actualizado`);
            }
            client.end();
            resolve(resp);
          }
        } catch (e) {}
      }
    });
    client.on('error', err => {
      console.log(`❌ ${label}: ${err.message}`);
      resolve(null);
    });
    setTimeout(() => {
      client.end();
      resolve(null);
    }, 10000);
  });
}

async function main() {
  await sendUpdate(pages.mapas, paginaMapas, 'Mapas');
  await sendUpdate(pages.criaturas, paginaCreaturas, 'Criaturas');
  await sendUpdate(pages.objetos, paginaObjetos, 'Objetos y conjuros');
  console.log('Journal de Recursos actualizado.');
}

main().catch(console.error);
