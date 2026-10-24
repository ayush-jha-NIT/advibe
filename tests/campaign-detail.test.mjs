import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {actionWarning,allowedAdvertiserActions,assertAdvertiserManagement,campaignCreative,campaignPayments,campaignScreens,displayAuditAction,ownCampaign,visibleCampaignEvents} from "../src/features/advertiser/campaign-detail-model.ts";

const owner={role:"advertiser",accountId:"adv-1"};
const other={role:"advertiser",accountId:"adv-2"};
test("campaign detail selection is owner-scoped",()=>{
 const db=createDemoSeed();
 assert.equal(ownCampaign(db,"adv-1","cmp-1")?.title,"Festival Week");
 assert.equal(ownCampaign(db,"adv-1","cmp-2"),null);
 assert.equal(ownCampaign(db,"not-provisioned","cmp-1"),null);
});
test("detail selectors link only recorded creative, placements, payments and events",()=>{
 const db=createDemoSeed(),campaign=ownCampaign(db,"adv-1","cmp-1");
 assert.equal(campaignCreative(db,campaign)?.id,"crt-1");
 assert.deepEqual(campaignScreens(db,campaign).map(x=>[x.screen.id,x.location?.name,x.booking?.status]),[["scr-1","Civil Lines","confirmed"]]);
 assert.deepEqual(campaignPayments(db,campaign).map(x=>x.id),["pay-1"]);
 assert.deepEqual(visibleCampaignEvents(db,campaign),[]);
 assert.equal(displayAuditAction("wizard_submitted"),"Submitted from campaign wizard");
});
test("manage actions block cross-owner and illegal lifecycle operations",()=>{
 const db=createDemoSeed(),live=ownCampaign(db,"adv-1","cmp-1"),draft=ownCampaign(db,"adv-1","cmp-3");
 assert.deepEqual(allowedAdvertiserActions(db,live),["pause"]);
 assert.deepEqual(allowedAdvertiserActions(db,draft),["cancel"]);
 assert.doesNotThrow(()=>assertAdvertiserManagement(db,owner,live,"pause"));
 assert.throws(()=>assertAdvertiserManagement(db,other,live,"pause"),/owning advertiser/);
 assert.throws(()=>assertAdvertiserManagement(db,owner,live,"cancel"),/cannot be cancelled/);
 assert.throws(()=>assertAdvertiserManagement(db,owner,draft,"resume"),/Invalid campaign transition/);
});
test("resuming requires payment and matching confirmed reservations",()=>{
 const db=createDemoSeed(),live=ownCampaign(db,"adv-1","cmp-1");
 const paused={...live,status:"paused"};
 assert.doesNotThrow(()=>assertAdvertiserManagement(db,owner,paused,"resume"));
 assert.throws(()=>assertAdvertiserManagement(db,owner,{...paused,paymentStatus:"unpaid"},"resume"),/confirmed demo payment/);
 assert.throws(()=>assertAdvertiserManagement({...db,bookings:[]},owner,paused,"resume"),/reserved screens/);
 assert.deepEqual(allowedAdvertiserActions(db,paused),["resume","cancel"]);
});
test("cancellation messaging never promises a refund or external pause",()=>{
 const db=createDemoSeed(),c=ownCampaign(db,"adv-1","cmp-1");
 assert.match(actionWarning("cancel",c),/no Cashfree refund/);
 assert.match(actionWarning("pause",c),/No connected vehicle/);
});
