#!/usr/bin/env node
// Actualiza (de verdad) el journal "Recursos — Lost Mine of Phandelver" al estado real.
const net = require('net');
function call(id, name, args) {
  return new Promise(r => {
    const c = net.createConnection({ host: '127.0.0.1', port: 31414 }, () =>
      c.write(JSON.stringify({ id, method: 'call_tool', params: { name, args } }) + '\n')
    );
    let b = '';
    c.setEncoding('utf8');
    c.on('data', d => {
      b += d;
      const ls = b.split('\n');
      b = ls.pop();
      for (const l of ls) {
        if (!l.trim()) continue;
        try {
          const j = JSON.parse(l);
          if (j.id === id) {
            c.end();
            r(j);
          }
        } catch (e) {}
      }
    });
    c.on('error', e => {
      r({ error: e.message });
    });
    setTimeout(() => {
      c.end();
      r({ error: 'timeout' });
    }, 15000);
  });
}
const J = 'Recursos — Lost Mine of Phandelver';

const mapas = `<h2>Mapas</h2>
<blockquote><strong>Panel por fases.</strong> Cada columna la actualiza una skill: <em>Escena creada</em> → populate-campaign · <em>Notas de sala</em> → place-map-notes · <em>Tokens</em> → place-encounter-tokens.</blockquote>
<table>
<thead><tr><th>Escena / Mapa</th><th>Escena creada</th><th>Notas de sala</th><th>Tokens</th><th>Origen</th><th>Ruta / Notas</th></tr></thead>
<tbody>
<tr><td>00 — Costa de la Espada</td><td>🟩</td><td>🟩 <small>(solo pin de mapa, regional)</small></td><td>🟩 <small>(emboscada, fila abajo)</small></td><td>Plutonium</td><td>Mapa regional, sin salas con clave</td></tr>
<tr><td>01 — Guarida Cragmaw</td><td>🟩</td><td>🟩 <small>(8 salas + pin)</small></td><td>🟩 <small>(20 tokens)</small></td><td>Plutonium</td><td>295 muros</td></tr>
<tr><td>02 — Phandalin</td><td>🟩</td><td>🟩 <small>(10 + pin)</small></td><td>⬜</td><td>Plutonium</td><td>Pueblo</td></tr>
<tr><td>02b — Guarida Bandas Rojas</td><td>🟩</td><td>🟩 <small>(12 + pin)</small></td><td>⬜</td><td>Plutonium</td><td>201 muros</td></tr>
<tr><td>03 — Ruinas de Thundertree</td><td>🟩</td><td>🟩 <small>(13 + pin)</small></td><td>⬜</td><td>Plutonium</td><td>191 muros</td></tr>
<tr><td>03b — Castillo Cragmaw</td><td>🟩</td><td>🟩 <small>(15 + pin)</small></td><td>⬜</td><td>Plutonium + Local</td><td>392 muros · fondo custom</td></tr>
<tr><td>04 — Cueva del Eco de las Olas</td><td>🟩</td><td>🟩 <small>(20 + pin)</small></td><td>⬜</td><td>Plutonium</td><td>919 muros</td></tr>
</tbody>
</table>`;

const criaturas = `<h2>Criaturas</h2>
<blockquote><strong>🟩 Importadas desde Plutonium</strong> y organizadas (NPCs por capítulo; monstruos en carpeta "Monstruos"). Nótico con retrato/token custom. Tokens de encuentro colocados en Cragmaw Hideout.</blockquote>
<table>
<thead><tr><th>Criatura</th><th>Estado</th><th>Origen</th><th>Carpeta</th></tr></thead>
<tbody>
<tr><td>Gundren Peñabuscador, Sildar Hallinvierno</td><td>🟩</td><td>Plutonium</td><td>Parte 1</td></tr>
<tr><td>Iarno «Bastón de Cristal», Nundro Peñabuscador</td><td>🟩</td><td>Plutonium</td><td>Parte 2</td></tr>
<tr><td>Colmillo Venenoso</td><td>🟩</td><td>Plutonium</td><td>Parte 3</td></tr>
<tr><td>Nezznar la Araña Negra, Mormesk el Espectro</td><td>🟩</td><td>Plutonium</td><td>Parte 4</td></tr>
<tr><td>Monstruos genéricos (Goblin, Lobo, Bugbear, Esqueleto, Nótico, Ogro, Owlbear, Ghoul, Zombi, Araña Gigante, Dragón Verde Joven, Cultista, Grick, Doppelgänger, Gelatina Ocre, Cráneo en Llamas, Espectador, etc.)</td><td>🟩</td><td>Plutonium</td><td>Monstruos</td></tr>
<tr><td>Zombi de Ceniza, Matón de la Banda Roja</td><td>🟩</td><td>Plutonium (LMoP)</td><td>Monstruos</td></tr>
</tbody>
</table>`;

const objetos = `<h2>Objetos y conjuros</h2>
<blockquote><strong>🟩 Importados desde Plutonium</strong> (carpetas Items y Spells).</blockquote>
<table>
<thead><tr><th>Objeto / Conjuro</th><th>Estado</th><th>Origen</th></tr></thead>
<tbody>
<tr><td>Lightbringer, Staff of Defense, Spider Staff, Dragonguard, Ring of Protection, Gauntlets of Ogre Power, Boots of Striding and Springing, Wand of Magic Missiles</td><td>🟩</td><td>Plutonium</td></tr>
<tr><td>Pociones (Healing, Invisibility, Flying, Vitality), Spell Scrolls, Thieves' Tools, Studded Leather</td><td>🟩</td><td>Plutonium</td></tr>
<tr><td>+1 Weapon / +1 Armor (genéricos; renombrar a Talon/Hew si se quiere)</td><td>🟨</td><td>Plutonium</td></tr>
<tr><td>Conjuros (Detect Magic, Mage Armor, Darkness, Misty Step, Lightning Bolt, Augury, Silence, Revivify, Invisibility, Identify)</td><td>🟩</td><td>Plutonium</td></tr>
</tbody>
</table>`;

(async () => {
  for (const [page, content] of [
    ['Mapas', mapas],
    ['Criaturas', criaturas],
    ['Objetos y conjuros', objetos],
  ]) {
    const r = await call('u' + page, 'update-journal-page', {
      journalIdentifier: J,
      pageName: page,
      content,
    });
    const txt = r.result?.content?.[0]?.text ?? JSON.stringify(r);
    const ok = r.result && !r.result.isError;
    console.log((ok ? 'OK ' : 'ERR') + ' | ' + page + ' -> ' + txt);
  }
})();
