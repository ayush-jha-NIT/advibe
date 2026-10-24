import type { Campaign,CampaignStatus,DemoDatabase } from "../../types/domain";

export type CampaignBucket="all"|"live"|"in_review"|"draft"|"completed"|"other";
export type CampaignSort="newest"|"oldest"|"name_asc"|"name_desc"|"most_impressions"|"fewest_impressions";
export type CampaignFilter={
 search?:string;bucket?:CampaignBucket;status?:CampaignStatus|"all";
 from?:string;to?:string;sort?:CampaignSort;
};
const reviewStatus=new Set<CampaignStatus>(["submitted","under_review","changes_requested"]);
export function campaignBucket(status:CampaignStatus):CampaignBucket{
 if(status==="live")return "live";
 if(reviewStatus.has(status))return "in_review";
 if(status==="draft")return "draft";
 if(status==="completed")return "completed";
 return "other";
}
export function selectAdvertiserCampaigns(db:DemoDatabase,advertiserId:string):Campaign[]{
 return db.campaigns.filter(c=>c.advertiserId===advertiserId);
}
export function filterCampaigns(campaigns:readonly Campaign[],opts:CampaignFilter={}):Campaign[]{
 const search=(opts.search??"").trim().toLocaleLowerCase("en");
 const rows=campaigns.filter(c=>
  (!search||[c.title,c.id,c.objective,c.status].some(value=>value.toLocaleLowerCase("en").includes(search)))&&
  (!opts.bucket||opts.bucket==="all"||campaignBucket(c.status)===opts.bucket)&&
  (!opts.status||opts.status==="all"||c.status===opts.status)&&
  (!opts.from||c.createdAt.slice(0,10)>=opts.from)&&
  (!opts.to||c.createdAt.slice(0,10)<=opts.to)
 );
 const sort=opts.sort??"newest";
 return rows.sort((a,b)=>{
  if(sort==="name_asc"||sort==="name_desc"){
   const delta=a.title.localeCompare(b.title,undefined,{sensitivity:"base"});
   return (sort==="name_asc"?delta:-delta)||a.id.localeCompare(b.id);
  }
  if(sort==="most_impressions"||sort==="fewest_impressions"){
   const delta=a.impressions-b.impressions;
   return (sort==="fewest_impressions"?delta:-delta)||b.createdAt.localeCompare(a.createdAt)||a.id.localeCompare(b.id);
  }
  const delta=a.createdAt.localeCompare(b.createdAt);
  return (sort==="oldest"?delta:-delta)||a.id.localeCompare(b.id);
 });
}
export function paginateCampaigns(rows:readonly Campaign[],page:number,pageSize=5){
 if(!Number.isSafeInteger(pageSize)||pageSize<1)throw Error("Invalid page size");
 const pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const selected=Math.min(pages,Math.max(1,Math.trunc(page)||1));
 return {rows:rows.slice((selected-1)*pageSize,selected*pageSize),page:selected,pages,
  total:rows.length,from:rows.length?(selected-1)*pageSize+1:0,to:Math.min(selected*pageSize,rows.length)};
}
export function campaignSummary(rows:readonly Campaign[],db:Pick<DemoDatabase,"payments">,advertiserId:string){
 const owned=new Set(rows.filter(r=>r.advertiserId===advertiserId).map(r=>r.id));
 const own=rows.filter(c=>c.advertiserId===advertiserId);
 return {total:own.length,live:own.filter(c=>c.status==="live").length,
  review:own.filter(c=>campaignBucket(c.status)==="in_review").length,
  drafts:own.filter(c=>c.status==="draft").length,
  completed:own.filter(c=>c.status==="completed").length,
  impressions:own.reduce((sum,c)=>sum+Math.max(0,c.impressions),0),
  paidPaise:db.payments.filter(p=>p.advertiserId===advertiserId&&owned.has(p.campaignId)&&p.status==="paid").reduce((sum,p)=>sum+p.amountPaise,0)};
}
export function statusChart(rows:readonly Campaign[]){
 const order:[CampaignBucket,string][]=[["live","Live"],["in_review","In Review"],["draft","Draft"],["completed","Completed"],["other","Other"]];
 return order.map(([bucket,name])=>({bucket,name,count:rows.filter(c=>campaignBucket(c.status)===bucket).length}))
  .filter(x=>x.count>0);
}
export function impressionsChart(rows:readonly Campaign[],limit=6){
 return [...rows].sort((a,b)=>b.impressions-a.impressions||a.title.localeCompare(b.title)).slice(0,limit)
  .map(c=>({id:c.id,title:c.title.length>16?c.title.slice(0,14)+"…":c.title,fullTitle:c.title,impressions:Math.max(0,c.impressions)}));
}
export function sanitizeCSV(value:string):string{
 // Quoting alone does not prevent spreadsheet formula execution.
 const safe=/^[\s]*[=+\-@\t\r]/.test(value)?"'"+value:value;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function campaignsCSV(rows:readonly Campaign[]){
 const header=["Campaign ID","Campaign Name","Status","Start Date","End Date","Creative ID","Screen Count","Impressions","Payment Status"];
 const body=rows.map(c=>[c.id,c.title,c.status,c.startDate,c.endDate,c.creativeId,String(c.screenIds.length),String(c.impressions),c.paymentStatus]
  .map(sanitizeCSV).join(","));
 return "\uFEFF"+[header.join(","),...body].join("\r\n")+"\r\n";
}
