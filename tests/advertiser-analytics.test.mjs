import test from "node:test";
import assert from "node:assert/strict";
import {createDemoSeed} from "../src/data/demo-seed.ts";
import {campaignBucket,campaignsCSV,campaignSummary,filterCampaigns,impressionsChart,paginateCampaigns,sanitizeCSV,selectAdvertiserCampaigns,statusChart} from "../src/features/advertiser/analytics.ts";

test("only advertiser-owned campaigns appear",()=>{
 const db=createDemoSeed();
 const own=selectAdvertiserCampaigns(db,"adv-1");
 assert.equal(own.length,2);
 assert.ok(own.every(c=>c.advertiserId==="adv-1"));
 assert.equal(selectAdvertiserCampaigns(db,"unseeded-preview").length,0);
});
test("summary excludes other advertisers' paid transactions and impressions",()=>{
 const db=createDemoSeed(),own=selectAdvertiserCampaigns(db,"adv-1");
 const s=campaignSummary(own,db,"adv-1");
 assert.equal(s.total,2);
 assert.equal(s.live,1);
 assert.equal(s.drafts,1);
 assert.equal(s.impressions,48120);
 assert.equal(s.paidPaise,188800);
 const empty=campaignSummary(own,db,"adv-2");
 assert.equal(empty.total,0);
 assert.equal(empty.paidPaise,0);
});
test("filters search, grouping, creation date and sort without mutating input",()=>{
 const db=createDemoSeed(),rows=selectAdvertiserCampaigns(db,"adv-1");
 const copy=rows.map(x=>x.id);
 assert.deepEqual(filterCampaigns(rows,{bucket:"draft"}).map(c=>c.id),["cmp-3"]);
 assert.deepEqual(filterCampaigns(rows,{search:"Festival"}).map(c=>c.id),["cmp-1"]);
 assert.deepEqual(filterCampaigns(rows,{from:"2026-10-20"}).map(c=>c.id),["cmp-3"]);
 assert.deepEqual(filterCampaigns(rows,{to:"2026-10-20"}).map(c=>c.id),["cmp-1"]);
 assert.deepEqual(filterCampaigns(rows,{sort:"oldest"}).map(c=>c.id),["cmp-1","cmp-3"]);
 assert.deepEqual(filterCampaigns(rows,{sort:"most_impressions"}).map(c=>c.id),["cmp-1","cmp-3"]);
 assert.deepEqual(rows.map(x=>x.id),copy);
 assert.equal(campaignBucket("under_review"),"in_review");
 assert.equal(campaignBucket("changes_requested"),"in_review");
});
test("pagination clamps boundaries and handles empty results",()=>{
 const rows=selectAdvertiserCampaigns(createDemoSeed(),"adv-1");
 assert.deepEqual(paginateCampaigns(rows,2,1).rows.map(c=>c.id),["cmp-3"]);
 assert.equal(paginateCampaigns(rows,200,1).page,2);
 assert.deepEqual(paginateCampaigns([],20,5),{rows:[],page:1,pages:1,total:0,from:0,to:0});
 assert.throws(()=>paginateCampaigns(rows,1,0),/Invalid page/);
});
test("chart data comes from actual demo rows, not invented trends",()=>{
 const rows=selectAdvertiserCampaigns(createDemoSeed(),"adv-1");
 assert.equal(statusChart(rows).reduce((a,b)=>a+b.count,0),2);
 assert.deepEqual(impressionsChart(rows).map(x=>x.impressions),[48120,0]);
});
test("CSV properly escapes quotations, commas and spreadsheet formulas",()=>{
 const dangerous={...createDemoSeed().campaigns[0],title:'=HYPERLINK("bad", "click")'};
 const csv=campaignsCSV([dangerous]);
 assert.ok(csv.includes('"\'=HYPERLINK(""bad"", ""click"")"'));
 assert.ok(csv.startsWith("\uFEFFCampaign ID,Campaign Name"));
 assert.equal(sanitizeCSV("@evil"),'"\'@evil"');
 assert.ok(csv.includes("cmp-1"));
});
