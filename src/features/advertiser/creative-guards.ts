/** Client-side creative inspection for PREVIEW only. Production must verify file bytes and scan uploads on its backend. */
export type CreativeKind="image"|"gif"|"video";
export type PreviewAsset={name:string;type:string;size:number};
export type MediaMeasurements={width:number;height:number;durationSeconds?:number};
export const PREVIEW_MAX_BYTES=10*1024*1024;
export const VIDEO_MAX_SECONDS=60;
const recognized:{mime:string;kind:CreativeKind;extensions:readonly string[]}[]=[
 {mime:"image/png",kind:"image",extensions:["png"]},
 {mime:"image/jpeg",kind:"image",extensions:["jpg","jpeg"]},
 {mime:"image/gif",kind:"gif",extensions:["gif"]},
 {mime:"video/mp4",kind:"video",extensions:["mp4"]},
];
export function inspectPreviewFile(file:PreviewAsset):{kind:CreativeKind;extension:string}{
 const entry=recognized.find(x=>x.mime===file.type);
 if(!entry)throw Error("Only PNG, JPEG, GIF and MP4 preview files are supported.");
 if(!Number.isSafeInteger(file.size)||file.size<=0||file.size>PREVIEW_MAX_BYTES)
  throw Error("Choose a non-empty file no larger than 10 MB.");
 const name=file.name.split(/[\\/]/).pop()??"";
 const extension=name.includes(".")?name.slice(name.lastIndexOf(".")+1).toLowerCase():"";
 if(!entry.extensions.includes(extension))throw Error("Filename extension must match the selected file type.");
 return {kind:entry.kind,extension};
}
export function inspectMediaMeasurements(media:MediaMeasurements,kind:CreativeKind):void{
 if(!Number.isFinite(media.width)||!Number.isFinite(media.height)||media.width<320||media.height<320)
  throw Error("Preview dimensions must be at least 320 × 320 pixels.");
 if(media.width>4096||media.height>4096)throw Error("Preview dimensions cannot exceed 4096 pixels.");
 if(kind==="video"&&(!Number.isFinite(media.durationSeconds)||!media.durationSeconds||media.durationSeconds<1||media.durationSeconds>VIDEO_MAX_SECONDS))
  throw Error("Preview videos must last between 1 and 60 seconds.");
}
export function fileSizeLabel(bytes:number):string{
 return (bytes/(1024*1024)).toFixed(2)+" MB";
}
/** Check header magic bytes, so a renamed executable can't be previewed as an image/video. Still not a security scan. */
export function matchesMagicBytes(bytes:Uint8Array,kind:CreativeKind,extension:string):boolean{
 if(kind==="image"&&extension==="png")return bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n);
 if(kind==="image"&&(extension==="jpg"||extension==="jpeg"))return bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
 if(kind==="gif")return bytes.length>=6&&String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/)!==null;
 if(kind==="video"){
  if(bytes.length<12)return false;
  // ISO BMFF starts with a plausible box length followed by ASCII "ftyp".
  const boxLength=bytes[0]*16777216+bytes[1]*65536+bytes[2]*256+bytes[3];
  return boxLength>=12&&boxLength<=1048576&&
   bytes[4]===102&&bytes[5]===116&&bytes[6]===121&&bytes[7]===112;
 }
 return false;
}
