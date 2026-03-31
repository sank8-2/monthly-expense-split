import {
  Home,
  ShoppingCart,
  Zap,
  Wifi,
  Tv,
  UtensilsCrossed,
  Car,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { ExpenseCategory } from "@/types";

export const APP_NAME = "SplitKaro";
export const APP_DESCRIPTION =
  "Track and split expenses with your roommates effortlessly";

export const CATEGORY_CONFIG: Record<
  ExpenseCategory,
  { label: string; icon: LucideIcon; color: string; gradient: string }
> = {
  rent: {
    label: "Rent",
    icon: Home,
    color: "#6C5CE7",
    gradient: "from-purple-500 to-indigo-600",
  },
  groceries: {
    label: "Groceries",
    icon: ShoppingCart,
    color: "#00CEC9",
    gradient: "from-teal-400 to-emerald-500",
  },
  utilities: {
    label: "Utilities",
    icon: Zap,
    color: "#FDCB6E",
    gradient: "from-yellow-400 to-amber-500",
  },
  internet: {
    label: "Internet",
    icon: Wifi,
    color: "#0984E3",
    gradient: "from-blue-400 to-cyan-500",
  },
  subscriptions: {
    label: "Subscriptions",
    icon: Tv,
    color: "#E17055",
    gradient: "from-orange-400 to-red-500",
  },
  food: {
    label: "Food",
    icon: UtensilsCrossed,
    color: "#E84393",
    gradient: "from-pink-400 to-rose-500",
  },
  transport: {
    label: "Transport",
    icon: Car,
    color: "#00B894",
    gradient: "from-green-400 to-emerald-500",
  },
  other: {
    label: "Other",
    icon: MoreHorizontal,
    color: "#636E72",
    gradient: "from-gray-400 to-slate-500",
  },
};

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
