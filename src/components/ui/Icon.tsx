/**
 * Explicit icon registry. Importing lucide-react as a namespace pulls the whole
 * icon set into the main chunk (~600KB), so every icon used is listed here.
 */
import {
  Activity, AlertCircle, AlertTriangle, Archive, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  ArrowUpRight, AtSign, Ban, BarChart3, Bell, BellOff, Blocks, Bold, BookOpen, Bookmark, Bot,
  Boxes, Building2, Calendar, CalendarDays, Check, CheckCircle2, CheckSquare, ChevronDown,
  ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Circle, CircleDashed, CircleDot,
  CircleSlash, Clock, Code, Command, Compass, Copy, CornerDownRight, Cpu, CreditCard, Database,
  Download, Edit3, ExternalLink, Eye, Filter, Flag, Flame, FolderKanban, Gauge, GitBranch,
  GitMerge, Globe, GripVertical, Hash, Heart, History, Home, Image, Inbox, Info, Italic,
  KanbanSquare, Keyboard, Layers, LayoutDashboard, LayoutGrid, LayoutList, Lightbulb, Link2,
  List, ListChecks, ListTodo, Loader2, Lock, LogOut, Mail, MapPin, Maximize2, Megaphone, Menu,
  MessageSquare, Minimize2, Minus, MoreHorizontal, MoreVertical, Move, Paperclip, Pause, PenLine,
  Pin, Play, Plus, RefreshCw, Repeat, Reply, RotateCcw, Rocket, Save, Search, Send, Settings,
  Share2, Shield, ShieldCheck, SignalHigh, SignalLow, SignalMedium, SlidersHorizontal, Smile,
  Sparkles, Split, Square, Star, Sun, Moon, Table2, Tag, Target, Timer, Trash2, TrendingDown,
  TrendingUp, Triangle, Undo2, Unlink, User, UserPlus, Users, Wand2, Workflow, X, Zap,
  ClipboardList, FileText, Files, Folder, GanttChartSquare, Grid3x3, Laptop, LineChart, Network,
  PieChart, Presentation, ScrollText, Trophy, Wrench, Palette, Radar, Radio, Scale, Hourglass,
} from 'lucide-react'

export const ICONS = {
  activity: Activity, 'alert-circle': AlertCircle, 'alert-triangle': AlertTriangle, archive: Archive,
  'arrow-down': ArrowDown, 'arrow-left': ArrowLeft, 'arrow-right': ArrowRight, 'arrow-up': ArrowUp,
  'arrow-up-right': ArrowUpRight, 'at-sign': AtSign, ban: Ban, 'bar-chart': BarChart3, bell: Bell,
  'bell-off': BellOff, blocks: Blocks, bold: Bold, 'book-open': BookOpen, bookmark: Bookmark, bot: Bot,
  boxes: Boxes, building: Building2, calendar: Calendar, 'calendar-days': CalendarDays, check: Check,
  'check-circle': CheckCircle2, 'check-square': CheckSquare, 'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft, 'chevron-right': ChevronRight, 'chevron-up': ChevronUp,
  'chevrons-up-down': ChevronsUpDown, circle: Circle, 'circle-dashed': CircleDashed,
  'circle-dot': CircleDot, 'circle-slash': CircleSlash, clock: Clock, code: Code, command: Command,
  compass: Compass, copy: Copy, 'corner-down-right': CornerDownRight, cpu: Cpu, 'credit-card': CreditCard,
  database: Database, download: Download, edit: Edit3, 'external-link': ExternalLink, eye: Eye,
  filter: Filter, flag: Flag, flame: Flame, 'folder-kanban': FolderKanban, gauge: Gauge,
  'git-branch': GitBranch, 'git-merge': GitMerge, globe: Globe, grip: GripVertical, hash: Hash,
  heart: Heart, history: History, home: Home, image: Image, inbox: Inbox, info: Info, italic: Italic,
  kanban: KanbanSquare, keyboard: Keyboard, layers: Layers, dashboard: LayoutDashboard,
  'layout-grid': LayoutGrid, 'layout-list': LayoutList, lightbulb: Lightbulb, link: Link2, list: List,
  'list-checks': ListChecks, 'list-todo': ListTodo, loader: Loader2, lock: Lock, logout: LogOut,
  mail: Mail, 'map-pin': MapPin, maximize: Maximize2, megaphone: Megaphone, menu: Menu,
  message: MessageSquare, minimize: Minimize2, minus: Minus, 'more-horizontal': MoreHorizontal,
  'more-vertical': MoreVertical, move: Move, paperclip: Paperclip, pause: Pause, pen: PenLine,
  pin: Pin, play: Play, plus: Plus, refresh: RefreshCw, repeat: Repeat, reply: Reply,
  'rotate-ccw': RotateCcw, rocket: Rocket, save: Save, search: Search, send: Send, settings: Settings,
  share: Share2, shield: Shield, 'shield-check': ShieldCheck, 'signal-high': SignalHigh,
  'signal-low': SignalLow, 'signal-medium': SignalMedium, sliders: SlidersHorizontal, smile: Smile,
  sparkles: Sparkles, split: Split, square: Square, star: Star, sun: Sun, moon: Moon, table: Table2,
  tag: Tag, target: Target, timer: Timer, trash: Trash2, 'trending-down': TrendingDown,
  'trending-up': TrendingUp, triangle: Triangle, undo: Undo2, unlink: Unlink, user: User,
  'user-plus': UserPlus, users: Users, wand: Wand2, workflow: Workflow, x: X, zap: Zap,
  clipboard: ClipboardList, 'file-text': FileText, files: Files, folder: Folder,
  gantt: GanttChartSquare, grid: Grid3x3, laptop: Laptop, 'line-chart': LineChart, network: Network,
  'pie-chart': PieChart, presentation: Presentation, scroll: ScrollText, trophy: Trophy,
  wrench: Wrench, palette: Palette, radar: Radar, radio: Radio, scale: Scale, hourglass: Hourglass,
} as const

export type IconName = keyof typeof ICONS

export interface IconProps {
  name: IconName
  size?: number
  className?: string
  strokeWidth?: number
}

export function Icon({ name, size = 16, className, strokeWidth = 2 }: IconProps) {
  const Cmp = ICONS[name] ?? Circle
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden />
}
