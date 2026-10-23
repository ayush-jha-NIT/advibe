export const PORTALS = ["public", "admin", "advertiser", "driver"] as const;
export type Portal = (typeof PORTALS)[number];

export const portalDisplayName: Record<Portal, string> = {
  public: "Public Website",
  admin: "Admin Portal",
  advertiser: "Advertiser Portal",
  driver: "Driver Partner Portal",
};

export const palette = {
  navy: "#041B3D",
  navyDeep: "#031221",
  blue: "#0866FF",
  orange: "#FF6A00",
  purple: "#5415FF",
  green: "#10B969",
  amber: "#FF951C",
  red: "#F52235",
  background: "#F8FBFF",
  surface: "#FFFFFF",
  foreground: "#0B1B40",
} as const;
