// A record of the player's choices, not an ordered list of tasks or undiscovered places.
export function chronicle(state){
 const entries=[],owned=new Set(state.owned),placed=new Set(state.placed.map(p=>p.id));
 const add=(id,title,text)=>entries.push({id,title,text});
 for(const [id,title,text]of [['salvagejig','Оснастка из ремонтного комплекса','Привезённая оснастка установлена дома. Технику можно разбирать по очереди.'],['packingdesk','Готовиться проще','Найденный стол установлен: он помогает пополнять рюкзак со склада по своему списку.'],['estatepanel','Озеро на стене','Мозаика из дальнего дома теперь украшает убежище.']])if(placed.has(id))add(id,title,text);
 if(owned.has('generator'))add('generator','Свет в убежище','Генератор снова работает. У мастерской появился тёплый свет.');
 if(owned.has('bridge'))add('bridge','Прямой путь в депо','Мост через дренажный канал восстановлен. К техническим запасам можно пройти короче.');
 if(owned.has('pump'))add('pump','Своя вода','Насос у башни запущен. Вода доступна у башни, посадки растут быстрее.');
 if(owned.has('solar'))add('solar','Энергия солнца','Солнечные панели ускоряют домашнее производство.');
 if(owned.has('radio'))add('radio','Голос в эфире','Радиостанция работает. Теперь можно договориться с Ладой о помощи в убежище.');
 if(placed.has('bed'))add('bed','Место для отдыха','Дома установлена удобная кровать: здесь можно полностью восстановить здоровье.');
 if(placed.has('cropbed')||placed.has('garden')||placed.has('seedbed'))add('garden','Живые посадки','У убежища растут свои растения. Урожай помогает готовиться к новым вылазкам.');
 if(placed.has('dryrack'))add('dryrack','Запас еды','Установлена сушилка. Улов можно сохранить для дальней дороги.');
 if(owned.has('helper'))add('helper','Дома ждут','Лада помогает собирать продукцию, пока ты исследуешь район.');
 if(owned.has('trailpack')||owned.has('bag2')||owned.has('bag'))add('bag','Больше места для находок',`Изготовлен рюкзак вместимостью ${owned.has('trailpack')?80:owned.has('bag2')?60:40}.`);
 if(state.boat.repaired)add('boat','Водный путь','Лодка восстановлена. До островов можно добраться по воде.');
 if(state.camp.ready)add('camp','Тихая стоянка','На Камышовой стоянке можно оставить запасы, приготовить еду и отдохнуть.');
 for(const [id,title,text]of [
  ['camp-crossing','Пешком к стоянке','Между жилой улицей и стоянкой восстановлены мостки.'],
  ['garden-crossing','Переход к садам','От садов до жилой улицы снова можно пройти пешком.'],
  ['drain-works','Сухой ремонтный зал','Ремонтный зал осушен. Открыты техника и сквозной выход за мастерскую.'],
 ])if(state.restoredRoutes.includes(id))add(id,title,text);
 return entries;
}
