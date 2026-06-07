import { Home, Users, Trophy, LayoutGrid, ClipboardList, Star, Calendar, TrendingUp, Clock, Target, Medal, ShieldAlert, LineChart, Dices, Cpu } from "lucide-react";

export const navGroups = [
  {
    title: "",
    items: [
      { href: "/", label: "Dashboard", icon: Home },
    ]
  },
  {
    title: "Tournament",
    items: [
      { href: "/fixtures", label: "Upcoming Fixtures", icon: Calendar },
      { href: "/groups", label: "Group Stage", icon: LayoutGrid },
      { href: "/bracket", label: "Knockout Bracket", icon: Trophy },
      { href: "/road-to-glory", label: "Road To Glory", icon: TrendingUp },
    ]
  },
  {
    title: "Stories & Stars",
    items: [
      { href: "/intelligence", label: "Intelligence Center", icon: ShieldAlert },
      { href: "/golden-boot", label: "Golden Boot Race", icon: Medal },
      { href: "/awards", label: "Awards Center", icon: Star },
      { href: "/squads", label: "Squad Explorer", icon: Users },
      { href: "/timeline", label: "Tournament Timeline", icon: Clock },
    ]
  },
  {
    title: "Predictions",
    items: [
      { href: "/predictor", label: "Match Predictor", icon: Dices },
      { href: "/odds-history", label: "Odds History", icon: LineChart },
      { href: "/accuracy", label: "Accuracy Center", icon: Target },
    ]
  },
  {
    title: "Engine",
    items: [
      { href: "/analytics", label: "Analytics & ML", icon: Cpu },
    ]
  }
];
