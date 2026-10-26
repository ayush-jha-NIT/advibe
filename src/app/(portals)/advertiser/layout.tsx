import {ApiPortal} from "@/features/live/api-portal";
import {PortalShell} from "@/components/layout/portal-shell";
import {PortalGate} from "@/components/auth/portal-gate";
export default function AdvertiserLayout({children}:{children:React.ReactNode}){if(process.env.NEXT_PUBLIC_DEMO_MODE==="false")return <ApiPortal role="advertiser"/>;return <PortalGate role="advertiser"><PortalShell role="advertiser">{children}</PortalShell></PortalGate>;}
