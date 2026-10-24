"use client";
import {inspectMediaMeasurements,inspectPreviewFile,matchesMagicBytes,type CreativeKind,type MediaMeasurements} from "./creative-guards";

export type InspectedPreview={kind:CreativeKind;measurements:MediaMeasurements};
/** Browser-only inspection. Blob URLs are temporary and always revoked. */
export async function inspectLocalPreview(file:File):Promise<InspectedPreview>{
 const {kind,extension}=inspectPreviewFile(file);
 const magic=new Uint8Array(await file.slice(0,16).arrayBuffer());
 if(!matchesMagicBytes(magic,kind,extension))
  throw Error("File contents do not match the declared image/video format.");
 const url=URL.createObjectURL(file);
 try {
  const measurements=await new Promise<MediaMeasurements>((resolve,reject)=>{
   if(kind==="video"){
    const video=document.createElement("video");
    video.preload="metadata";
    video.onloadedmetadata=()=>resolve({width:video.videoWidth,height:video.videoHeight,durationSeconds:video.duration});
    video.onerror=()=>reject(Error("Unable to read video metadata. Try another MP4 file."));
    video.src=url;
    video.load();
   }else{
    const preview=new window.Image();
    preview.onload=()=>resolve({width:preview.naturalWidth,height:preview.naturalHeight});
    preview.onerror=()=>reject(Error("Unable to read image dimensions. Try another image."));
    preview.src=url;
   }
  });
  inspectMediaMeasurements(measurements,kind);
  return {kind,measurements};
 }finally{
  URL.revokeObjectURL(url);
 }
}
