import test from "node:test";
import assert from "node:assert/strict";
import {
 driverSeed,documentKinds,driverCompletedSteps,unlockDriverStep,validateDriverStep,
 validateDriverThrough,sanitizedDriverDraft
} from "../src/features/driver/onboarding-model.ts";

function stepOne(){return {...driverSeed,adultConfirmed:true};}
function stepTwo(){return {...stepOne(),vehicleType:"bike",vehicleModel:"Example Commuter",modelYear:2024,ownership:"self"};}
function allSteps(){return {...stepTwo(),checklist:{licence:true,registration:true,insurance:true}};}

test("step one requires a sample alias, city and adult checkbox",()=>{
 assert.throws(()=>validateDriverStep(1,driverSeed),/age/);
 assert.doesNotThrow(()=>validateDriverStep(1,stepOne()));
 assert.throws(()=>validateDriverStep(1,{...stepOne(),displayAlias:"x"}),/display name/);
 assert.throws(()=>validateDriverStep(1,{...stepOne(),city:"X"}),/city/);
 assert.throws(()=>validateDriverStep(1,{...stepOne(),experience:"infinite"}),/experience/);
});
test("step two validates vehicle category, model, model year, ownership",()=>{
 assert.doesNotThrow(()=>validateDriverStep(2,stepTwo(),2026));
 assert.throws(()=>validateDriverStep(2,{...stepTwo(),vehicleType:"truck"}),/vehicle type/);
 assert.throws(()=>validateDriverStep(2,{...stepTwo(),vehicleModel:"T"}),/vehicle model/);
 assert.throws(()=>validateDriverStep(2,{...stepTwo(),modelYear:2030},2026),/vehicle year/);
 assert.throws(()=>validateDriverStep(2,{...stepTwo(),ownership:"unknown"}),/ownership/);
});
test("step three requires only sample readiness markers, not uploads",()=>{
 assert.deepEqual([...documentKinds],["licence","registration","insurance"]);
 assert.throws(()=>validateDriverStep(3,stepTwo()),/three sample/);
 assert.doesNotThrow(()=>validateDriverStep(3,allSteps()));
});
test("completion unlocks only available steps and validates all earlier fields",()=>{
 const one=unlockDriverStep(stepOne(),1);
 assert.equal(one.highestUnlocked,2);
 const two=unlockDriverStep({...stepTwo(),highestUnlocked:2},2);
 assert.equal(two.highestUnlocked,3);
 const three=unlockDriverStep({...allSteps(),highestUnlocked:3},3);
 assert.equal(three.highestUnlocked,4);
 assert.equal(driverCompletedSteps(three),3);
 assert.equal(driverCompletedSteps(driverSeed),0);
 assert.throws(()=>validateDriverThrough(3,{...allSteps(),adultConfirmed:false}),/age/);
});
test("sanitizer allowlists only non-sensitive demo fields",()=>{
 const injected={...allSteps(),fullLicenceNumber:"not for storage",bankAccount:"not for storage",passportImage:"image bytes"};
 const sanitized=sanitizedDriverDraft(injected);
 assert.equal("bankAccount" in sanitized,false);
 assert.equal("fullLicenceNumber" in sanitized,false);
 assert.equal("passportImage" in sanitized,false);
 assert.equal(sanitized.displayAlias,"Demo Driver");
 assert.equal(Object.keys(sanitized.checklist).length,3);
 assert.equal(sanitizedDriverDraft({...allSteps(),vehicleModel:"X".repeat(200)}).vehicleModel.length,70);
});
