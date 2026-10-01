import React from "react";
import {
  Home,
  CalendarDays,
  Truck,
  Shirt,
  CreditCard,
  User,
  Bell,
  HelpCircle,
  Settings,
  LogOut,
  MapPin,
  Clock,
  MessageSquare,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Edit3,
  Trash2,
  UploadCloud,
  Download,
  Camera,
  Image as ImageIcon,
  Lock,
  Unlock,
  Star,
  Heart,
  Info,
  FileText,
  Package,
  WashingMachine,
  ShoppingCart,
  Wallet,
  Phone,
  Store,
  ArrowLeft,
} from "lucide-react-native";

// 🧠 Define types for props
export interface IconProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

// 🎨 Default styling
const DEFAULT_COLOR = "#007AFF"; // eLaba blue
const DEFAULT_SIZE = 24;
const DEFAULT_STROKE = 2.2;

// 🔧 Helper to create consistent icon components
const createIcon = (IconComponent: React.FC<any>, defaultColor = DEFAULT_COLOR) => {
  const WrappedIcon: React.FC<IconProps> = ({
    color = defaultColor,
    size = DEFAULT_SIZE,
    strokeWidth = DEFAULT_STROKE,
    ...rest
  }) => <IconComponent color={color} size={size} strokeWidth={strokeWidth} {...rest} />;

  return WrappedIcon;
};

// 🧩 Centralized icon library
export const Icons = {
  // 🏠 App Navigation / Dashboard
  Home: createIcon(Home),
  Calendar: createIcon(CalendarDays),
  Truck: createIcon(Truck),
  Shirt: createIcon(Shirt),
  User: createIcon(User),
  Settings: createIcon(Settings),
  Bell: createIcon(Bell),
  Help: createIcon(HelpCircle),
  Logout: createIcon(LogOut, "#FF3B30"),

  // 💳 Services & Transactions
  Card: createIcon(CreditCard),
  Wallet: createIcon(Wallet),
  Package: createIcon(Package),
  ShoppingCart: createIcon(ShoppingCart),
  WashingMachine: createIcon(WashingMachine),

  // 📅 Booking / Delivery
  MapPin: createIcon(MapPin),
  Clock: createIcon(Clock),
  Check: createIcon(CheckCircle2, "#4CAF50"),
  Alert: createIcon(AlertTriangle, "#FF9800"),

  // 💬 Communication
  Message: createIcon(MessageSquare),
  Phone: createIcon(Phone),

  // 🖋️ UI Controls
  Add: createIcon(PlusCircle),
  Edit: createIcon(Edit3),
  Delete: createIcon(Trash2, "#E53935"),
  Search: createIcon(Search),
  Upload: createIcon(UploadCloud),
  Download: createIcon(Download),
  Camera: createIcon(Camera),
  Image: createIcon(ImageIcon),

  // 🔐 Security
  Lock: createIcon(Lock),
  Unlock: createIcon(Unlock),

  // ⭐ Status & Info
  Star: createIcon(Star),
  Heart: createIcon(Heart, "#E91E63"),
  Info: createIcon(Info),
  File: createIcon(FileText),
  Store: createIcon(Store),
  ArrowLeft: createIcon(ArrowLeft),
};

export default Icons;
