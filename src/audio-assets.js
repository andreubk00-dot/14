export const AUDIO_FILES=[
 ...['wood','concrete','grass'].flatMap(kind=>[0,1,2].map(i=>`footstep_${kind}_${String(i).padStart(3,'0')}`)),
 ...['mining','metal_medium','wood_medium'].flatMap(kind=>[0,1].map(i=>`impact_${kind}_${String(i).padStart(3,'0')}`)),
 'impact_wood_heavy_000','impact_wood_heavy_001','impact_mining_003','impact_mining_004',
 'chop','knife_slice','knife_slice_2','metal_click','handle_small_leather','door_open_1','door_close_1',
 'blaster','blaster_repeater','enemy_hurt','enemy_attack','enemy_destroy','weapon_change','house-forest',
];
