// Station-specific upgrades: packed furniture retains these settings.
export const STATION_UPGRADES={
 raincatcher:{name:'Двойной накопитель',desc:'Запас 6 → 12 воды. Насос подаёт воду через сменные фильтры.',cost:{pumpmodule:1,filterunit:2,metal:8}},
 dryrack:{name:'Вентилируемая сушилка',desc:'Одна партия: 4 рыбы и 2 травы → 4 порции еды за 75 секунд. Вентилятор ускоряет сушку; уже загруженная партия завершится в прежнем режиме.',cost:{battery:1,metal:6,cloth:4}},
 recycler:{name:'Сортировочный модуль',desc:'3 металла → 4 детали и 2 провода за 90 секунд. Точная оснастка добавляет ещё одну деталь.',cost:{battery:1,pumpmodule:1,parts:6}},
};
export const collectorCapacity=item=>item.upgrade===1?12:6;
export const dryingBatch=item=>({cost:{fish:item.upgrade===1?4:2,herbs:item.upgrade===1?2:1},output:item.upgrade===1?4:2,duration:item.upgrade===1?75:100});
