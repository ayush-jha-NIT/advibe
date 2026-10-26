import { PrismaClient } from "@prisma/client";
import { loadDatabaseConfig } from "../src/db/config.js";
import { expireReservationHolds } from "../src/modules/reservations/expiry.js";
if(process.env.RESERVATION_SWEEPER_ENABLED!=="true")
 throw new Error("Set RESERVATION_SWEEPER_ENABLED=true only on controlled scheduler");
loadDatabaseConfig();
const db=new PrismaClient();
try{
 await db.$connect();
 const expired=await expireReservationHolds(db);
 process.stdout.write(JSON.stringify({expired})+"\n");
}finally{await db.$disconnect();}
