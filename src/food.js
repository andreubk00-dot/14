// One preparation effect, measured in active game time (menus and offline time pause it).
export const SUPPLY_FIELDS = {medkit:'medkits',meal:'meals',tea:'teas',fishmeal:'fishmeals',stew:'stews'};
export const FOOD_EFFECTS = {
 fishmeal:{name:'Сытость',duration:480,sprintCost:.7,recovery:1,desc:'Бег расходует на 30% меньше выносливости'},
 stew:{name:'Бодрость',duration:480,sprintCost:1,recovery:1.4,desc:'Выносливость вне бега восстанавливается на 40% быстрее'},
};
export function activeFood(state) {
 const effect=state.foodEffect,spec=effect&&Object.hasOwn(FOOD_EFFECTS,effect.id)&&FOOD_EFFECTS[effect.id];
 return spec&&Number.isFinite(effect.until)&&effect.until>state.elapsed?{...spec,id:effect.id,remaining:effect.until-state.elapsed}:null;
}
export function foodTime(seconds) {
 const n=Math.max(0,Math.ceil(seconds));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;
}
