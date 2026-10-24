import test from "node:test";
import assert from "node:assert/strict";
import {inspectPreviewFile,inspectMediaMeasurements,matchesMagicBytes,PREVIEW_MAX_BYTES,fileSizeLabel} from "../src/features/advertiser/creative-guards.ts";

test("enforce supported file type and corresponding extension",()=>{
 assert.deepEqual(inspectPreviewFile({name:"PROMO.JPEG",type:"image/jpeg",size:5000}),{kind:"image",extension:"jpeg"});
 assert.deepEqual(inspectPreviewFile({name:"loop.gif",type:"image/gif",size:4000}),{kind:"gif",extension:"gif"});
 assert.throws(()=>inspectPreviewFile({name:"video.exe",type:"video/mp4",size:1000}),/extension/);
 assert.throws(()=>inspectPreviewFile({name:"self.svg",type:"image/svg+xml",size:1000}),/Only PNG/);
 assert.throws(()=>inspectPreviewFile({name:"broken.png",type:"image/png",size:0}),/non-empty/);
 assert.throws(()=>inspectPreviewFile({name:"large.mp4",type:"video/mp4",size:PREVIEW_MAX_BYTES+1}),/10 MB/);
});
test("header checks reject renamed binaries and identify accepted formats",()=>{
 assert.equal(matchesMagicBytes(new Uint8Array([137,80,78,71,13,10,26,10]),"image","png"),true);
 assert.equal(matchesMagicBytes(new Uint8Array([255,216,255,0]),"image","jpg"),true);
 assert.equal(matchesMagicBytes(new TextEncoder().encode("GIF89a"),"gif","gif"),true);
 assert.equal(matchesMagicBytes(new Uint8Array([0,0,0,24,102,116,121,112,105,115,111,109]),"video","mp4"),true);
 assert.equal(matchesMagicBytes(new Uint8Array([77,90,0,0,102,116,121,112,0,0,0,0]),"video","mp4"),false);
});
test("reject impossible media dimensions and excessively long video",()=>{
 assert.doesNotThrow(()=>inspectMediaMeasurements({width:1080,height:1920},"image"));
 assert.doesNotThrow(()=>inspectMediaMeasurements({width:800,height:600,durationSeconds:30},"video"));
 assert.throws(()=>inspectMediaMeasurements({width:160,height:160},"image"),/320/);
 assert.throws(()=>inspectMediaMeasurements({width:4097,height:800},"gif"),/4096/);
 assert.throws(()=>inspectMediaMeasurements({width:1920,height:1080,durationSeconds:95},"video"),/60/);
 assert.equal(fileSizeLabel(1048576),"1.00 MB");
});
