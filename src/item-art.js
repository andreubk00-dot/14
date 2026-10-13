// Original painted vector miniatures. Flat planes and highlights match the low-poly world.
const steel = '#a9c6d0', dark = '#405f6d', wood = '#ac7847', gold = '#edbe63', green = '#73aa64';
const rect = (x,y,w,h,c,rx=2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${c}"/>`;
const path = (d,c) => `<path d="${d}" fill="${c}"/>`;
const circle = (x,y,r,c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const line = (x,y,a,b,c,width=3) => `<path d="M${x} ${y}L${a} ${b}" fill="none" stroke="${c}" stroke-width="${width}" stroke-linecap="round"/>`;
const herb = (x=32,y=53) => line(x,y,x,y-28,'#548148',3)+path(`M${x} ${y-13}Q${x-22} ${y-11} ${x-18} ${y-29}Q${x-1} ${y-28} ${x} ${y-13}`,green)+path(`M${x} ${y-23}Q${x-1} ${y-41} ${x+18} ${y-43}Q${x+23} ${y-25} ${x} ${y-23}`,'#a2ca74');
const pack = upgraded => path('M23 15V9Q32 2 41 9V15',dark)+rect(14,13,36,43,upgraded?'#506f93':'#a7844e',7)+rect(18,17,28,14,upgraded?'#789cbd':'#c6aa72',3)+rect(21,35,22,17,dark,3)+line(24,41,40,41,gold,2)+rect(9,31,6,18,steel)+rect(49,31,6,18,steel)+(upgraded?line(21,20,21,30,gold)+line(43,20,43,30,gold):'');
const fishingRod = upgraded => line(15,55,40,8,wood,5)+line(40,8,55,14,steel,2)+line(55,14,55,42,'#d2dfd7',1.5)+path('M55 40V47Q48 55 43 45',gold)+circle(24,39,upgraded?8:5,upgraded?steel:dark)+circle(24,39,2,gold);
const fish = (color,spots=false) => path('M16 32L5 19V45Z',color)+path('M13 32Q33 7 57 32Q33 57 13 32',color)+path('M25 17L34 9L41 20',dark)+path('M28 41L37 52L43 39',dark)+circle(47,28,3,'#182c32')+line(22,29,39,22,'#d8e8d8',2)+(spots?circle(29,31,2,gold)+circle(36,33,2,gold)+circle(38,26,2,gold):'');
const shell = path('M12 40Q0 8 32 7Q64 8 52 40L40 56H24Z','#c6a4b8')+line(18,18,28,44,'#f0d9cd',3)+line(32,12,32,44,'#f0d9cd',3)+line(46,18,36,44,'#f0d9cd',3)+circle(32,44,9,'#f0e6d4')+circle(29,41,3,'#ffffff');
const station = c => rect(8,23,48,33,c,4)+rect(14,10,36,15,dark)+rect(19,15,26,5,steel)+rect(14,32,20,17,dark)+circle(24,40,5,gold)+rect(39,31,11,5,steel)+rect(39,42,11,5,steel)+rect(13,56,7,4,dark)+rect(44,56,7,4,dark);
const bed = rect(8,31,48,20,wood)+rect(10,23,44,16,'#7daa8a',4)+rect(12,20,13,16,'#eae0c2',3)+path('M29 24H53V45H29Z','#9fbd91')+rect(8,49,5,9,dark)+rect(51,49,5,9,dark);
const art = {
 raincatcher: rect(15,24,34,32,'#83a89c',6)+rect(11,20,42,9,steel)+path('M11 20L22 8H42L53 20Z',gold)+circle(32,37,7,'#486f69')+rect(40,46,14,6,gold),
 dryrack: rect(8,10,5,48,wood)+rect(51,10,5,48,wood)+rect(8,10,48,5,gold)+rect(12,31,40,4,steel)+rect(12,49,40,4,steel)+[23,40].map(x=>path(`M${x} 17Q${x+13} 27 ${x} 38Q${x-13} 27 ${x} 17`,'#a8beb0')).join(''),
 gearrack: rect(6,8,5,49,dark)+rect(53,8,5,49,dark)+[10,32,55].map(y=>rect(6,y,52,4,wood)).join('')+rect(15,16,15,13,'#b9c3a4')+rect(35,39,15,13,'#89aba8'),
 scoutcoat: path('M18 10L28 6H36L46 10L57 31L48 37L44 25V58H20V25L16 37L7 31Z','#8fa386')+rect(29,9,6,45,gold)+rect(21,31,8,12,'#556d5c')+rect(36,31,8,12,'#556d5c'),
 hauler: rect(11,5,5,53,steel)+rect(48,5,5,53,steel)+rect(11,12,42,5,dark)+rect(11,48,42,5,dark)+rect(17,20,30,24,wood)+line(19,20,44,44,gold)+line(44,20,19,44,gold),
 medicine: rect(10,8,26,45,'#d7d5bf',4)+rect(14,12,18,36,'#efead7')+rect(18,16,10,13,'#bc7e71')+rect(18,34,10,10,'#94b7ad')+rect(37,27,18,28,'#89a69d',4)+rect(41,21,10,8,steel)+line(41,41,51,41,'#eee7ce',3)+line(46,36,46,46,'#eee7ce',3),
 dressing: rect(9,18,46,35,'#cd9d80',5)+rect(15,10,20,10,dark)+rect(13,24,38,24,'#ebdcca')+rect(27,28,10,18,'#86aaa2')+rect(23,32,18,10,'#86aaa2')+rect(44,39,13,16,'#b5c1ab')+line(47,43,54,43,dark,2),
 lure: path('M32 5Q53 25 32 43Q13 25 32 5',gold)+circle(32,24,7,steel)+line(32,43,32,52,dark,3)+path('M32 50Q48 62 48 44L44 49',steel),
 fishmeal: rect(6,18,52,39,'#927452',5)+rect(11,24,42,27,'#d7c2a0')+path('M16 38Q30 17 48 38Q30 51 16 38','#85b2b0')+circle(43,35,2,dark)+circle(17,28,4,'#dca06a')+circle(45,46,4,green),
 fishtrophy: rect(5,12,54,40,wood,5)+rect(9,16,46,32,'#ccb08b')+path('M17 33L10 25V40Z',steel)+path('M16 33Q36 14 54 33Q36 48 16 33','#87b7b7')+circle(45,30,2,dark)+circle(29,32,2,gold)+circle(37,34,2,gold),
  wrench: path('M14 56L7 48L35 20Q28 7 42 6L38 15L44 21L53 16Q55 29 43 29Z',steel)+line(15,47,35,27,gold,2),
  vegetables:path('M17 22L30 53L45 20Z','#d99a61')+herb(31,28)+line(27,34,35,30,'#ad6b47',2),
  flowers:line(20,56,28,22,'#89a86d',4)+line(42,56,38,30,'#89a86d',4)+circle(22,18,8,'#d69eae')+circle(34,18,8,'#d69eae')+circle(28,25,8,'#e7b9c4')+circle(28,21,4,gold)+circle(42,29,8,'#c6a0c7')+circle(42,29,3,gold),
  cropbed:rect(6,38,52,19,wood)+rect(10,35,44,8,'#514a36')+herb(20,44)+path('M34 30L42 52L50 30Z','#d99a61')+circle(44,21,7,'#d69eae')+line(44,29,44,36,'#89a86d',3),
  stew:path('M9 31H55Q51 58 32 58Q13 58 9 31Z',steel)+path('M14 28H50L47 36H17Z','#caa266')+circle(24,31,4,'#d99a61')+circle(39,31,4,'#98b07a')+line(28,9,23,19,gold,2),
  bouquet:rect(22,36,20,23,wood,4)+line(31,37,24,17,'#89a86d',3)+line(34,37,43,23,'#89a86d',3)+circle(23,16,9,'#d8a1b3')+circle(43,22,8,'#c6a0c7')+circle(34,11,7,'#e7c7a1'),
  foundlamp:rect(28,24,6,29,steel)+path('M15 12H47L53 30H9Z','#d1b57c')+rect(18,54,28,5,steel)+path('M22 30H42L39 35H25Z',gold),
  armchair:rect(13,11,38,31,'#9b7c6a',7)+rect(15,35,34,17,'#c3a084',4)+rect(6,28,11,25,wood,4)+rect(47,28,11,25,wood,4)+rect(12,51,5,9,steel)+rect(47,51,5,9,steel),
  wallclock:circle(32,31,25,wood)+circle(32,31,21,'#e2d6b3')+[0,1,2,3].map(i=>{const a=i*Math.PI/2;return line(32+Math.sin(a)*16,31+Math.cos(a)*16,32+Math.sin(a)*19,31+Math.cos(a)*19,steel,2)}).join('')+line(32,31,32,15,steel,3)+line(32,31,44,37,steel,3),
  recordplayer:rect(7,25,50,29,wood,4)+path('M7 25L13 10H53L57 25Z','#b69c6d')+circle(28,32,15,dark)+circle(28,32,5,gold)+line(47,22,42,40,steel,3)+rect(10,50,44,7,steel),
  tooling: rect(7,36,50,9,wood)+rect(13,45,5,13,steel)+rect(46,45,5,13,steel)+rect(25,22,22,14,steel)+line(36,11,36,24,gold,4)+circle(19,29,6,gold),
  receiver: rect(10,21,44,35,wood)+rect(15,27,34,7,steel)+rect(15,40,34,7,gold)+path('M25 6H39V16H48L32 29L16 16H25Z','#9eb9ba'),
  pipe: path('M13 51L39 12L47 17L22 57Z',steel)+path('M16 48L21 51L42 18L39 16Z','#dce8e3')+rect(9,47,14,9,dark),
  axe: line(14,55,43,11,wood,7)+path('M28 13L45 9L56 19L50 33L33 28Z',steel)+path('M48 13L56 19L50 33L45 27Z','#dce9e5'),
  pick: line(17,54,38,17,wood,7)+path('M11 14Q39 2 57 28L47 24Q30 11 12 21Z',steel),
  cutter: line(15,55,36,27,'#bf654c',9)+line(49,55,29,27,'#bf654c',9)+path('M26 28L15 9L25 7L33 22L41 7L51 9L40 28Z',steel)+circle(33,28,5,dark),
  rod: fishingRod(false), rod2: fishingRod(true),
  spear: line(12,57,43,16,wood,5)+path('M36 18L51 4L55 7L48 27L40 24Z',steel)+path('M51 4L48 24L43 19Z','#dfebe6')+line(30,30,38,35,'#dad2b5',3),
  pistol: path('M8 17H53V31H28L22 54H10L16 31H8Z',dark)+rect(11,17,39,9,steel)+rect(13,36,9,15,wood)+rect(42,20,10,5,gold)+path('M28 33H39V42H26Z',dark),
  carbine: path('M5 24H16V16H55V31H36L29 46H20L23 31H16V47H5Z',dark)+rect(19,18,32,9,steel)+rect(25,8,18,7,dark)+rect(51,22,10,6,gold)+rect(6,27,8,16,wood)+rect(38,29,8,12,wood),
  vest: path('M17 10H26L32 18L38 10H47L55 24L47 30V56H17V30L9 24Z','#a58d63')+rect(20,30,10,15,dark)+rect(36,30,10,15,dark)+line(32,20,32,55,gold,2),
  armor: path('M16 10H26L32 18L38 10H48L58 24L48 31V56H16V31L6 24Z',dark)+rect(20,23,24,13,steel)+rect(20,39,24,13,'#7e9ca8')+line(32,23,32,51,gold,2),
  bag: pack(false), bag2: pack(true),
  boots: path('M15 8H34V34L54 44V55H10V28H15Z',wood)+path('M11 46H53V56H10Z',dark)+rect(18,12,13,18,'#d2b581')+line(21,17,28,17,dark,2)+line(21,23,28,23,dark,2),
  lantern: path('M23 16V10Q32 1 41 10V16',steel)+path('M18 19H46L52 53H12Z',dark)+path('M23 24H41L46 48H18Z','#edcd85')+path('M30 28Q21 41 31 44Q42 45 34 29Q32 37 30 28','#ff9553')+rect(12,53,40,5,steel),
  medkit: rect(23,8,18,10,steel)+rect(8,16,48,39,'#b95f52',6)+rect(10,18,44,9,'#d8876b',4)+rect(27,26,10,21,'#f4e8ce')+rect(21,32,22,9,'#f4e8ce'),
  meal: path('M10 31H54Q50 58 32 58Q14 58 10 31',dark)+path('M13 34H51Q44 54 32 54Q20 54 13 34','#cb9363')+path('M10 31Q32 23 54 31Q32 40 10 31','#e2c583')+circle(26,30,3,green)+circle(38,31,3,'#dd7956')+line(23,21,26,10,'#d7e1d3',2)+line(38,21,41,10,'#d7e1d3',2),
  tea: path('M15 25H44V48Q31 62 15 48Z','#cbd6c2')+path('M44 29H54V44H44',gold)+path('M17 26Q30 19 42 26Q30 33 17 26','#a47948')+line(26,18,28,7,'#d7e1d3',2)+line(37,18,39,7,'#d7e1d3',2),
  ammo: [14,29,44].map(x=>path(`M${x} 20L${x+4} 8L${x+8} 20Z`,gold)+rect(x,20,8,34,steel)+rect(x,45,8,9,dark)).join(''),
  wood: path('M10 24L45 12L56 25L21 38Z','#cfaa73')+path('M10 24V40L22 54V38Z',wood)+path('M22 38L56 25V41L22 54Z','#85603d')+line(26,41,51,33,'#c3945e',2),
  metal: path('M8 23L39 12L55 23L24 35Z',steel)+path('M8 23V40L24 51V35Z',dark)+path('M24 35L55 23V40L24 51Z','#7c9aa5')+line(28,38,49,30,'#e0ece7',2),
  wire: circle(32,32,21,'#c98c52')+circle(32,32,13,dark)+circle(32,32,7,'#1c333b')+line(12,34,8,53,gold,4)+rect(4,51,9,8,steel),
  parts: path('M26 8H39L42 17L51 21L58 33L51 44L41 48L37 58H25L22 48L12 44L6 32L13 21L23 17Z',steel)+circle(32,33,14,dark)+circle(32,33,7,gold),
  cloth: path('M13 15L47 10L56 45L19 56Z','#a38fc1')+path('M13 15L20 31L49 23L47 10Z','#c8b9d5')+line(23,38,48,31,'#80769e',2)+line(25,46,50,39,'#80769e',2),
  herbs: herb(), seeds: rect(14,13,36,43,'#d4b376',4)+rect(14,13,36,8,wood)+rect(19,26,26,25,'#ede0bd')+herb(32,49),
  fish: fish('#89b8b6'), 'fish-perch': fish('#c4b770'), 'fish-crucian': fish('#bdccd1'), 'fish-trout': fish('#85a7bd',true), pearl: shell, shell,
  water: path('M32 6Q8 30 17 46Q32 65 47 46Q56 30 32 6','#77b7ce')+path('M23 29Q14 43 30 49L25 43Q21 38 27 27','#d2ecdf'),
  generator: station('#7c8b60')+path('M28 28L21 40H29L25 49L36 35H29Z',gold),
  recycler: station('#658478')+line(16,37,31,37,green,3)+path('M31 32L38 37L31 42',green)+line(48,47,39,47,gold,3),
  radio: rect(8,23,48,31,dark,4)+line(20,23,44,7,steel,3)+circle(23,38,10,'#b4b28a')+circle(23,38,5,dark)+rect(39,30,11,7,steel)+rect(39,41,11,5,gold),
  solar: path('M13 12L57 22L48 49L4 39Z',dark)+[19,31,43].map(x=>line(x,16,x-8,41,steel,1.5)).join('')+line(9,27,52,37,steel,1.5)+rect(28,45,5,12,steel)+rect(18,56,26,4,dark),
  purifier: rect(9,14,21,40,'#8aa6a3',5)+rect(13,8,13,8,steel)+rect(36,26,18,29,'#86bfd0',4)+line(30,24,47,24,steel,4)+rect(12,30,15,13,dark),
  pump: rect(9,32,24,25,dark)+line(21,32,21,17,steel,7)+line(21,17,47,17,steel,7)+line(47,17,47,29,steel,6)+path('M47 34Q36 49 47 53Q58 49 47 34','#81c5d3'),
  bed,
  chest: rect(8,22,48,32,wood,3)+path('M8 23L15 11H49L56 23Z','#cda56b')+rect(8,29,48,7,dark)+rect(27,27,10,13,gold)+line(18,24,18,52,dark,3)+line(46,24,46,52,dark,3),
  sofa: rect(12,17,40,25,'#799992',5)+rect(13,34,38,17,'#b2c1a2',4)+rect(5,30,10,24,dark,3)+rect(49,30,10,24,dark,3)+rect(14,52,5,7,wood)+rect(45,52,5,7,wood),
  rug: path('M9 15H52L56 51H5Z','#b47163')+path('M17 24H44L47 43H14Z','#d9bd83')+path('M25 27L40 33L28 40L20 33Z',dark)+[10,19,28,37,46].map(x=>line(x,52,x,58,'#d8c48e',2)).join(''),
  planter: path('M15 35H49L43 58H21Z','#b9805d')+herb(32,42),
  garden: rect(6,37,52,21,wood)+rect(9,34,46,9,'#533e30')+herb(22,41)+herb(44,41),
  seedbed: path('M7 28L32 8L57 28V57H7Z','#91b9b4')+path('M13 31H51V51H13Z','#405f63')+line(32,10,32,55,gold,3)+line(9,29,55,29,gold,3)+herb(22,49)+herb(43,49),
  bridge: path('M5 32L50 17L59 28L14 43Z',wood)+line(7,29,51,14,steel,4)+line(16,46,59,31,steel,4)+[12,25,38,51].map(x=>line(x,20,x,39,wood,3)).join(''),
  lamp: line(20,58,20,14,dark,5)+line(20,14,45,14,dark,5)+rect(37,15,17,22,gold,3)+path('M36 15L42 8H51L56 15Z',steel)+rect(13,55,15,5,steel),
  helper: circle(32,20,10,'#d7b59a')+path('M21 16Q32 0 43 16L40 24L36 11H25L24 24Z','#76534c')+path('M15 57V41Q32 24 49 41V57Z','#7fa079')+herb(46,58),
};
export const ART_IDS = Object.keys(art);
export function itemArt(id, size=32) {
  if (!art[id]) return null;
  return `<svg class="item-icon" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="58" rx="23" ry="4" fill="#051913" opacity=".22"/><g stroke="#263b37" stroke-width="1.25" stroke-linejoin="round">${art[id]}</g></svg>`;
}
