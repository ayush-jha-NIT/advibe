import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";
import { createRefundGateway } from "../src/modules/finance/provider.js";
import { reconcileRefunds } from "../src/modules/finance/worker.js";
import { HttpError } from "../src/lib/http-error.js";
// Run as a separately approved trusted scheduler. No cron is deployed by B19.
if(process.env.B19_REFUNDS_WORKER_ENABLED!=="true"||
 process.env.B19_FINANCE_APPROVED!=="true"||
 process.env.B19_REFUNDS_ENABLED!=="true"||
 process.env.B19_REFUND_POLICY_APPROVED!=="true"||
 process.env.CASHFREE_ENV!=="sandbox"&&process.env.CASHFREE_ENV!=="production")
 throw new HttpError(503,"REFUND_WORKER_DISABLED",
  "Refund reconciliation requires approved explicit enablement");
loadDatabaseConfig();
const provider=createRefundGateway();
const db=new PrismaClient();
try{await db.$connect();const result=await reconcileRefunds(db,provider);
 console.log(JSON.stringify(result));}
finally{await db.$disconnect();}
