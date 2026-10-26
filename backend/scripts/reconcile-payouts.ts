import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";
import { configuredPayoutGateway,financePolicy } from "../src/modules/earnings/provider.js";
import { reconcilePayouts } from "../src/modules/earnings/worker.js";
if(process.env.B18_PAYOUT_WORKER_ENABLED!=="true")throw new Error("Payout worker is not enabled");
financePolicy(process.env,process.env.NODE_ENV==="production");
loadDatabaseConfig();
const gateway=configuredPayoutGateway();
const db=new PrismaClient();
try{await db.$connect();console.log(JSON.stringify(await reconcilePayouts(db,gateway)));}
finally{await db.$disconnect();}
