import {ApiPortal} from "@/features/live/api-portal";
import {PortalShell} from "@/components/layout/portal-shell";
import {PortalGate} from "@/components/auth/portal-gate";
export default function AdminLayout({children}:{children:React.ReactNode}){if(process.env.NEXT_PUBLIC_DEMO_MODE==="false")return <ApiPortal role="admin"/>;return <PortalGate role="admin"><PortalShell role="admin">{children}</PortalShell></PortalGate>;}
