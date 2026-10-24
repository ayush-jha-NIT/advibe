/** Fictional driver onboarding only. Never store official IDs, files, bank accounts or pairing credentials. */
export type DemoVehicleType="bike"|"auto"|"car";
export type DocumentKind="licence"|"registration"|"insurance";
export const documentKinds=["licence","registration","insurance"] as const satisfies readonly DocumentKind[];
export type ScreenChoice="bike_rear"|"auto_rear"|"auto_side"|"car_rear"|"car_interior";
export type PayoutFrequency="weekly"|"monthly";
export const screenOptions:Record<DemoVehicleType,readonly ScreenChoice[]>={
 bike:["bike_rear"],auto:["auto_rear","auto_side"],car:["car_rear","car_interior"]
};
export const screenLabels:Record<ScreenChoice,string>={
 bike_rear:"Bike rear display",auto_rear:"Auto rear display",auto_side:"Auto side display",
 car_rear:"Car rear display",car_interior:"Car interior display"
};
export type DriverDraft={
 displayAlias:string;city:string;experience:"new"|"under_one"|"one_to_three"|"over_three";
 availability:"weekdays"|"weekends"|"flexible";adultConfirmed:boolean;
 vehicleType:DemoVehicleType;vehicleModel:string;modelYear:number;ownership:"self"|"family"|"leased";
 checklist:Record<DocumentKind,boolean>;
 screenChoice:ScreenChoice;installationReviewed:boolean;powerSafetyConfirmed:boolean;
 payoutFrequency:PayoutFrequency;simulatedPayoutReady:boolean;termsAccepted:boolean;demoConsent:boolean;
 highestUnlocked:1|2|3|4|5|6;
};
export const driverSeed:DriverDraft={
 displayAlias:"Demo Driver",city:"Prayagraj",experience:"new",availability:"flexible",adultConfirmed:false,
 vehicleType:"auto",vehicleModel:"Demo Auto",modelYear:2023,ownership:"self",
 checklist:{licence:false,registration:false,insurance:false},
 screenChoice:"auto_rear",installationReviewed:false,powerSafetyConfirmed:false,
 payoutFrequency:"weekly",simulatedPayoutReady:false,termsAccepted:false,demoConsent:false,
 highestUnlocked:1
};
export function validateDriverStep(step:1|2|3|4|5,d:DriverDraft,year=2026):void{
 if(step===1){
  if(d.displayAlias.trim().length<2||d.displayAlias.trim().length>60)throw Error("Enter a sample display name of 2–60 characters.");
  if(d.city.trim().length<2||d.city.trim().length>60)throw Error("Enter a city of 2–60 characters.");
  if(!["new","under_one","one_to_three","over_three"].includes(d.experience))throw Error("Choose driving experience.");
  if(!["weekdays","weekends","flexible"].includes(d.availability))throw Error("Choose sample availability.");
  if(!d.adultConfirmed)throw Error("Confirm the example driver's age is at least 18.");
 }
 if(step===2){
  if(!["bike","auto","car"].includes(d.vehicleType))throw Error("Choose a vehicle type.");
  if(d.vehicleModel.trim().length<2||d.vehicleModel.trim().length>70)throw Error("Enter a sample vehicle model of 2–70 characters.");
  if(!Number.isInteger(d.modelYear)||d.modelYear<1990||d.modelYear>year+1)throw Error("Enter a plausible vehicle year.");
  if(!["self","family","leased"].includes(d.ownership))throw Error("Choose a vehicle ownership option.");
 }
 if(step===3&&documentKinds.some(k=>!d.checklist[k]))
  throw Error("Mark all three sample document categories as ready.");
 if(step===4){
  if(!screenOptions[d.vehicleType]?.includes(d.screenChoice))
   throw Error("Choose a screen placement compatible with the example vehicle.");
  if(!d.installationReviewed||!d.powerSafetyConfirmed)
   throw Error("Confirm the fictional installation and power-safety checklists.");
 }
 if(step===5){
  if(!["weekly","monthly"].includes(d.payoutFrequency))throw Error("Choose sample payout frequency.");
  if(!d.simulatedPayoutReady||!d.termsAccepted||!d.demoConsent)
   throw Error("Complete the example payout-readiness and agreement confirmations.");
 }
}
export function validateDriverThrough(step:1|2|3|4|5,d:DriverDraft,year=2026):void{
 for(let n=1;n<=step;n++)validateDriverStep(n as 1|2|3|4|5,d,year);
}
export function unlockDriverStep(d:DriverDraft,step:1|2|3|4|5,year=2026):DriverDraft{
 validateDriverThrough(step,d,year);
 return {...d,highestUnlocked:Math.max(d.highestUnlocked,step+1) as 1|2|3|4|5|6};
}
export function driverCompletedSteps(d:DriverDraft,year=2026):number{
 let completed=0;
 for(let i=1;i<=5;i++){try{validateDriverStep(i as 1|2|3|4|5,d,year);completed++;}catch{break;}}
 return completed;
}
/** Old Part 13 session drafts are safely completed with false/default future-step controls. */
export function sanitizedDriverDraft(input:Partial<DriverDraft>):DriverDraft{
 const d={...driverSeed,...input};
 const checklist={...driverSeed.checklist,...input.checklist};
 return {
  displayAlias:String(d.displayAlias??"").slice(0,60),city:String(d.city??"").slice(0,60),
  experience:d.experience,availability:d.availability,adultConfirmed:!!d.adultConfirmed,
  vehicleType:d.vehicleType,vehicleModel:String(d.vehicleModel??"").slice(0,70),
  modelYear:d.modelYear,ownership:d.ownership,
  checklist:{licence:!!checklist.licence,registration:!!checklist.registration,insurance:!!checklist.insurance},
  screenChoice:d.screenChoice,installationReviewed:!!d.installationReviewed,powerSafetyConfirmed:!!d.powerSafetyConfirmed,
  payoutFrequency:d.payoutFrequency,simulatedPayoutReady:!!d.simulatedPayoutReady,
  termsAccepted:!!d.termsAccepted,demoConsent:!!d.demoConsent,highestUnlocked:d.highestUnlocked
 };
}
export function validateDriverSubmission(d:DriverDraft,hasExistingPreview:boolean,year=2026){
 validateDriverThrough(5,d,year);
 if(hasExistingPreview)throw Error("Your demo onboarding request has already been submitted.");
}
