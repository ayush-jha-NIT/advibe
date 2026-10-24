import type {Actor,DemoDatabase,Notice,Screen,Ticket} from "../../types/domain";
import {ownedDriverScreens} from "./operations-model.ts";
export type MaintenanceCategory="screen_offline"|"screen_damage"|"power"|"mounting"|"other";
export const maintenanceCategories:readonly MaintenanceCategory[]=["screen_offline","screen_damage","power","mounting","other"];
export type DriverIssueDraft={screenId:string;category:MaintenanceCategory;subject:string;description:string};
export type DriverSupportDraft={subject:string;description:string;category:"technical"|"billing"|"other"};
export function assertProvisionedDriver(db:DemoDatabase,actor:Actor):void{
 if(actor.role!=="driver"||!db.accounts.some(a=>a.id===actor.accountId&&a.role==="driver"&&a.active))
  throw Error("Only a provisioned demo driver may use this action.");
}
export function validateDriverIssue(db:DemoDatabase,actor:Actor,input:DriverIssueDraft):DriverIssueDraft{
 assertProvisionedDriver(db,actor);
 if(!ownedDriverScreens(db,actor.accountId).some(s=>s.id===input.screenId))
  throw Error("Choose a screen belonging to your demo vehicle.");
 if(!maintenanceCategories.includes(input.category))throw Error("Choose a valid issue category.");
 const subject=input.subject.trim().replace(/\s+/g," ");
 const description=input.description.trim();
 if(subject.length<5||subject.length>100)throw Error("Issue title must be 5–100 characters.");
 if(description.length<15||description.length>1000)throw Error("Description must contain 15–1000 characters.");
 return {...input,subject,description};
}
export function validateDriverSupport(db:DemoDatabase,actor:Actor,input:DriverSupportDraft):DriverSupportDraft{
 assertProvisionedDriver(db,actor);
 const subject=input.subject.trim().replace(/\s+/g," "),description=input.description.trim();
 if(!["technical","billing","other"].includes(input.category))throw Error("Choose a support category.");
 if(subject.length<5||subject.length>120)throw Error("Subject must be 5–120 characters.");
 if(description.length<15||description.length>1200)throw Error("Description must contain 15–1200 characters.");
 return {...input,subject,description};
}
export function driverTickets(db:DemoDatabase,driverId:string):Ticket[]{
 return db.tickets.filter(t=>t.accountId===driverId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
export function driverNotices(db:DemoDatabase,driverId:string):Notice[]{
 return db.notices.filter(n=>n.recipientId===driverId).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
export function ownedMaintenanceScreen(db:DemoDatabase,driverId:string,screenId:string):Screen|null{
 return ownedDriverScreens(db,driverId).find(s=>s.id===screenId)??null;
}
export function ticketTextMatch(t:Ticket,needle:string):boolean{
 const q=needle.trim().toLowerCase();
 return !q||[t.id,t.subject,t.description??"",t.category??"",t.screenId??""].some(text=>text.toLowerCase().includes(q));
}
