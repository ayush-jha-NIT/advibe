import {PortalShell} from "@/components/layout/portal-shell";
import {PortalGate} from "@/components/auth/portal-gate";
export default function AdvertiserLayout({children}:{children:React.ReactNode}){return <PortalGate role="advertiser"><PortalShell role="advertiser">{children}</PortalShell></PortalGate>;}
