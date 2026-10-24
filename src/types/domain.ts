/** Fictional demonstration records, never authoritative hardware, KYC or payment data. */
export type ID=string;
export type Role="admin"|"advertiser"|"driver";
export type Placement="bike_rear"|"auto_rear"|"auto_side"|"car_rear"|"car_interior"|"helmet";
export type CampaignStatus="draft"|"submitted"|"under_review"|"changes_requested"|"approved"|"scheduled"|"live"|"paused"|"completed"|"rejected"|"cancelled";
export type ReviewStatus="pending"|"under_review"|"approved"|"rejected";
export type PaymentStatus="unpaid"|"pending"|"paid"|"failed"|"refunded";
export interface Account{id:ID;role:Role;name:string;business?:string;city:string;active:boolean}
export interface Location{id:ID;city:string;zone:string;name:string;lat:number;lng:number}
export interface Vehicle{id:ID;driverId:ID;type:"bike"|"auto"|"car";registrationMasked:string;model:string;verification:ReviewStatus}
export interface Screen{id:ID;vehicleId:ID;driverId:ID;locationId:ID;placement:Placement;sizeInches:number;status:"online"|"offline"|"maintenance";impressionsPerDay:number}
export interface Creative{id:ID;advertiserId:ID;title:string;format:"image"|"video"|"gif";placement:Placement;approval:ReviewStatus}
export interface Campaign{id:ID;advertiserId:ID;title:string;creativeId:ID;objective:"awareness"|"offer"|"visits"|"event";startDate:string;endDate:string;screenIds:ID[];status:CampaignStatus;paymentStatus:PaymentStatus;createdAt:string;impressions:number;
  /** Tentative targeting, never a reservation or driver assignment. */
  plannedScreenIds?:ID[];
  quoteEstimatePaise?:number;
  wizardDetails?:{business:string;industry:string;description:string;format:Placement;weekdays:number[];startTime:string;endTime:string;playsPerDay:number};
 }
export interface Booking{id:ID;campaignId:ID;screenId:ID;startDate:string;endDate:string;status:"reserved"|"confirmed"|"cancelled"}
export interface PricingRule{id:ID;placement:Placement;city:string;rupeesPerScreenDay:number;validFrom:string;validTo:string;active:boolean}
export interface Payment{id:ID;campaignId:ID;advertiserId:ID;amountPaise:number;status:PaymentStatus;provider:"demo"|"cashfree";providerReference?:string}
export interface DriverApplication{id:ID;driverId:ID;vehicleId:ID;status:ReviewStatus;completedSteps:number;documentsStatus:ReviewStatus;screenSetupStatus:ReviewStatus}
/** Isolated fictional onboarding review requests. Never represents actual identity verification. */
export interface DriverPreviewApplication{
 id:ID;driverId:ID;submittedAt:string;status:"submitted";
 alias:string;city:string;vehicleType:"bike"|"auto"|"car";vehicleModel:string;
 screenChoice:"bike_rear"|"auto_rear"|"auto_side"|"car_rear"|"car_interior";
 payoutFrequency:"weekly"|"monthly";
}
export interface Settlement{id:ID;driverId:ID;campaignId:ID;grossPaise:number;deductionsPaise:number;status:"pending"|"processed"|"failed";periodStart:string;periodEnd:string}
export interface Notice{id:ID;recipientId:ID;type:"campaign"|"verification"|"device"|"billing"|"settlement"|"support";title:string;message:string;createdAt:string;read:boolean}
export interface Ticket{id:ID;accountId:ID;subject:string;status:"open"|"in_progress"|"resolved";createdAt:string;category?:"campaign"|"billing"|"creative"|"technical"|"other";description?:string;campaignId?:ID}
export interface AuditEvent{id:ID;actorId:ID;entity:string;entityId:ID;action:string;createdAt:string}
export interface DemoDatabase{accounts:Account[];locations:Location[];vehicles:Vehicle[];screens:Screen[];creatives:Creative[];campaigns:Campaign[];bookings:Booking[];pricingRules:PricingRule[];payments:Payment[];driverApplications:DriverApplication[];driverPreviewApplications?:DriverPreviewApplication[];settlements:Settlement[];notices:Notice[];tickets:Ticket[];auditEvents:AuditEvent[]}
export interface Actor{role:Role;accountId:ID}
