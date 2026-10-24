import {PortalShell} from "@/components/layout/portal-shell";
import {PortalGate} from "@/components/auth/portal-gate";
export default function AdminLayout({children}:{children:React.ReactNode}){return <PortalGate role="admin"><PortalShell role="admin">{children}</PortalShell></PortalGate>;}
