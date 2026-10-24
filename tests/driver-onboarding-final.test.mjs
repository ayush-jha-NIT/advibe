import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {
 driverSeed,driverCompletedSteps,sanitizedDriverDraft,screenLabels,screenOptions,
 unlockDriverStep,validateDriverStep,validateDriverSubmission,validateDriverThrough
} from "../src/features/driver/onboarding-model.ts";

function complete(){
 return {...driverSeed,adultConfirmed:true,checklist:{licence:true,registration:true,insurance:true},
  screenChoice:"auto_rear",installationReviewed:true,powerSafetyConfirmed:true,payoutFrequency:"weekly",
  simulatedPayoutReady:true,termsAccepted:true,demoConsent:true,highestUnlocked:5};
}
test("each category exposes only compatible sample placements",()=>{
 assert.deepEqual([...screenOptions.bike],["bike_rear"]);
 assert.deepEqual([...screenOptions.auto],["auto_rear","auto_side"]);
 assert.deepEqual([...screenOptions.car],["car_rear","car_interior"]);
 assert.equal(screenLabels.auto_rear,"Auto rear display");
});
test("screen placement requires compatible vehicle and both simulation acknowledgements",()=>{
 const d=complete();
 assert.doesNotThrow(()=>validateDriverStep(4,d));
 assert.throws(()=>validateDriverStep(4,{...d,vehicleType:"bike"}),/compatible/);
 assert.throws(()=>validateDriverStep(4,{...d,installationReviewed:false}),/installation/);
 assert.throws(()=>validateDriverStep(4,{...d,powerSafetyConfirmed:false}),/power-safety/);
});
test("payout step avoids real account details and requires explicit consent",()=>{
 const d=complete();
 assert.doesNotThrow(()=>validateDriverStep(5,d));
 assert.throws(()=>validateDriverStep(5,{...d,simulatedPayoutReady:false}),/confirmations/);
 assert.throws(()=>validateDriverStep(5,{...d,termsAccepted:false}),/confirmations/);
 assert.throws(()=>validateDriverStep(5,{...d,demoConsent:false}),/confirmations/);
 assert.throws(()=>validateDriverStep(5,{...d,payoutFrequency:"daily"}),/frequency/);
 assert.doesNotThrow(()=>validateDriverThrough(5,d));
});
test("sequential progression unlocks review and counts all five steps",()=>{
 const d=complete();
 assert.equal(unlockDriverStep(d,4).highestUnlocked,5);
 assert.equal(unlockDriverStep(d,5).highestUnlocked,6);
 assert.equal(driverCompletedSteps(d),5);
 assert.equal(driverCompletedSteps({...d,installationReviewed:false}),3);
 assert.throws(()=>validateDriverSubmission({...d,adultConfirmed:false},false),/age/);
 assert.doesNotThrow(()=>validateDriverSubmission(d,false));
 assert.throws(()=>validateDriverSubmission(d,true),/already been submitted/);
});
test("older Part 13 saved drafts are migrated without inventing agreements",()=>{
 const legacy={...driverSeed,adultConfirmed:true};
 delete legacy.screenChoice;delete legacy.payoutFrequency;delete legacy.termsAccepted;
 const restored=sanitizedDriverDraft(legacy);
 assert.equal(restored.screenChoice,"auto_rear");
 assert.equal(restored.payoutFrequency,"weekly");
 assert.equal(restored.termsAccepted,false);
 assert.equal(restored.highestUnlocked,1);
});
test("only non-sensitive demo fields persist; seeded approvals stay independent",()=>{
 const d=sanitizedDriverDraft({...complete(),iban:"DEMO-DO-NOT-SAVE",accountNumber:"00000",ifsc:"FAKE",documentImage:"bytes",devicePairingToken:"secret"});
 for(const key of ["iban","accountNumber","ifsc","documentImage","devicePairingToken"])assert.equal(Object.hasOwn(d,key),false);
 assert.equal(d.screenChoice,"auto_rear");
 assert.equal(d.termsAccepted,true);
 const db=createDemoSeed();
 assert.equal(db.driverApplications.find(a=>a.id==="app-1")?.status,"approved");
 assert.equal(db.vehicles.find(v=>v.id==="veh-1")?.verification,"approved");
});
