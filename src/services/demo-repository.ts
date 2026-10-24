import type {Actor,DemoDatabase} from "../types/domain";
import {visibleRecords} from "./demo-selectors";

export interface ReadonlyDemoRepository {
 list<K extends keyof DemoDatabase>(actor:Actor,table:K):Promise<DemoDatabase[K]>;
 get<K extends keyof DemoDatabase>(actor:Actor,table:K,id:string):Promise<DemoDatabase[K][number]|undefined>;
}
export function createReadonlyDemoRepository(getDb:()=>DemoDatabase):ReadonlyDemoRepository{
 return {
  async list(actor,table){return visibleRecords(getDb(),actor,table);},
  async get(actor,table,id){
   const rows=visibleRecords(getDb(),actor,table) as Array<{id:string}>;
   return rows.find(x=>x.id===id) as DemoDatabase[typeof table][number]|undefined;
  },
 };
}
/**
 * Production replacement should call server endpoints with authenticated sessions.
 * This browser demo is not a safe persistence, authorization, or payment backend.
 */
