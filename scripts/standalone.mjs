import {MODEL_FILES} from '../src/model-assets.js';
import {AUDIO_FILES} from '../src/audio-assets.js';
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'three/addons/libs/fflate.module.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = await readdir(resolve(root, 'dist/assets'));
const jsFiles = files.filter(name => name.endsWith('.js'));
const cssFiles = files.filter(name => name.endsWith('.css'));
if (jsFiles.length !== 1) throw new Error('Standalone build requires exactly one JavaScript bundle.');

async function embedModel(path) {
  const file = await readFile(path);
  if (file.readUInt32LE(0) !== 0x46546c67 || file.readUInt32LE(4) !== 2) throw new Error('Expected GLB 2.0');
  const jsonSize = file.readUInt32LE(12);
  const gltf = JSON.parse(file.subarray(20, 20 + jsonSize).toString('utf8'));
  for (const image of gltf.images || []) {
    if (!image.uri || image.uri.startsWith('data:')) continue;
    const png = await readFile(resolve(dirname(path), image.uri));
    image.uri = `data:image/png;base64,${png.toString('base64')}`;
  }
  const json = Buffer.from(JSON.stringify(gltf));
  const padded = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20); json.copy(padded);
  const binary = file.subarray(20 + jsonSize);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(20 + padded.length + binary.length, 8);
  header.writeUInt32LE(padded.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  return `data:model/gltf-binary;base64,${Buffer.concat([header, padded, binary]).toString('base64')}`;
}

const assets = {};
for (const [name,path] of Object.entries(MODEL_FILES)) assets[name]=await embedModel(resolve(root,`public/assets/models/${path}`));

const audio={};for(const id of AUDIO_FILES)audio[id]=`data:audio/ogg;base64,${(await readFile(resolve(root,`public/assets/audio/${id}.ogg`))).toString('base64')}`;
const audioCredits=await readFile(resolve(root,'public/assets/audio/CREDITS.md'),'utf8');
const audioLicense=await readFile(resolve(root,'public/assets/audio/CC0-LICENSE.txt'),'utf8');
const script = (await readFile(resolve(root, 'dist/assets', jsFiles[0]), 'utf8')).replace(/<\/script/gi, '<\\/script');
const css = (await Promise.all(cssFiles.map(name => readFile(resolve(root, 'dist/assets', name), 'utf8')))).join('\n');
const favicon = await readFile(resolve(root, 'public/favicon.svg'), 'utf8');
const enemyLicense=await readFile(resolve(root,'public/assets/ENEMIES-CC0-LICENSE.txt'),'utf8');
const credits = await readFile(resolve(root, 'public/assets/CREDITS.md'), 'utf8');
const license = await readFile(resolve(root, 'public/assets/KENNEY-MIT-LICENSE.txt'), 'utf8');
const kaykitLicense = await readFile(resolve(root, 'public/assets/KAYKIT-LICENSE.txt'), 'utf8');
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"><meta name="theme-color" content="#101b1b"><title>Тихий район</title><link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}"><style>${css}</style></head><body><div id="app"></div><script>globalThis.__quietAssets=${JSON.stringify(assets)};globalThis.__quietAudio=${JSON.stringify(audio)};</script><script type="module">${script}</script><!--\n${credits}\n${enemyLicense}\n${audioCredits}\n${audioLicense}\n${license}\n${kaykitLicense}\n--></body></html>`;
await mkdir(resolve(root, 'releases'), { recursive: true });
await writeFile(resolve(root, 'releases/quiet-district.html'), html);
const version = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version;
const archive = zipSync({ 'Тихий район.html': strToU8(html) }, { level: 6 });
await writeFile(resolve(root, 'releases/quiet-district-one-file.zip'), archive);
await writeFile(resolve(root, `releases/quiet-district-v${version}-one-file.zip`), archive);
console.log(`Single-file game created: releases/quiet-district.html (${Buffer.byteLength(html)} bytes). No server or dependencies required.`);
