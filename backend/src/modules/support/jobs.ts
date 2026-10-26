import {randomUUID} from "node:crypto";
import {Prisma,type PrismaClient,type Prisma as PrismaTypes} from "@prisma/client";
import {serializableTransaction} from "../../db/transaction.js";
type Tx=PrismaTypes.TransactionClient;
export async function enqueueSupportNotice(tx:Tx,source:string,recipients:string[],
 ticketId:string,kind:"SUPPORT"|"MAINTENANCE",title:string,body:string){
 const ids=[...new Set(recipients)];
 if(!ids.length)return;
 await tx.durableJob.createMany({data:ids.map(recipientUserId=>({
  dedupeKey:source+":"+recipientUserId,recipientUserId,ticketId,kind,title,body,
 })),skipDuplicates:true});
}
export type JobLease={id:string;leaseToken:string};
export async function leaseJobs(db:PrismaClient,limit=10):Promise<JobLease[]>{
 const n=Math.max(1,Math.min(50,limit));
 return serializableTransaction(db,async tx=>{
  // SKIP LOCKED ensures different worker instances cannot claim the same job.
  const rows=await tx.$queryRaw<Array<{id:string}>>`
   SELECT "id" FROM "DurableJob"
   WHERE (("state"='PENDING' AND "availableAt"<=NOW())
    OR ("state"='LEASED' AND "leaseUntil"<NOW()))
   AND "attempts"<5
   ORDER BY "createdAt","id" FOR UPDATE SKIP LOCKED LIMIT ${n}`;
  const leases:JobLease[]=[];
  for(const row of rows){
   const leaseToken=randomUUID();
   await tx.durableJob.update({where:{id:row.id},data:{
    state:"LEASED",leaseToken,leaseUntil:new Date(Date.now()+60000),
    attempts:{increment:1},lastError:null}});
   leases.push({id:row.id,leaseToken});
  }
  return leases;
 });
}
export async function processLeasedJob(db:PrismaClient,lease:JobLease,
 testHook?:()=>Promise<void>):Promise<"completed"|"failed"|"stale">{
 try{
  if(testHook)await testHook();
  const done=await serializableTransaction(db,async tx=>{
   const job=await tx.durableJob.findUnique({where:{id:lease.id}});
   if(!job||job.state!=="LEASED"||job.leaseToken!==lease.leaseToken||
     !job.leaseUntil||job.leaseUntil<=new Date())return false;
   const user=await tx.user.findUnique({where:{id:job.recipientUserId},
    select:{status:true}});
   if(user?.status==="ACTIVE")await tx.userNotification.createMany({data:[{
    dedupeKey:job.dedupeKey,recipientUserId:job.recipientUserId,
    ticketId:job.ticketId,kind:job.kind,title:job.title,body:job.body,
   }],skipDuplicates:true});
   await tx.durableJob.update({where:{id:job.id},data:{
    state:"COMPLETED",leaseToken:null,leaseUntil:null,completedAt:new Date()}});
   return true;
  });
  return done?"completed":"stale";
 }catch(error){
  const detail=error instanceof Error?error.message.slice(0,150):"Notification job failed";
  await serializableTransaction(db,async tx=>{
   const job=await tx.durableJob.findUnique({where:{id:lease.id}});
   if(!job||job.state!=="LEASED"||job.leaseToken!==lease.leaseToken)return;
   const dead=job.attempts>=5;
   await tx.durableJob.update({where:{id:job.id},data:{
    state:dead?"DEAD":"PENDING",leaseToken:null,leaseUntil:null,
    availableAt:new Date(Date.now()+Math.min(3600000,1000*2**job.attempts)),
    lastError:detail,
   }});
  });
  return "failed";
 }
}
export async function runNotificationJobs(db:PrismaClient,limit=10,
 testHook?:()=>Promise<void>){
 const leases=await leaseJobs(db,limit);
 const results:Array<"completed"|"failed"|"stale">=[];
 for(const lease of leases)results.push(await processLeasedJob(db,lease,testHook));
 return {leased:leases.length,completed:results.filter(x=>x==="completed").length,
  failed:results.filter(x=>x==="failed").length,stale:results.filter(x=>x==="stale").length};
}
