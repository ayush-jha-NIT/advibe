
import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";
import { reconcileDeliveryPlans } from "../src/modules/delivery/worker.js";
if(process.env.DELIVERY_TICK_ENABLED!=="true")
 throw new Error("Set DELIVERY_TICK_ENABLED=true only on controlled scheduler");
loadDatabaseConfig();
const db=new PrismaClient();
try{
 await db.$connect();
 const changed=await reconcileDeliveryPlans(db);
 process.stdout.write(JSON.stringify({changed})+"\n");
}finally{await db.$disconnect();}
