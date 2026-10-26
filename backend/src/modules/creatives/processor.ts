import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { HttpError } from "../../lib/http-error.js";
import { sniffMime } from "./schemas.js";
export interface ProcessedCreative { bytes:Buffer; mimeType:"image/png"|"video/mp4";
  width:number;height:number;durationMs:number|null }
export interface CreativeMediaProcessor {
  convert(bytes:Buffer,mimeType:string):Promise<ProcessedCreative>;
}
export const localMediaProcessor:CreativeMediaProcessor={
  async convert(bytes,mimeType){
    if(sniffMime(bytes)!==mimeType)
      throw new HttpError(422,"MEDIA_MAGIC_MISMATCH","Source bytes do not match expected format");
    const dir=mkdtempSync(join(tmpdir(),"advibe-media-"));
    try{
      const input=join(dir,"input.bin");
      const video=mimeType==="video/mp4";
      const output=join(dir,video?"output.mp4":"output.png");
      writeFileSync(input,bytes,{mode:0o600});
      execFileSync("clamscan",["--no-summary",input],{timeout:60000});
      const info=JSON.parse(execFileSync("ffprobe",[
        "-v","error","-show_entries","stream=width,height,codec_type:format=duration",
        "-of","json",input],{encoding:"utf8",timeout:20000})) as {
          streams?:Array<{width?:number;height?:number;codec_type?:string}>;
          format?:{duration?:string} };
      const stream=info.streams?.find(x=>x.codec_type==="video");
      if(!stream?.width||!stream.height||stream.width>8192||stream.height>8192)
        throw new HttpError(422,"MEDIA_DIMENSIONS","Unsupported media dimensions");
      const duration=Number(info.format?.duration??0);
      if(video&&(!Number.isFinite(duration)||duration<=0||duration>60))
        throw new HttpError(422,"MEDIA_DURATION","Video must be under 60 seconds");
      execFileSync("ffmpeg",video?[
        "-v","error","-nostdin","-i",input,"-map","0:v:0","-an",
        "-c:v","libx264","-pix_fmt","yuv420p","-t","60","-y",output]:[
        "-v","error","-nostdin","-i",input,"-map","0:v:0",
        "-frames:v","1","-y",output],{timeout:120000});
      const processed=readFileSync(output);
      if(processed.length<16||processed.length>104857600||
        sniffMime(processed)!==(video?"video/mp4":"image/png"))
        throw new HttpError(422,"MEDIA_OUTPUT_INVALID","Invalid processed output");
      return {bytes:processed,mimeType:video?"video/mp4":"image/png",
        width:stream.width,height:stream.height,
        durationMs:video?Math.round(duration*1000):null};
    }finally{rmSync(dir,{recursive:true,force:true});}
  },
};
