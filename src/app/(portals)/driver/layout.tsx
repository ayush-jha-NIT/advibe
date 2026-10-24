import {PortalShell} from "@/components/layout/portal-shell";
import {PortalGate} from "@/components/auth/portal-gate";
export default function DriverLayout({children}:{children:React.ReactNode}){return <PortalGate role="driver"><PortalShell role="driver">{children}</PortalShell></PortalGate>;}
