import type {Actor,Creative,ReviewStatus} from "../../types/domain";
export function assertDemoAdmin(actor:Actor):void{
 if(actor.role!=="admin"||actor.accountId!=="adm-1")throw Error("Preset demo Admin required.");
}
export function assertCreativeMetadataReview(actor:Actor,creative:Creative|undefined,target:ReviewStatus):void{
 assertDemoAdmin(actor);
 if(!creative)throw Error("Creative not found");
 if(!["pending","under_review"].includes(creative.approval))throw Error("Creative has already been reviewed.");
 if(!["approved","rejected"].includes(target))throw Error("Invalid review decision.");
}
