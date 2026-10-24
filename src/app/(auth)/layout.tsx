import {AuthFrame} from "@/components/auth/auth-frame";
import {AuthHydration} from "@/components/auth/auth-hydration";
export default function AuthLayout({children}:{children:React.ReactNode}){
 return <AuthFrame><AuthHydration>{children}</AuthHydration></AuthFrame>;
}
