import type {Location,Screen} from "../../types/domain";
export type ScreenFilters={city:string;zone:string;query:string};
export function filterTargetScreens(screens:readonly Screen[],locations:readonly Location[],filters:ScreenFilters):Screen[]{
 const locationsById=new Map(locations.map(loc=>[loc.id,loc]));
 const search=filters.query.trim().toLocaleLowerCase();
 return screens.filter(screen=>{
  const loc=locationsById.get(screen.locationId);
  if(!loc)return false;
  return (filters.city==="All cities"||loc.city===filters.city)&&
   (filters.zone==="All zones"||loc.zone===filters.zone)&&
   (!search||[loc.city,loc.zone,loc.name,screen.id].some(x=>x.toLocaleLowerCase().includes(search)));
 });
}
export function staleScreenIds(selected:readonly string[],eligible:readonly Screen[]):string[]{
 const ids=new Set(eligible.map(s=>s.id));
 return [...new Set(selected)].filter(id=>!ids.has(id));
}
export function addUniqueScreens(current:readonly string[],ids:readonly string[]):string[]{
 return [...new Set([...current,...ids])];
}
