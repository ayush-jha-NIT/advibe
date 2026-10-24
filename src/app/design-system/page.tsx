import type { Metadata } from "next";
import { DesignSystemShowcase } from "@/components/showcase/design-system-showcase";
export const metadata:Metadata = { title: "Design System Preview", robots: { index: false, follow: false } };
export default function DesignSystemPage() { return <DesignSystemShowcase/>; }
