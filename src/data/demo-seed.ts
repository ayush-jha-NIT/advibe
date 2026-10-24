import type {DemoDatabase,Actor} from "../types/domain";
// Static, invented records ensure the four portal previews share deterministic references.
export const DEMO_ACTORS:Record<"admin"|"advertiser"|"driver",Actor>={
  admin:{role:"admin",accountId:"adm-1"},
  advertiser:{role:"advertiser",accountId:"adv-1"},
  driver:{role:"driver",accountId:"drv-1"},
};
export function createDemoSeed():DemoDatabase{return {
 accounts:[
  {id:"adm-1",role:"admin",name:"Demo Administrator",city:"Prayagraj",active:true},
  {id:"adv-1",role:"advertiser",name:"Demo Brand Manager",business:"Sample Bistro",city:"Prayagraj",active:true},
  {id:"adv-2",role:"advertiser",name:"Sample Retail Team",business:"Example Market",city:"Lucknow",active:true},
  {id:"drv-1",role:"driver",name:"Demo Driver One",city:"Prayagraj",active:true},
  {id:"drv-2",role:"driver",name:"Demo Driver Two",city:"Prayagraj",active:true}],
 locations:[
  {id:"loc-1",city:"Prayagraj",zone:"A",name:"Civil Lines",lat:25.4588,lng:81.8338},
  {id:"loc-2",city:"Prayagraj",zone:"B",name:"Katra",lat:25.4743,lng:81.8631},
  {id:"loc-3",city:"Prayagraj",zone:"C",name:"Naini",lat:25.402,lng:81.8589},
  {id:"loc-4",city:"Lucknow",zone:"A",name:"Hazratganj",lat:26.8552,lng:80.942}],
 vehicles:[
  {id:"veh-1",driverId:"drv-1",type:"auto",registrationMasked:"UP70••1234",model:"Demo Auto",verification:"approved"},
  {id:"veh-2",driverId:"drv-2",type:"bike",registrationMasked:"UP70••5678",model:"Demo Bike",verification:"under_review"}],
 screens:[
  {id:"scr-1",vehicleId:"veh-1",driverId:"drv-1",locationId:"loc-1",placement:"auto_rear",sizeInches:10.1,status:"online",impressionsPerDay:12000},
  {id:"scr-2",vehicleId:"veh-1",driverId:"drv-1",locationId:"loc-2",placement:"auto_side",sizeInches:10.1,status:"online",impressionsPerDay:9600},
  {id:"scr-3",vehicleId:"veh-2",driverId:"drv-2",locationId:"loc-3",placement:"bike_rear",sizeInches:7,status:"offline",impressionsPerDay:7600}],
 creatives:[
  {id:"crt-1",advertiserId:"adv-1",title:"Festival Promotion",format:"image",placement:"auto_rear",approval:"approved"},
  {id:"crt-2",advertiserId:"adv-2",title:"Retail Launch",format:"video",placement:"auto_side",approval:"under_review"},
  {id:"crt-3",advertiserId:"adv-1",title:"Weekend Combo",format:"video",placement:"auto_rear",approval:"pending"}],
 campaigns:[
  {id:"cmp-1",advertiserId:"adv-1",title:"Festival Week",creativeId:"crt-1",objective:"offer",startDate:"2026-10-21",endDate:"2026-10-28",screenIds:["scr-1"],status:"live",paymentStatus:"paid",createdAt:"2026-10-18",impressions:48120},
  {id:"cmp-2",advertiserId:"adv-2",title:"Retail Launch",creativeId:"crt-2",objective:"awareness",startDate:"2026-11-01",endDate:"2026-11-08",screenIds:[],status:"submitted",paymentStatus:"unpaid",createdAt:"2026-10-22",impressions:0},
  {id:"cmp-3",advertiserId:"adv-1",title:"Weekend Offer",creativeId:"crt-3",objective:"offer",startDate:"2026-11-10",endDate:"2026-11-12",screenIds:[],status:"draft",paymentStatus:"unpaid",createdAt:"2026-10-23",impressions:0}],
 bookings:[{id:"bkg-1",campaignId:"cmp-1",screenId:"scr-1",startDate:"2026-10-21",endDate:"2026-10-28",status:"confirmed"}],
 pricingRules:[
  {id:"rate-1",placement:"bike_rear",city:"Prayagraj",rupeesPerScreenDay:150,validFrom:"2026-01-01",validTo:"2027-12-31",active:true},
  {id:"rate-2",placement:"auto_rear",city:"Prayagraj",rupeesPerScreenDay:200,validFrom:"2026-01-01",validTo:"2027-12-31",active:true},
  {id:"rate-3",placement:"auto_side",city:"Prayagraj",rupeesPerScreenDay:220,validFrom:"2026-01-01",validTo:"2027-12-31",active:true},
  {id:"rate-4",placement:"car_rear",city:"Prayagraj",rupeesPerScreenDay:300,validFrom:"2026-01-01",validTo:"2027-12-31",active:true},
  {id:"rate-5",placement:"car_interior",city:"Prayagraj",rupeesPerScreenDay:350,validFrom:"2026-01-01",validTo:"2027-12-31",active:true},
  {id:"rate-6",placement:"helmet",city:"Prayagraj",rupeesPerScreenDay:100,validFrom:"2026-01-01",validTo:"2027-12-31",active:true},
  {id:"rate-7",placement:"auto_side",city:"Lucknow",rupeesPerScreenDay:240,validFrom:"2026-01-01",validTo:"2027-12-31",active:true}],
 payments:[{id:"pay-1",campaignId:"cmp-1",advertiserId:"adv-1",amountPaise:188800,status:"paid",provider:"demo",providerReference:"DEMO-ONLY-001"}],
 driverApplications:[
  {id:"app-1",driverId:"drv-1",vehicleId:"veh-1",status:"approved",completedSteps:5,documentsStatus:"approved",screenSetupStatus:"approved"},
  {id:"app-2",driverId:"drv-2",vehicleId:"veh-2",status:"under_review",completedSteps:3,documentsStatus:"under_review",screenSetupStatus:"pending"}],
 settlements:[{id:"set-1",driverId:"drv-1",campaignId:"cmp-1",grossPaise:32000,deductionsPaise:3200,status:"pending",periodStart:"2026-10-21",periodEnd:"2026-10-27"}],
 notices:[
  {id:"not-1",recipientId:"adv-1",type:"campaign",title:"Campaign running",message:"Festival Week is live in this demo.",createdAt:"2026-10-23T10:00:00+05:30",read:false},
  {id:"not-2",recipientId:"drv-1",type:"campaign",title:"Campaign assigned",message:"Festival Week is assigned to your demo screen.",createdAt:"2026-10-23T10:00:00+05:30",read:false},
  {id:"not-3",recipientId:"adm-1",type:"verification",title:"Review application",message:"Demo Driver Two awaits verification.",createdAt:"2026-10-23T10:00:00+05:30",read:false}],
 tickets:[{id:"tkt-1",accountId:"drv-1",subject:"Screen maintenance question",status:"open",createdAt:"2026-10-22"}],
 auditEvents:[],
};}
