import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Banknote, Bell, CalendarDays, CircleHelp, Clapperboard, ClipboardCheck,
  CreditCard, FileChartColumnIncreasing, House, LayoutGrid, MapPinned, Megaphone,
  Monitor, MonitorCheck, Paintbrush, ReceiptText, Settings, SlidersHorizontal,
  Users, UserRound, Wallet, Wrench, CarFront, ListVideo, Clock3, ListChecks,
  ChartNoAxesCombined } from "lucide-react";

export type PortalRole = "admin" | "advertiser" | "driver";
export type NavItem = { label: string; href: string; icon: LucideIcon; description: string; group?: "main" | "management" | "account"; keywords?: string[] };
export const portalNames: Record<PortalRole,string> = { admin: "Admin Portal", advertiser: "Advertiser Portal", driver: "Driver Partner Portal" };
export const portalPeople: Record<PortalRole,{name:string;subtitle:string;initials:string}> = {
  admin:{name:"Admin",subtitle:"Super Admin · Demo",initials:"A"},
  advertiser:{name:"Demo Advertiser",subtitle:"Advertiser · Demo",initials:"DA"},
  driver:{name:"Demo Driver",subtitle:"Driver Partner · Demo",initials:"DP"},
};
export const portalNavigation: Record<PortalRole,NavItem[]> = {
  admin:[
    {label:"Dashboard",href:"/admin",icon:House,description:"Platform overview, live status and quick actions"},
    {label:"Campaigns",href:"/admin/campaigns",icon:Megaphone,description:"Campaign operations and monitoring"},
    {label:"Advertisers",href:"/admin/advertisers",icon:Users,description:"Advertiser accounts and activity"},
    {label:"Driver Partners",href:"/admin/drivers",icon:CarFront,description:"Driver onboarding and verification",keywords:["applications","kyc"]},
    {label:"Screens & Devices",href:"/admin/screens",icon:MonitorCheck,description:"Inventory, screen status and devices"},
    {label:"Locations & Zones",href:"/admin/locations",icon:MapPinned,description:"Cities, zones, routes and maps"},
    {label:"Ad Formats & Rules",href:"/admin/ad-formats",icon:Clapperboard,description:"Creative specifications and content policies"},
    {label:"Pricing & Commercial",href:"/admin/pricing",icon:SlidersHorizontal,description:"Rate cards, discounts and commercial rules"},
    {label:"Approvals",href:"/admin/approvals",icon:ClipboardCheck,description:"Campaign, driver and creative review"},
    {label:"Bookings & Schedule",href:"/admin/bookings",icon:CalendarDays,description:"Screen reservations and delivery schedules"},
    {label:"Payments & Refunds",href:"/admin/payments",icon:CreditCard,description:"Advertiser transactions, refunds and invoices",group:"management"},
    {label:"Driver Settlements",href:"/admin/settlements",icon:Banknote,description:"Driver earnings and payouts",group:"management"},
    {label:"Reports & Analytics",href:"/admin/analytics",icon:ChartNoAxesCombined,description:"Revenue, reach and network analytics",group:"management"},
    {label:"Users & Roles",href:"/admin/users",icon:UserRound,description:"Accounts, permissions and audit trails",group:"management"},
    {label:"Notifications",href:"/admin/notifications",icon:Bell,description:"System and approval notifications",group:"account"},
    {label:"Support & Disputes",href:"/admin/support",icon:CircleHelp,description:"Tickets, disputes and refunds",group:"account"},
    {label:"Settings",href:"/admin/settings",icon:Settings,description:"Roles, security and platform configuration",group:"account"},
  ],
  advertiser:[
    {label:"Dashboard",href:"/advertiser",icon:House,description:"Campaign and reach overview"},
    {label:"Create Campaign",href:"/advertiser/create-campaign",icon:Megaphone,description:"Six-step campaign creation and checkout",keywords:["wizard","new campaign"]},
    {label:"My Campaigns",href:"/advertiser/campaigns",icon:ListVideo,description:"Active, completed and draft campaigns"},
    {label:"Ad Formats",href:"/advertiser/ad-formats",icon:LayoutGrid,description:"Screen formats and specifications"},
    {label:"Locations",href:"/advertiser/locations",icon:MapPinned,description:"Search cities, areas and screens"},
    {label:"Creative Library",href:"/advertiser/creatives",icon:Paintbrush,description:"Organize creative metadata and preview local media"},
    {label:"Billing & Payments",href:"/advertiser/billing",icon:Wallet,description:"Demo payment ledger, sample statements and checkout requirements",group:"management"},
    {label:"Reports & Analytics",href:"/advertiser/reports",icon:FileChartColumnIncreasing,description:"Fictional campaign summaries and CSV export",group:"management"},
    {label:"Notifications",href:"/advertiser/notifications",icon:Bell,description:"Campaign, creative and billing alerts",group:"account"},
    {label:"Help & Support",href:"/advertiser/support",icon:CircleHelp,description:"Help guides and support requests",group:"account"},
    {label:"Profile & Settings",href:"/advertiser/settings",icon:Settings,description:"Demo business details and browser display preferences",group:"account"},
  ],
  driver:[
    {label:"Dashboard",href:"/driver",icon:House,description:"Sample booked work, screen inventory and driver notices"},
    {label:"Onboarding",href:"/driver/onboarding",icon:ListChecks,description:"Five-step demo partner application and review submission"},
    {label:"Verification Status",href:"/driver/verification",icon:BadgeCheck,description:"View sample review request and seeded verification records"},
    {label:"My Vehicle & Screen",href:"/driver/vehicle",icon:CarFront,description:"Driver-owned vehicle, read-only screens and booking links"},
    {label:"Assigned Ads & Schedule",href:"/driver/assigned-ads",icon:Megaphone,description:"Confirmed booking dates and demo ad schedule"},
    {label:"Campaigns",href:"/driver/campaigns",icon:Clapperboard,description:"Filter campaigns with confirmed sample assignments"},
    {label:"Earnings",href:"/driver/earnings",icon:Wallet,description:"Sample settlement analytics and monthly totals",group:"management"},
    {label:"Payout History",href:"/driver/payouts",icon:ReceiptText,description:"Fictional payout statuses and sample statements",group:"management"},
    {label:"Screen Activity & History",href:"/driver/delivery",icon:Monitor,description:"Booked campaigns; verified playback not connected",group:"management"},
    {label:"Trips & Exposure",href:"/driver/trips",icon:Clock3,description:"Real GPS and exposure data not yet connected",group:"management"},
    {label:"Maintenance & Issues",href:"/driver/maintenance",icon:Wrench,description:"Log fictional screen issues against owned devices",group:"management"},
    {label:"Notifications",href:"/driver/notifications",icon:Bell,description:"Account-owned notices and read-state controls",group:"account"},
    {label:"Support",href:"/driver/support",icon:CircleHelp,description:"Driver demo tickets and support questions",group:"account"},
    {label:"Profile & Documents",href:"/driver/profile",icon:UserRound,description:"Read-only sample driver identity and document states",group:"account"},
  ],
};
export const publicNavigation = [
  {label:"Home",href:"/"},
  {label:"For Advertisers",href:"/for-advertisers",children:[
    {label:"Why AdVibe?",href:"/for-advertisers"},
    {label:"Ad Formats",href:"/ad-formats"},
    {label:"Pricing",href:"/pricing"},
  ]},
  {label:"For Drivers",href:"/for-drivers",children:[
    {label:"Drive with AdVibe",href:"/for-drivers"},
    {label:"Driver Sign Up",href:"/signup?role=driver"},
    {label:"Help Center",href:"/help-center"},
  ]},
  {label:"Ad Formats",href:"/ad-formats"},
  {label:"Locations",href:"/locations"},
  {label:"Pricing",href:"/pricing"},
  {label:"About Us",href:"/about"},
  {label:"Contact Us",href:"/contact"},
  {label:"Help Center",href:"/help-center"},
] as const;

export function activePortalItem(role:PortalRole,pathname:string) {
  const items=portalNavigation[role];
  return items.find(i=>pathname===i.href) ?? [...items].sort((a,b)=>b.href.length-a.href.length)
    .find(i=>pathname.startsWith(i.href+"/")) ?? items[0];
}
export function findPortalSection(role:PortalRole,slug:string) {
  return portalNavigation[role].find(i=>i.href==="/"+role+"/"+slug);
}
