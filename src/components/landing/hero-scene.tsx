import type { SVGProps } from "react";

/**
 * Decorative, lightweight 9.6-second looping hero illustration.
 * Animated transforms live in globals.css and are disabled for reduced-motion.
 * No fake GPS/device data or autoplay media/network requests.
 */
export function HeroScene(props:SVGProps<SVGSVGElement>){
  return <svg viewBox="0 0 1440 610" preserveAspectRatio="xMidYMid slice" fill="none" aria-hidden="true" focusable="false" {...props}>
    <defs>
      <linearGradient id="streetSky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#061b42"/><stop offset=".42" stopColor="#1f3669"/>
        <stop offset=".72" stopColor="#d75e5e"/><stop offset="1" stopColor="#f9a347"/>
      </linearGradient>
      <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#19264c"/><stop offset=".55" stopColor="#09172c"/><stop offset="1" stopColor="#040d1c"/></linearGradient>
      <linearGradient id="displayGradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#652eff"/><stop offset=".43" stopColor="#ef158e"/><stop offset=".7" stopColor="#ff6a00"/><stop offset="1" stopColor="#045bff"/></linearGradient>
      <linearGradient id="carMetal" x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#405c83"/><stop offset=".4" stopColor="#15213b"/><stop offset=".9" stopColor="#0b1022"/></linearGradient>
      <linearGradient id="glass" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#142b4c"/><stop offset="1" stopColor="#050b1a"/></linearGradient>
      <radialGradient id="streetSun"><stop stopColor="#ffc58d" stopOpacity=".85"/><stop offset="1" stopColor="#ffa557" stopOpacity="0"/></radialGradient>
      <filter id="softHalo"><feGaussianBlur stdDeviation="13"/></filter>
      <filter id="smallGlow"><feGaussianBlur stdDeviation="3"/></filter>
      <pattern id="windowLights" width="28" height="29" patternUnits="userSpaceOnUse"><rect width="28" height="29" fill="none"/><rect x="8" y="8" width="5" height="10" rx="1" fill="#ffb87a" opacity=".4"/><rect x="19" y="9" width="4" height="8" rx="1" fill="#64b7ff" opacity=".45"/></pattern>
    </defs>

    <g className="advibe-scene-city">
      <rect width="1440" height="610" fill="url(#streetSky)"/>
      <ellipse cx="885" cy="330" rx="540" ry="220" fill="url(#streetSun)"/>
      <g fill="#0a1b35" opacity=".68">
        <path d="M0 372V182h50v-47h33v70h37v-91h47v21h20v95h32V174h36v40h39v-84h50v69h37v-90h27v-31h6v31h40v82h38v-57h38v82h33V155h47v20h40v-73h26v-26h9v26h22v97h38v-42h45v25h25v-54h51V86h10v42h23v46h28v-63h51v45h20V93h32v72h38v-40h47v100h39v-55h38v-53h44v83h40v-64h47v112h34v-55h45v-62h40v182Z"/>
        <path d="M980 350V194h43v-38h20v38h43v-73h38v37h32v-60h21v60h48v-38h44v-23h17v23h35v116h36v-70h42v184Z"/>
      </g>
      <g opacity=".54"><path d="M0 175h1440v196H0z" fill="url(#windowLights)"/></g>
      <g className="advibe-scene-parallax" opacity=".94">
        <path fill="#101c35" d="M0 300h128v-66h43v65h79v-93h49v89h88v-87h65v79h43v-45h91v73h51v-111h52v105h38v-64h63v76h81v-54h60v48h88v-72h62v74h86v-91h44v85h51v-62h68v69h49v-92h50v99h81V371H0z"/>
        <path d="M0 300h1440v80H0z" fill="url(#windowLights)" opacity=".58"/>
      </g>

      {/* India Gate-inspired city landmark, kept decorative rather than a geographic claim. */}
      <g transform="translate(710 212)" opacity=".85">
        <path d="M-56 178V55h16V30h16V9H30V30h16v25h16v123H33V97c0-29-48-29-48 0v81Z" fill="#73465b"/>
        <path d="M-64 62H69M-33 30H42" stroke="#ffb17d" strokeWidth="7" opacity=".7"/>
        <path d="M-18 181V99c0-26 36-26 36 0v82" fill="#2b2d46"/>
        <path d="M-29 15H37" stroke="#ffb17d" strokeWidth="7"/>
        <path d="M-45 75h16m61 0h16M-46 124h22m54 0h22" stroke="#f6a16e" strokeWidth="5" opacity=".7"/>
      </g>
      <g fill="#05152a" opacity=".93">
        <path d="M0 390v-84l33-13 19 11 18-38 24 40 43 32v52zM0 386v-73l45 19 15-28 28 42 30 10v30z"/>
        <path d="M1440 380v-104l-38 16-22-33-31 40-36-12-37 46v47z"/>
      </g>
      <g stroke="#f39d58" strokeWidth="3" opacity=".7">
        <path d="M28 322v148m136-128v119m113-91v91m100-70v82m687-113v104m108-109v125m123-144v125m100-154v135"/>
      </g>
      {[[28,322],[164,342],[277,370],[377,391],[1064,360],[1172,351],[1295,336],[1395,307]].map(([x,y])=><g key={x}><circle cx={x} cy={y} r="12" fill="#ffab46" opacity=".6" filter="url(#smallGlow)"/><circle cx={x} cy={y} r="4.5" fill="#fff1b4"/></g>)}
    </g>

    <path d="M0 610 540 376H915L1440 610Z" fill="url(#asphalt)"/>
    <path d="m717 380-25 230h20l23-230Zm20 0 59 230h20l-64-230Z" fill="#f2b076" opacity=".31"/>
    <path d="M0 562 580 383m860 179L867 383" stroke="#f6b66e" strokeWidth="3" opacity=".42"/>
    <path d="m576 413-157 197m513-197 156 197" stroke="#89aaff" strokeWidth="2" opacity=".29"/>
    <path d="M0 599 641 386m799 213L790 386" stroke="#f6a46c" strokeWidth="17" opacity=".11" filter="url(#softHalo)"/>

    {/* Passing light streaks */}
    <g strokeLinecap="round" opacity=".75">
      <path d="M20 455h246m-205 20h157m108-43h82" stroke="#ffae52" strokeWidth="4"/>
      <path d="M1228 449h193m-182 23h130" stroke="#ffc34f" strokeWidth="5"/>
    </g>

    {/* Car approaching on right. Entire vehicle has a gentle motion reveal. */}
    <g className="advibe-scene-car" transform="translate(1010 363)">
      <ellipse cx="198" cy="231" rx="247" ry="26" fill="#000" opacity=".56" filter="url(#softHalo)"/>
      <path d="M35 117c8-54 24-91 72-106 58-19 143-19 192 0 44 18 58 61 62 106l20 64v52H14v-48Z" fill="url(#carMetal)" stroke="#6a7b9a" strokeWidth="4"/>
      <path d="m94 32 213-3 26 95H57Z" fill="url(#glass)" stroke="#5d7193" strokeWidth="4"/>
      <path d="M57 128h276v65H57Z" fill="#060b18" stroke="#65748d" strokeWidth="4"/>
      <rect x="75" y="132" width="242" height="64" rx="4" fill="url(#displayGradient)" stroke="#10192c" strokeWidth="5"/>
      <g fontFamily="Arial, sans-serif" fontWeight="900" fill="white" textAnchor="middle">
        <text x="135" y="156" fontSize="17">YOUR</text><text x="135" y="175" fontSize="17">BRAND</text>
        <text x="135" y="192" fontSize="15">HERE</text>
      </g>
      <g transform="translate(215 138)">
        <path d="M12 39q-6-23 13-29l42 2q17 10 9 28Z" fill="#ea9c3f"/>
        <rect x="9" y="35" width="72" height="15" rx="6" fill="#ec9c37"/>
        <path d="M17 24q14-13 40 0" stroke="#74aa56" strokeWidth="7"/><path d="M16 31h47" stroke="#f1ca62" strokeWidth="5"/>
      </g>
      <path d="M24 205h55l-6 21H27Zm284 0h61l-6 21h-52Z" fill="#fb383e"/>
      <rect x="146" y="207" width="94" height="22" rx="3" fill="#d1e2eb"/><path d="M162 213h58" stroke="#415779" strokeWidth="3"/>
      <path d="M45 230h70m160 0h70" stroke="#2b3346" strokeWidth="12" strokeLinecap="round"/>
      <g className="advibe-scene-light"><ellipse cx="48" cy="211" rx="50" ry="19" fill="#fb3c38" opacity=".36" filter="url(#softHalo)"/><ellipse cx="347" cy="211" rx="50" ry="19" fill="#fb3c38" opacity=".36" filter="url(#softHalo)"/></g>
    </g>

    {/* Motorbike & real mounted advertising screen in the center */}
    <g className="advibe-scene-bike" transform="translate(740 256)">
      <ellipse cx="123" cy="346" rx="120" ry="19" fill="#000" opacity=".65" filter="url(#softHalo)"/>
      <path d="M92 64q-24-40 6-58 29-19 52 8 15 25-5 53l-6 24H93Z" fill="#070f21" stroke="#a73d4a" strokeWidth="5"/>
      <path d="m96 22 16-11 13 5m5-4 12 18" stroke="#1c8ffc" strokeWidth="5"/>
      <path d="M76 72q47-17 81 0l19 97-30 41-82-3-12-39Z" fill="#0e1b31" stroke="#485579" strokeWidth="4"/>
      <path d="m70 91-52 94m144-93 68 82" stroke="#151a2b" strokeWidth="22" strokeLinecap="round"/>
      <path d="m18 185-8 43m219-54 19 57" stroke="#0e1220" strokeWidth="13" strokeLinecap="round"/>
      <path d="M87 208 45 322h24l51-85m39-29 36 114h-24l-48-87" fill="#111525" stroke="#647086" strokeWidth="6"/>
      <path d="M95 214h54l33 95H58Z" fill="#060d1d" stroke="#536078" strokeWidth="5"/>
      <circle cx="121" cy="305" r="43" fill="#070b14" stroke="#2e3b4d" strokeWidth="13"/>
      <circle cx="121" cy="305" r="13" fill="#ee303d"/><circle cx="121" cy="305" r="6" fill="#ffb278"/>
      <rect x="32" y="84" width="178" height="211" rx="13" fill="#050b19" stroke="#43546f" strokeWidth="8"/>
      <rect x="45" y="99" width="152" height="179" rx="6" fill="url(#displayGradient)" stroke="#99c5ff" strokeOpacity=".67" strokeWidth="2"/>
      <path d="m45 240 68-40 48 30 36-24v72H45Z" fill="#1257e8" opacity=".85"/>
      <path d="m118 99 79 69v-69Z" fill="#e821a0" opacity=".45"/>
      <g fontFamily="Arial, sans-serif" fontWeight="900" fill="white" textAnchor="middle">
        <text x="121" y="153" fontSize="24">YOUR</text><text x="121" y="179" fontSize="24">BRAND</text>
        <text x="121" y="205" fontSize="24">HERE</text>
      </g>
      <rect x="103" y="284" width="36" height="7" rx="3" fill="#ff3f41"/>
      <ellipse className="advibe-scene-light" cx="120" cy="303" rx="39" ry="31" fill="#ff433a" opacity=".36" filter="url(#softHalo)"/>
    </g>

    {/* Location network and pulsing campaign nodes become visible mid-sequence. */}
    <g className="advibe-scene-network" stroke="#6ac9ff" strokeWidth="2" strokeDasharray="6 9" opacity=".85">
      <path d="M650 240 790 166 951 234 1162 173 1314 267" />
      <path d="m790 166 70 56m91 12 76-100" stroke="#ffb05e"/>
    </g>
    <g className="advibe-scene-network" fill="#0078ff" stroke="#b5edff" strokeWidth="3">
      {[[650,240],[790,166],[951,234],[1162,173],[1314,267]].map(([x,y],i)=><g key={i}>
        <circle cx={x} cy={y} r="14" opacity=".55"/><circle cx={x} cy={y} r="6" fill="#ddf8ff" stroke="none"/>
        <circle className="advibe-pin-pulse" cx={x} cy={y} r="22" opacity=".42" fill="none"/>
      </g>)}
    </g>

    <rect width="1440" height="610" fill="url(#streetSky)" opacity=".04"/>
  </svg>;
}
