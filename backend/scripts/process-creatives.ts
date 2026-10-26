import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";
import { createCreativeStorage } from "../src/modules/creatives/storage.js";
import { localMediaProcessor } from "../src/modules/creatives/processor.js";
import { processOneCreative } from "../src/modules/creatives/process.js";

if(process.env.CREATIVE_WORKER_ENABLED!=="true")
  throw new Error("Dedicated creative processing worker is not enabled");
loadDatabaseConfig();
const db=new PrismaClient();
try{
  await db.$connect();
  const result=await processOneCreative(db,createCreativeStorage(),localMediaProcessor);
  process.stdout.write(JSON.stringify(result??{status:"empty"})+"\n");
}finally{await db.$disconnect();}
