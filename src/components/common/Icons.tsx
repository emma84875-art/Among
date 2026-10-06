import type { FC, SVGProps } from 'react';
import {
  MessageSquare,
  Users,
  User,
  Search,
  ArrowLeft,
  Sliders,
  Bell,
  BellOff,
  UserCircle2,
  UserPlus,
  UserMinus,
  Plus,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Paperclip,
  ArrowUp,
  Send,
  Camera,
  SwitchCamera,
  CameraOff,
  Image,
  FileText,
  ShieldCheck,
  Lock,
  PenLine,
  Trash2,
  Ban,
  X,
  Copy,
  Forward,
  Check,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Laptop,
  Pin,
  Sparkles,
  Compass,
  LogOut,
  Mail,
  AtSign,
  Calendar,
  AlertCircle,
  Wifi,
  Battery,
  BatteryLow,
  BatteryCharging,
  Bluetooth,
  BluetoothSearching,
  Radio,
  Zap,
  Smartphone,
  Maximize2,
  Feather,
  HeartHandshake,
  Heart,
  RotateCcw,
  HardDrive,
  Phone,
  PhoneOff,
  Smile,
  Mic,
  MicOff,
  Play,
  Pause,
  Square,
  Key,
  QrCode,
  Download,
  Volume2,
  VolumeX,
  Clock,
  Hourglass,
  Timer,
  Layers,
  Grid,
  Palette,
  Cloud,
  CloudOff,
  ArrowRight,
} from 'lucide-react';

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  strokeWidth?: number;
}

const DEFAULT_STROKE_WIDTH = 1.75;

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
};

function createIcon(BaseIcon: FC<any>): FC<IconProps> {
  return function UnifiedIcon({
    size = 'md',
    strokeWidth = DEFAULT_STROKE_WIDTH,
    className = '',
    ...props
  }: IconProps) {
    const sizeClass = typeof size === 'string' ? SIZE_MAP[size] || 'w-5 h-5' : '';
    const numericSize = typeof size === 'number' ? size : undefined;

    return (
      <BaseIcon
        size={numericSize}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`${sizeClass} ${className}`}
        {...props}
      />
    );
  };
}

// ----------------------------------------------------------------------
// CANONICAL UI ICONS (Strictly coherent style, weight & proportions)
// ----------------------------------------------------------------------

// Core Navigation & Identity
export const IconChats = createIcon(MessageSquare);
export const IconPeople = createIcon(Users);
export const IconYou = createIcon(User);
export const IconProfile = createIcon(UserCircle2);

// Actions & Navigation
export const IconSearch = createIcon(Search);
export const IconBack = createIcon(ArrowLeft);
export const IconSettings = createIcon(Sliders);
export const IconNotifications = createIcon(Bell);
export const IconNotificationsQuiet = createIcon(BellOff);
export const IconAdd = createIcon(Plus);
export const IconConnect = createIcon(UserPlus);
export const IconUserMinus = createIcon(UserMinus);
export const IconMore = createIcon(MoreHorizontal);
export const IconClose = createIcon(X);

// Messaging & Composer
export const IconAttachment = createIcon(Paperclip);
export const IconSend = createIcon(ArrowUp);
export const IconSendAlt = createIcon(Send);
export const IconCamera = createIcon(Camera);
export const IconSwitchCamera = createIcon(SwitchCamera);
export const IconCameraOff = createIcon(CameraOff);
export const IconGallery = createIcon(Image);
export const IconFiles = createIcon(FileText);
export const IconMic = createIcon(Mic);
export const IconMicOff = createIcon(MicOff);
export const IconPlay = createIcon(Play);
export const IconPause = createIcon(Pause);
export const IconStop = createIcon(Square);

// Security & Moderation
export const IconLock = createIcon(Lock);
export const IconSecurity = createIcon(ShieldCheck);
export const IconBlock = createIcon(Ban);

// Editing & Management
export const IconEdit = createIcon(PenLine);
export const IconDelete = createIcon(Trash2);
export const IconCopy = createIcon(Copy);
export const IconForward = createIcon(Forward);

// Message Delivery & Verification States
export const IconCheck = createIcon(Check);              // Sent
export const IconCheckDouble = createIcon(CheckCheck);    // Delivered / Read

// Directional & Disclosure
export const IconChevronRight = createIcon(ChevronRight);
export const IconChevronLeft = createIcon(ChevronLeft);
export const IconChevronDown = createIcon(ChevronDown);

// Form & Controls
export const IconEye = createIcon(Eye);
export const IconEyeOff = createIcon(EyeOff);
export const IconAlert = createIcon(AlertCircle);

// Appearance & System Themes
export const IconSun = createIcon(Sun);
export const IconMoon = createIcon(Moon);
export const IconLaptop = createIcon(Laptop);

// Supporting Sanctuary Elements
export const IconPin = createIcon(Pin);
export const IconSparkles = createIcon(Sparkles);
export const IconCompass = createIcon(Compass);
export const IconLogOut = createIcon(LogOut);
export const IconMail = createIcon(Mail);
export const IconAtSign = createIcon(AtSign);
export const IconCalendar = createIcon(Calendar);
export const IconFeather = createIcon(Feather);
export const IconCloseness = createIcon(HeartHandshake);
export const IconHeart = createIcon(Heart);
export const IconRotateCcw = createIcon(RotateCcw);
export const IconHardDrive = createIcon(HardDrive);
export const IconPhone = createIcon(Phone);
export const IconPhoneOff = createIcon(PhoneOff);
export const IconKey = createIcon(Key);
export const IconQrCode = createIcon(QrCode);
export const IconDownload = createIcon(Download);
export const IconVolume = createIcon(Volume2);
export const IconVolumeMute = createIcon(VolumeX);
export const IconSmile = createIcon(Smile);
export const IconClock = createIcon(Clock);
export const IconHourglass = createIcon(Hourglass);
export const IconTimer = createIcon(Timer);
export const IconLayers = createIcon(Layers);
export const IconGrid = createIcon(Grid);
export const IconPalette = createIcon(Palette);

// Device Frame & Connectivity Controls
export const IconWifi = createIcon(Wifi);
export const IconBattery = createIcon(Battery);
export const IconBatteryLow = createIcon(BatteryLow);
export const IconBatteryCharging = createIcon(BatteryCharging);
export const IconBluetooth = createIcon(Bluetooth);
export const IconBluetoothSearching = createIcon(BluetoothSearching);
export const IconRadio = createIcon(Radio);
export const IconZap = createIcon(Zap);
export const IconSmartphone = createIcon(Smartphone);
export const IconMaximize = createIcon(Maximize2);
export const IconCloud = createIcon(Cloud);
export const IconCloudOff = createIcon(CloudOff);
export const IconArrowRight = createIcon(ArrowRight);
export const IconArchive = createIcon(Archive);
export const IconArchiveRestore = createIcon(ArchiveRestore);

