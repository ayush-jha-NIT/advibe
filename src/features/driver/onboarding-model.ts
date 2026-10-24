export type DemoVehicleType="bike"|"auto"|"car";
export type DocumentKind="licence"|"registration"|"insurance";
export const documentKinds=["licence","registration","insurance"] as const satisfies readonly DocumentKind[];
export type DriverDraft={
 displayAlias:string;city:string;experience:"new"|"under_one"|"one_to_three"|"over_three";
 availability:"weekdays"|"weekends"|"flexible";adultConfirmed:boolean;
 vehicleType:DemoVehicleType;vehicleModel:string;modelYear:number;ownership:"self"|"family"|"leased";
 checklist:Record<DocumentKind,boolean>;highestUnlocked:1|2|3|4;
};
export const driverSeed:DriverDraft={
 displayAlias:"Demo Driver",city:"Prayagraj",experience:"new",availability:"flexible",adultConfirmed:false,
 vehicleType:"auto",vehicleModel:"Demo Auto",modelYear:2023,ownership:"self",
 checklist:{licence:false,registration:false,insurance:false},highestUnlocked:1
};
export function validateDriverStep(step:1|2|3,d:DriverDraft,year=2026):void{
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
}
export function validateDriverThrough(step:1|2|3,d:DriverDraft,year=2026){
 for(let n=1;n<=step;n++)validateDriverStep(n as 1|2|3|4|5,d,year);
}
export function unlockDriverStep(d:DriverDraft,step:1|2|3,year=2026):DriverDraft{
 validateDriverThrough(step,d,year);
 return {...d,highestUnlocked:Math.max(d.highestUnlocked,step+1) as 1|2|3|4};
}
export function driverCompletedSteps(d:DriverDraft,year=2026){
 let completed=0;
 for(let i=1;i<=3;i++){try{validateDriverStep(i as 1|2|3,d,year);completed++;}catch{break;}}
 return completed;
}
export function sanitizedDriverDraft(d:DriverDraft):DriverDraft{
 return {displayAlias:d.displayAlias.slice(0,60),city:d.city.slice(0,60),experience:d.experience,availability:d.availability,
  adultConfirmed:!!d.adultConfirmed,vehicleType:d.vehicleType,vehicleModel:d.vehicleModel.slice(0,70),
  modelYear:d.modelYear,ownership:d.ownership,
  checklist:{licence:!!d.checklist.licence,registration:!!d.checklist.registration,insurance:!!d.checklist.insurance},
  highestUnlocked:d.highestUnlocked};
}

/** Submission is a fictional review request, not a verification or bank onboarding event. */
export function validateDriverSubmission(d:DriverDraft,hasExistingPreview:boolean,year=2026){
 validateDriverThrough(5,d,year);
 if(hasExistingPreview)throw Error("Your demo onboarding request has already been submitted.");
}
