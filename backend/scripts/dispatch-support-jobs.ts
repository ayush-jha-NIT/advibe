import {PrismaClient} from "@prisma/client";
import {loadDatabaseConfig} from "../src/db/config.js";
import {runNotificationJobs} from "../src/modules/support/jobs.js";
/** Schedule externally; never run an unbounded loop in Express. */
if(process.env.B20_JOBS_ENABLED!=="true")
 throw new Error("B20 durable job dispatch disabled; set B20_JOBS_ENABLED=true");
loadDatabaseConfig();
const db=new PrismaClient();
try{await db.$connect();const result=await runNotificationJobs(db,25);
 console.log(JSON.stringify(result));
 if(result.failed>0)process.exitCode=1;
}finally{await db.$disconnect();}
