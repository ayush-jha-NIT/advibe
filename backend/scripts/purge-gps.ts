import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";
import { purgeExpiredGps } from "../src/modules/telemetry/retention.js";
if(process.env.GPS_RETENTION_SWEEPER_ENABLED!=="true")
 throw new Error("Enable GPS_RETENTION_SWEEPER_ENABLED=true on a controlled scheduler");
loadDatabaseConfig();
const db=new PrismaClient();
try {
 await db.$connect();
 const result=await purgeExpiredGps(db);
 process.stdout.write(JSON.stringify(result)+"\n");
}finally{await db.$disconnect();}
