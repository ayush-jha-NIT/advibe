import type { Placement } from "@/types/domain";

/** Decorative mobile-ad-format artwork, not a photograph or live inventory feed. */
export function FormatPreviewArt({type}:{type:Placement}){
 const isHelmet=type==="helmet";
 const isBike=type==="bike_rear";
 const isCar=type==="car_interior"||type==="car_rear";
 const id=type.replaceAll("_","-");
 return <svg viewBox="0 0 420 240" role="img" aria-label={
  isHelmet?"Illustration of a helmet advertisement":isBike?"Motorbike mounted digital ad screen":
  isCar?"Vehicle interior advertising screen":"Auto-rickshaw mounted advertising screen"}
  className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice">
  <defs>
   <linearGradient id={id+"-sky"} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#5687bb"/><stop offset=".6" stopColor="#db8c73"/><stop offset="1" stopColor="#1b2d42"/></linearGradient>
   <linearGradient id={id+"-ad"} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#6b2bff"/><stop offset=".4" stopColor="#e915a9"/><stop offset=".73" stopColor="#ff7e1b"/><stop offset="1" stopColor="#155cf3"/></linearGradient>
   <linearGradient id={id+"-vehicle"} x1="0" x2="0" y1="0" y2="1"><stop stopColor="#224964"/><stop offset="1" stopColor="#081525"/></linearGradient>
  </defs>
  <rect width="420" height="240" fill={"url(#"+id+"-sky)"}/>
  <g opacity=".55" fill="#19304e"><path d="M0 145V82h25v36h20V66h37v72h18V92h29V55h14v89h20v-35h37v-40h28v76h20V93h36v41h23V82h37v68h31v-62h44v62h32v90H0Z"/></g>
  <path d="M0 240 135 145h150l135 95" fill="#0e243b"/>
  <path d="M199 158 150 240m76-82 50 82" stroke="#fbd29a" strokeWidth="3" opacity=".33"/>
  {isHelmet ? <g transform="translate(80 24)">
    <path d="M55 137Q35 29 158 19q100-5 124 97l-4 43-79 17-123-7Z" fill="#111b32" stroke="#647597" strokeWidth="8"/>
    <path d="M59 118q40-68 174-63l27 39-11 44-151 3Z" fill="#26405d"/>
    <path d="M91 127q89-39 174-25l-13 36-147 17Z" fill="#020714" stroke="#9cc3e6" strokeWidth="4"/>
    <path d="M61 90q100-70 174-49" stroke="#f5f8ff" strokeWidth="10" opacity=".78"/>
    <path d="m183 39 56 14" stroke="#ff7e22" strokeWidth="10"/>
    <g fill="#fff" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="18"><text x="115" y="75">YOUR</text><text x="115" y="94">BRAND</text></g>
   </g> :isCar?<g transform="translate(20 17)">
    <path d="M0 185 34 17h320l25 168" fill="#28384f" stroke="#546987" strokeWidth="13"/>
    <path d="M37 32h298l16 133H18Z" fill="#101f35" stroke="#7394b3" strokeWidth="4"/>
    <path d="M65 60h245v93H65Z" fill="#050b17" stroke="#637c9c" strokeWidth="6"/>
    <rect x="80" y="68" width="215" height="78" rx="3" fill={"url(#"+id+"-ad)"}/>
    <path d="M30 187h320" stroke="#0c1522" strokeWidth="22"/>
    <g textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="20">
     <text x="187" y="104">YOUR BRAND</text><text x="187" y="131">HERE</text>
    </g>
   </g>: isBike?<g transform="translate(87 9)">
    <path d="M112 25Q97 0 121 2q23 0 25 26l-12 22h-24Z" fill="#101827" stroke="#ff671a" strokeWidth="4"/>
    <path d="M95 56q34-18 57 0l17 107H79Z" fill="#0c1d32" stroke="#61799d" strokeWidth="5"/>
    <path d="m88 81-49 87m123-87 47 87" stroke="#0b1423" strokeWidth="16" strokeLinecap="round"/>
    <path d="m105 175-47 49m81-49 46 49" stroke="#071421" strokeWidth="15"/>
    <circle cx="121" cy="197" r="35" fill="#080e18" stroke="#364762" strokeWidth="9"/>
    <rect x="38" y="65" width="168" height="144" rx="13" fill="#050c1c" stroke="#516a8e" strokeWidth="6"/>
    <rect x="51" y="75" width="142" height="124" rx="6" fill={"url(#"+id+"-ad)"}/>
    <g textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="19">
     <text x="122" y="115">YOUR</text><text x="122" y="141">BRAND</text><text x="122" y="166">HERE</text>
    </g>
   </g>:<g transform="translate(70 35)">
    <path d="M0 170q4-70 46-124h216q42 50 49 124Z" fill="#e8a922" stroke="#fddf70" strokeWidth="8"/>
    <path d="M32 70h247v105H32Z" fill="#134831" stroke="#316c46" strokeWidth="8"/>
    <path d="M60 81h194v84H60Z" fill="#040e18" stroke="#32485e" strokeWidth="7"/>
    <rect x="72" y="91" width="170" height="64" rx="4" fill={"url(#"+id+"-ad)"}/>
    <g fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="17"><text x="157" y="118">YOUR BRAND</text><text x="157" y="139">HERE</text></g>
    <rect x="52" y="173" width="222" height="16" rx="5" fill="#112e20"/>
    <circle cx="70" cy="190" r="12" fill="#080f18"/><circle cx="256" cy="190" r="12" fill="#080f18"/>
   </g>}
 </svg>;
}
