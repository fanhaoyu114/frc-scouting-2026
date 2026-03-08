'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore, Team, Match, ScoutingRecord, TeamStats, FoulRecord } from '@/store/useAppStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import {
  Trophy, Users, BarChart3, Download, LogOut, Eye, EyeOff,
  Plus, Trash2, Search, TrendingUp, Target, Zap, Shield,
  ChevronUp, ChevronDown, AlertCircle, FileEdit, Settings,
  LayoutDashboard, ClipboardList, Database, UserCog, X,
  AlertTriangle, Clock, Gauge, Activity, PieChart, LineChart
} from 'lucide-react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart as RechartsBarChart, Bar, Cell
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

// API helper
const api = {
  async fetch(endpoint: string, options: RequestInit = {}, token?: string | null) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`/api${endpoint}`, {
      ...options,
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  }
};

// Accuracy Input Component - 手动输入命中率
function AccuracyInput({ value, onChange }: { 
  value: number; 
  onChange: (val: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min="0"
        max="100"
        className="h-9 w-20"
      />
      <span className="text-sm text-gray-500">%</span>
    </div>
  );
}

// Activity options based on hub status
const ACTIVITY_OPTIONS_HUB_ACTIVE = [
  { value: 'scoring', label: '正在得分' },
  { value: 'loading', label: '正在装载燃料' },
  { value: 'defending', label: '正在防守' },
  { value: 'moving', label: '正在移动' },
  { value: 'climb_prep', label: '准备攀爬' },
  { value: 'broken', label: '机器人故障' },
];

const ACTIVITY_OPTIONS_HUB_INACTIVE = [
  { value: 'defending', label: '正在防守' },
  { value: 'loading', label: '正在装载燃料' },
  { value: 'moving', label: '正在移动' },
  { value: 'climb_prep', label: '准备攀爬' },
  { value: 'scoring_opponent', label: '对手枢纽站得分' },
  { value: 'broken', label: '机器人故障' },
];

// Activity options for Endgame phase (includes climb)
const ACTIVITY_OPTIONS_ENDGAME = [
  { value: 'scoring', label: '正在得分' },
  { value: 'loading', label: '正在装载燃料' },
  { value: 'defending', label: '正在防守' },
  { value: 'climbing', label: '正在爬升' },
  { value: 'climb_prep', label: '准备攀爬' },
  { value: 'broken', label: '机器人故障' },
];

// Cycle Card Component
function CycleCard({ 
  title, 
  duration, 
  shots, 
  onShotsChange, 
  accuracy, 
  onAccuracyChange,
  defense,
  onDefenseChange,
  transport,
  onTransportChange,
  hubStatus,
  isHubActive = true,
  color = 'orange'
}: { 
  title: string;
  duration: string;
  shots: number;
  onShotsChange: (val: number) => void;
  accuracy: number;
  onAccuracyChange: (val: number) => void;
  defense: number;
  onDefenseChange: (val: number) => void;
  transport: number;
  onTransportChange: (val: number) => void;
  hubStatus?: string;
  isHubActive?: boolean;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: 'border-orange-200 bg-orange-50',
    blue: 'border-blue-200 bg-blue-50',
    green: 'border-green-200 bg-green-50',
    purple: 'border-purple-200 bg-purple-50',
    yellow: 'border-yellow-200 bg-yellow-50',
  };
  
  const headerClasses: Record<string, string> = {
    orange: 'bg-orange-100 text-orange-800',
    blue: 'bg-blue-100 text-blue-800',
    green: 'bg-green-100 text-green-800',
    purple: 'bg-purple-100 text-purple-800',
    yellow: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className={`border-2 rounded-lg overflow-hidden ${colorClasses[color] || colorClasses.orange}`}>
      {/* 标题栏移到最上方 */}
      <div className={`flex items-center justify-between px-3 py-1.5 ${headerClasses[color] || headerClasses.orange}`}>
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-xs opacity-80">{duration}</span>
      </div>
      {hubStatus && (
        <div className={`text-xs text-center px-2 py-1 ${isHubActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
          {hubStatus} {isHubActive ? '✓' : '✗'}
        </div>
      )}
      <div className="p-3 space-y-2">
        {/* 己方枢纽站激活时显示发射球数、命中率、防守时间 */}
        {isHubActive ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">发射球数</Label>
              <Input
                type="number"
                value={shots}
                onChange={(e) => onShotsChange(parseInt(e.target.value) || 0)}
                min="0"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">命中率(%)</Label>
              <Input
                type="number"
                value={accuracy}
                onChange={(e) => onAccuracyChange(parseInt(e.target.value) || 0)}
                min="0"
                max="100"
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">防守时间(秒)</Label>
              <Input
                type="number"
                value={defense}
                onChange={(e) => onDefenseChange(parseInt(e.target.value) || 0)}
                min="0"
                max={parseInt(duration) || 30}
                className="h-8"
              />
            </div>
          </div>
        ) : (
          /* 己方枢纽站停用时显示防守时间和运球时间 */
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">防守时间(秒)</Label>
              <Input
                type="number"
                value={defense}
                onChange={(e) => onDefenseChange(parseInt(e.target.value) || 0)}
                min="0"
                max={parseInt(duration) || 30}
                className="h-8"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">运球时间(秒)</Label>
              <Input
                type="number"
                value={transport}
                onChange={(e) => onTransportChange(parseInt(e.target.value) || 0)}
                min="0"
                max={parseInt(duration) || 30}
                className="h-8"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Foul Record Dialog Component
function FoulRecordDialog({ 
  fouls, 
  onAdd, 
  onRemove 
}: { 
  fouls: FoulRecord[];
  onAdd: (foul: FoulRecord) => void;
  onRemove: (index: number) => void;
}) {
  const [newFoul, setNewFoul] = useState<FoulRecord>({
    type: 'minor',
    time: '',
    description: ''
  });

  const handleAdd = () => {
    if (newFoul.time && newFoul.description) {
      onAdd(newFoul);
      setNewFoul({ type: 'minor', time: '', description: '' });
    }
  };

  const foulTypeLabels: Record<string, string> = {
    minor: '小犯规',
    major: '大犯规',
    yellow: '黄牌',
    red: '红牌'
  };

  const foulTypeColors: Record<string, string> = {
    minor: 'bg-yellow-100 text-yellow-800',
    major: 'bg-orange-100 text-orange-800',
    yellow: 'bg-yellow-300 text-yellow-900',
    red: 'bg-red-100 text-red-800'
  };

  return (
    <div className="space-y-4">
      {/* Existing fouls */}
      {fouls.length > 0 && (
        <div className="space-y-2">
          {fouls.map((foul, index) => (
            <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
              <Badge className={foulTypeColors[foul.type]}>{foulTypeLabels[foul.type]}</Badge>
              <span className="text-sm">{foul.time}</span>
              <span className="text-sm text-gray-600 flex-1">{foul.description}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-red-500"
                onClick={() => onRemove(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new foul */}
      <div className="grid grid-cols-3 gap-2">
        <Select value={newFoul.type} onValueChange={(v) => setNewFoul({ ...newFoul, type: v as FoulRecord['type'] })}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minor">小犯规</SelectItem>
            <SelectItem value="major">大犯规</SelectItem>
            <SelectItem value="yellow">黄牌</SelectItem>
            <SelectItem value="red">红牌</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="时间 (如: 1:30)"
          value={newFoul.time}
          onChange={(e) => setNewFoul({ ...newFoul, time: e.target.value })}
          className="h-8"
        />
        <Input
          placeholder="描述"
          value={newFoul.description}
          onChange={(e) => setNewFoul({ ...newFoul, description: e.target.value })}
          className="h-8"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        disabled={!newFoul.time || !newFoul.description}
      >
        <Plus className="w-4 h-4 mr-1" /> 添加犯规
      </Button>
    </div>
  );
}

// Rating Slider Component - 以0.2为单位
function RatingSlider({ 
  label, 
  value, 
  onChange, 
  icon: Icon,
  color = 'orange'
}: { 
  label: string;
  value: number;
  onChange: (val: number) => void;
  icon?: React.ComponentType<{ className?: string }>;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    orange: '[&_[role=slider]]:bg-orange-500',
    blue: '[&_[role=slider]]:bg-blue-500',
    green: '[&_[role=slider]]:bg-green-500',
    purple: '[&_[role=slider]]:bg-purple-500',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-gray-500" />}
          {label}
        </Label>
        <span className="font-bold text-lg">{value.toFixed(1)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([val]) => onChange(val)}
        min={1}
        max={10}
        step={0.2}
        className={colorClasses[color] || colorClasses.orange}
      />
    </div>
  );
}

// Login Component
function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { setUser, setToken, setTeams, setMatches, setScoutingRecords, setTeamStats } = useAppStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await api.fetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      setUser(data.user);
      setToken(data.token);

      // Load initial data
      const [teams, matches, records, stats] = await Promise.all([
        api.fetch('/teams', {}, data.token),
        api.fetch('/matches', {}, data.token),
        api.fetch('/scouting', {}, data.token),
        api.fetch('/stats', {}, data.token),
      ]);
      setTeams(teams);
      setMatches(matches);
      setScoutingRecords(records);
      setTeamStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-blue-600 rounded-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-white" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-blue-600 bg-clip-text text-transparent">
              FRC 2026 REBUILT
            </CardTitle>
            <CardDescription className="text-lg font-semibold mt-1">
              Scouting System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="输入用户名"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
              disabled={loading}
            >
              {loading ? '登录中...' : '登录'}
            </Button>
            <p className="text-center text-sm text-gray-500">
              预览账号: 预览账号 / 6353
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// New Record Page Component
function NewRecordPage() {
  const { token, user } = useAppStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Match info
  const [matchNumber, setMatchNumber] = useState('');
  const [teamNumber, setTeamNumber] = useState('');
  const [alliance, setAlliance] = useState('');
  const [scoutName, setScoutName] = useState('');
  const [robotType, setRobotType] = useState(''); // New field

  // Auto phase
  const [autoLeftStartLine, setAutoLeftStartLine] = useState(false);
  const [autoFuelShots, setAutoFuelShots] = useState(0);
  const [autoFuelAccuracy, setAutoFuelAccuracy] = useState(50);
  const [autoClimbLevel, setAutoClimbLevel] = useState(0);
  const [autoWon, setAutoWon] = useState(false);

  // Teleop cycles
  const [teleopTransitionShots, setTeleopTransitionShots] = useState(0);
  const [teleopTransitionAccuracy, setTeleopTransitionAccuracy] = useState(50);
  const [teleopTransitionDefense, setTeleopTransitionDefense] = useState(0);
  const [teleopTransitionTransport, setTeleopTransitionTransport] = useState(0);

  const [teleopShift1Shots, setTeleopShift1Shots] = useState(0);
  const [teleopShift1Accuracy, setTeleopShift1Accuracy] = useState(50);
  const [teleopShift1Defense, setTeleopShift1Defense] = useState(0);
  const [teleopShift1Transport, setTeleopShift1Transport] = useState(0);

  const [teleopShift2Shots, setTeleopShift2Shots] = useState(0);
  const [teleopShift2Accuracy, setTeleopShift2Accuracy] = useState(50);
  const [teleopShift2Defense, setTeleopShift2Defense] = useState(0);
  const [teleopShift2Transport, setTeleopShift2Transport] = useState(0);

  const [teleopShift3Shots, setTeleopShift3Shots] = useState(0);
  const [teleopShift3Accuracy, setTeleopShift3Accuracy] = useState(50);
  const [teleopShift3Defense, setTeleopShift3Defense] = useState(0);
  const [teleopShift3Transport, setTeleopShift3Transport] = useState(0);

  const [teleopShift4Shots, setTeleopShift4Shots] = useState(0);
  const [teleopShift4Accuracy, setTeleopShift4Accuracy] = useState(50);
  const [teleopShift4Defense, setTeleopShift4Defense] = useState(0);
  const [teleopShift4Transport, setTeleopShift4Transport] = useState(0);

  const [teleopEndgameShots, setTeleopEndgameShots] = useState(0);
  const [teleopEndgameAccuracy, setTeleopEndgameAccuracy] = useState(50);

  // Climbing
  const [teleopClimbLevel, setTeleopClimbLevel] = useState(0);
  const [teleopClimbTime, setTeleopClimbTime] = useState(0);

  // Fouls
  const [fouls, setFouls] = useState<FoulRecord[]>([]);
  const [foulNotes, setFoulNotes] = useState('');

  // Ratings - 以0.2为单位
  const [driverRating, setDriverRating] = useState(5.0);
  const [defenseRating, setDefenseRating] = useState(5.0);

  // Issues
  const [wasDisabled, setWasDisabled] = useState(false);
  const [disabledDuration, setDisabledDuration] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  // Calculate estimated score
  const estimatedAutoScore = autoFuelShots * autoFuelAccuracy / 100 + 
    (autoClimbLevel === 1 ? 15 : autoClimbLevel === 2 ? 20 : autoClimbLevel === 3 ? 30 : 0);
  
  const estimatedTeleopScore = 
    teleopTransitionShots * teleopTransitionAccuracy / 100 +
    teleopShift1Shots * teleopShift1Accuracy / 100 +
    teleopShift2Shots * teleopShift2Accuracy / 100 +
    teleopShift3Shots * teleopShift3Accuracy / 100 +
    teleopShift4Shots * teleopShift4Accuracy / 100 +
    teleopEndgameShots * teleopEndgameAccuracy / 100 +
    (teleopClimbLevel === 1 ? 10 : teleopClimbLevel === 2 ? 20 : teleopClimbLevel === 3 ? 30 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchNumber || !teamNumber || !alliance) {
      toast({ title: '请填写比赛编号、队伍编号和联盟颜色', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await api.fetch('/scouting', {
        method: 'POST',
        body: JSON.stringify({
          userId: user?.id,
          teamNumber: parseInt(teamNumber),
          matchNumber: parseInt(matchNumber),
          alliance,
          scoutName,
          robotType,
          autoLeftStartLine,
          autoFuelShots,
          autoFuelAccuracy,
          autoClimbLevel,
          autoWon,
          teleopTransitionShots,
          teleopTransitionAccuracy,
          teleopTransitionDefense,
          teleopTransitionTransport,
          teleopShift1Shots,
          teleopShift1Accuracy,
          teleopShift1Defense,
          teleopShift1Transport,
          teleopShift2Shots,
          teleopShift2Accuracy,
          teleopShift2Defense,
          teleopShift2Transport,
          teleopShift3Shots,
          teleopShift3Accuracy,
          teleopShift3Defense,
          teleopShift3Transport,
          teleopShift4Shots,
          teleopShift4Accuracy,
          teleopShift4Defense,
          teleopShift4Transport,
          teleopEndgameShots,
          teleopEndgameAccuracy,
          teleopClimbLevel,
          teleopClimbTime,
          minorFouls: fouls.filter(f => f.type === 'minor').length,
          majorFouls: fouls.filter(f => f.type === 'major').length,
          yellowCard: fouls.some(f => f.type === 'yellow'),
          redCard: fouls.some(f => f.type === 'red'),
          foulRecords: JSON.stringify(fouls),
          foulNotes,
          driverRating,
          defenseRating,
          wasDisabled,
          disabledDuration,
          notes
        }),
      }, token);

      // Refresh data
      const [records, stats] = await Promise.all([
        api.fetch('/scouting', {}, token),
        api.fetch('/stats', {}, token),
      ]);
      useAppStore.getState().setScoutingRecords(records);
      useAppStore.getState().setTeamStats(stats);

      toast({ title: '记录保存成功!' });
      
      // Reset all form fields
      setMatchNumber('');
      setTeamNumber('');
      setAlliance('');
      setScoutName('');
      setRobotType('');
      setAutoLeftStartLine(false);
      setAutoFuelShots(0);
      setAutoFuelAccuracy(50);
      setAutoClimbLevel(0);
      setAutoWon(false);
      setTeleopTransitionShots(0);
      setTeleopTransitionAccuracy(50);
      setTeleopTransitionDefense(0);
      setTeleopTransitionTransport(0);
      setTeleopShift1Shots(0);
      setTeleopShift1Accuracy(50);
      setTeleopShift1Defense(0);
      setTeleopShift1Transport(0);
      setTeleopShift2Shots(0);
      setTeleopShift2Accuracy(50);
      setTeleopShift2Defense(0);
      setTeleopShift2Transport(0);
      setTeleopShift3Shots(0);
      setTeleopShift3Accuracy(50);
      setTeleopShift3Defense(0);
      setTeleopShift3Transport(0);
      setTeleopShift4Shots(0);
      setTeleopShift4Accuracy(50);
      setTeleopShift4Defense(0);
      setTeleopShift4Transport(0);
      setTeleopEndgameShots(0);
      setTeleopEndgameAccuracy(50);
      setTeleopClimbLevel(0);
      setTeleopClimbTime(0);
      setFouls([]);
      setFoulNotes('');
      setDriverRating(5.0);
      setDefenseRating(5.0);
      setWasDisabled(false);
      setDisabledDuration('');
      setNotes('');
    } catch (err) {
      toast({
        title: '保存失败',
        description: err instanceof Error ? err.message : '未知错误',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Match Info */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileEdit className="w-5 h-5" />
            比赛信息
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>比赛编号</Label>
              <Input
                type="number"
                value={matchNumber}
                onChange={(e) => setMatchNumber(e.target.value)}
                placeholder="例: 1"
              />
            </div>
            <div className="space-y-2">
              <Label>队伍编号</Label>
              <Input
                type="number"
                value={teamNumber}
                onChange={(e) => setTeamNumber(e.target.value)}
                placeholder="例: 6353"
              />
            </div>
            <div className="space-y-2">
              <Label>联盟</Label>
              <Select value={alliance} onValueChange={setAlliance}>
                <SelectTrigger>
                  <SelectValue placeholder="选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="RED">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      红色联盟
                    </div>
                  </SelectItem>
                  <SelectItem value="BLUE">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      蓝色联盟
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>情报员</Label>
              <Input
                value={scoutName}
                onChange={(e) => setScoutName(e.target.value)}
                placeholder="记录者姓名"
              />
            </div>
            <div className="space-y-2">
              <Label>车辆类型</Label>
              <Select value={robotType} onValueChange={setRobotType}>
                <SelectTrigger>
                  <SelectValue placeholder="选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bump">Bump</SelectItem>
                  <SelectItem value="trench">Trench</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="bump_heavy">Bump略多</SelectItem>
                  <SelectItem value="trench_heavy">Trench略多</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto Phase */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5" />
            自动阶段 (20秒)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoLeave"
                checked={autoLeftStartLine}
                onCheckedChange={(checked) => setAutoLeftStartLine(checked as boolean)}
              />
              <Label htmlFor="autoLeave" className="cursor-pointer">离开起始线</Label>
            </div>
            <div className="space-y-2">
              <Label>发射球数</Label>
              <Input
                type="number"
                value={autoFuelShots}
                onChange={(e) => setAutoFuelShots(parseInt(e.target.value) || 0)}
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label>命中率</Label>
              <AccuracyInput value={autoFuelAccuracy} onChange={setAutoFuelAccuracy} />
            </div>
            <div className="space-y-2">
              <Label>攀爬等级</Label>
              <Select value={autoClimbLevel.toString()} onValueChange={(v) => setAutoClimbLevel(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">无</SelectItem>
                  <SelectItem value="1">Level 1 (15分)</SelectItem>
                  <SelectItem value="2">Level 2 (20分)</SelectItem>
                  <SelectItem value="3">Level 3 (30分)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="autoWon"
              checked={autoWon}
              onCheckedChange={(checked) => setAutoWon(checked as boolean)}
            />
            <Label htmlFor="autoWon" className="cursor-pointer">自动阶段得分占优（影响枢纽站激活）</Label>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600 bg-yellow-50 p-3 rounded">
            <Target className="w-4 h-4" />
            <span>预计自动阶段得分: <strong>{Math.round(estimatedAutoScore)}</strong> 分</span>
          </div>
        </CardContent>
      </Card>

      {/* Teleop Cycles */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5" />
            手动阶段 (2分10秒)
          </CardTitle>
          <CardDescription className="text-green-100 text-xs">
            根据FRC 2026规则，枢纽站状态随周期切换
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CycleCard
              title="过渡阶段"
              duration="10秒"
              shots={teleopTransitionShots}
              onShotsChange={setTeleopTransitionShots}
              accuracy={teleopTransitionAccuracy}
              onAccuracyChange={setTeleopTransitionAccuracy}
              defense={teleopTransitionDefense}
              onDefenseChange={setTeleopTransitionDefense}
              transport={teleopTransitionTransport}
              onTransportChange={setTeleopTransitionTransport}
              hubStatus="双方枢纽站都激活"
              isHubActive={true}
              color="purple"
            />
            <CycleCard
              title="切换 1"
              duration="25秒"
              shots={teleopShift1Shots}
              onShotsChange={setTeleopShift1Shots}
              accuracy={teleopShift1Accuracy}
              onAccuracyChange={setTeleopShift1Accuracy}
              defense={teleopShift1Defense}
              onDefenseChange={setTeleopShift1Defense}
              transport={teleopShift1Transport}
              onTransportChange={setTeleopShift1Transport}
              hubStatus={autoWon ? "己方枢纽站停用" : "己方枢纽站激活"}
              isHubActive={!autoWon}
              color="orange"
            />
            <CycleCard
              title="切换 2"
              duration="25秒"
              shots={teleopShift2Shots}
              onShotsChange={setTeleopShift2Shots}
              accuracy={teleopShift2Accuracy}
              onAccuracyChange={setTeleopShift2Accuracy}
              defense={teleopShift2Defense}
              onDefenseChange={setTeleopShift2Defense}
              transport={teleopShift2Transport}
              onTransportChange={setTeleopShift2Transport}
              hubStatus={autoWon ? "己方枢纽站激活" : "己方枢纽站停用"}
              isHubActive={autoWon}
              color="blue"
            />
            <CycleCard
              title="切换 3"
              duration="25秒"
              shots={teleopShift3Shots}
              onShotsChange={setTeleopShift3Shots}
              accuracy={teleopShift3Accuracy}
              onAccuracyChange={setTeleopShift3Accuracy}
              defense={teleopShift3Defense}
              onDefenseChange={setTeleopShift3Defense}
              transport={teleopShift3Transport}
              onTransportChange={setTeleopShift3Transport}
              hubStatus={autoWon ? "己方枢纽站停用" : "己方枢纽站激活"}
              isHubActive={!autoWon}
              color="orange"
            />
            <CycleCard
              title="切换 4"
              duration="25秒"
              shots={teleopShift4Shots}
              onShotsChange={setTeleopShift4Shots}
              accuracy={teleopShift4Accuracy}
              onAccuracyChange={setTeleopShift4Accuracy}
              defense={teleopShift4Defense}
              onDefenseChange={setTeleopShift4Defense}
              transport={teleopShift4Transport}
              onTransportChange={setTeleopShift4Transport}
              hubStatus={autoWon ? "己方枢纽站激活" : "己方枢纽站停用"}
              isHubActive={autoWon}
              color="blue"
            />
            <CycleCard
              title="最终阶段"
              duration="30秒"
              shots={teleopEndgameShots}
              onShotsChange={setTeleopEndgameShots}
              accuracy={teleopEndgameAccuracy}
              onAccuracyChange={setTeleopEndgameAccuracy}
              defense={0}
              onDefenseChange={() => {}}
              transport={0}
              onTransportChange={() => {}}
              hubStatus="双方枢纽站都激活"
              isHubActive={true}
              color="green"
            />
          </div>

          <Separator className="my-4" />

          {/* Climbing */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>攀爬等级</Label>
              <Select value={teleopClimbLevel.toString()} onValueChange={(v) => setTeleopClimbLevel(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">无</SelectItem>
                  <SelectItem value="1">Level 1 (10分)</SelectItem>
                  <SelectItem value="2">Level 2 (20分)</SelectItem>
                  <SelectItem value="3">Level 3 (30分)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>攀爬时间(秒)</Label>
              <Input
                type="number"
                value={teleopClimbTime}
                onChange={(e) => setTeleopClimbTime(parseInt(e.target.value) || 0)}
                min="0"
                max="30"
              />
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600 bg-green-50 p-3 rounded">
              <Target className="w-4 h-4" />
              <span>预计手动阶段得分: <strong>{Math.round(estimatedTeleopScore)}</strong> 分</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fouls */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5" />
            犯规记录
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <FoulRecordDialog
            fouls={fouls}
            onAdd={(foul) => setFouls([...fouls, foul])}
            onRemove={(index) => setFouls(fouls.filter((_, i) => i !== index))}
          />
          <div className="space-y-2">
            <Label>犯规备注</Label>
            <Textarea
              value={foulNotes}
              onChange={(e) => setFoulNotes(e.target.value)}
              placeholder="其他犯规相关备注..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ratings */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Gauge className="w-5 h-5" />
            综合评分
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <RatingSlider
              label="Driver能力"
              value={driverRating}
              onChange={setDriverRating}
              icon={Activity}
              color="orange"
            />
            <RatingSlider
              label="防守能力"
              value={defenseRating}
              onChange={setDefenseRating}
              icon={Shield}
              color="blue"
            />
          </div>
        </CardContent>
      </Card>

      {/* Issues & Notes */}
      <Card className="shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-600 to-gray-700 text-white p-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertCircle className="w-5 h-5" />
            问题与备注
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="flex items-center space-x-2">
              <Switch
                checked={wasDisabled}
                onCheckedChange={setWasDisabled}
              />
              <Label>是否宕机</Label>
            </div>
            {wasDisabled && (
              <div className="space-y-2">
                <Label>宕机时长</Label>
                <Select value={disabledDuration} onValueChange={setDisabledDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5s">5秒</SelectItem>
                    <SelectItem value="10s">10秒</SelectItem>
                    <SelectItem value="20s">20秒</SelectItem>
                    <SelectItem value="30s+">30秒以上</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>备注</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="记录队伍特点、问题、建议等..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex gap-4">
        <Button
          type="submit"
          className="flex-1 h-12 text-lg bg-gradient-to-r from-orange-500 to-blue-600 hover:from-orange-600 hover:to-blue-700"
          disabled={loading}
        >
          {loading ? '保存中...' : '保存记录'}
        </Button>
      </div>
    </form>
  );
}

// Data List Page Component
function DataListPage() {
  const { scoutingRecords, token, teamStats } = useAppStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<ScoutingRecord | null>(null);
  const itemsPerPage = 15;

  const filteredRecords = scoutingRecords.filter(record =>
    record.team.teamNumber.toString().includes(searchTerm) ||
    record.match.matchNumber.toString().includes(searchTerm) ||
    record.scoutName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此记录吗？')) return;
    try {
      await api.fetch(`/scouting?id=${id}`, { method: 'DELETE' }, token);
      const records = await api.fetch('/scouting', {}, token);
      useAppStore.getState().setScoutingRecords(records);
      toast({ title: '记录已删除' });
    } catch (err) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="搜索队伍/比赛..."
            className="pl-9"
          />
        </div>
        <div className="text-sm text-gray-500">
          共 {filteredRecords.length} 条记录
        </div>
      </div>

      {/* Records Table */}
      <Card className="shadow-lg">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50">
                <TableRow>
                  <TableHead className="w-20">比赛</TableHead>
                  <TableHead className="w-24">队伍</TableHead>
                  <TableHead className="w-20">联盟</TableHead>
                  <TableHead className="w-24">情报员</TableHead>
                  <TableHead className="w-20">自动</TableHead>
                  <TableHead className="w-20">手动</TableHead>
                  <TableHead className="w-20">总分</TableHead>
                  <TableHead className="w-24">Driver</TableHead>
                  <TableHead className="w-24">防守</TableHead>
                  <TableHead className="w-20">宕机</TableHead>
                  <TableHead className="w-32">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-gray-400 py-8">
                      暂无记录
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => (
                    <TableRow 
                      key={record.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <TableCell className="font-medium">Q{record.match.matchNumber}</TableCell>
                      <TableCell>{record.team.teamNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={record.alliance === 'RED'
                            ? 'border-red-500 text-red-600 bg-red-50'
                            : 'border-blue-500 text-blue-600 bg-blue-50'
                          }
                        >
                          {record.alliance === 'RED' ? '红' : '蓝'}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.scoutName || '-'}</TableCell>
                      <TableCell>{record.autoScore}</TableCell>
                      <TableCell>{record.teleopScore}</TableCell>
                      <TableCell className="font-bold">{record.totalScore}</TableCell>
                      <TableCell>{record.driverRating}/10</TableCell>
                      <TableCell>{record.defenseRating}/10</TableCell>
                      <TableCell>
                        {record.wasDisabled && (
                          <Badge variant="destructive" className="text-xs">
                            {record.disabledDuration}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(record.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            上一页
          </Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  className="w-8 h-8 p-0"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="px-2">...</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            下一页
          </Button>
        </div>
      )}

      {/* Record Detail Dialog */}
      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              记录详情 - Q{selectedRecord?.match.matchNumber} / {selectedRecord?.team.teamNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">自动得分</div>
                  <div className="text-xl font-bold text-orange-600">{selectedRecord.autoScore}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">手动得分</div>
                  <div className="text-xl font-bold text-green-600">{selectedRecord.teleopScore}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">总分</div>
                  <div className="text-xl font-bold text-blue-600">{selectedRecord.totalScore}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-500">情报员</div>
                  <div className="text-lg font-semibold">{selectedRecord.scoutName || '-'}</div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div><strong>自动离开起始线:</strong> {selectedRecord.autoLeftStartLine ? '是' : '否'}</div>
                <div><strong>自动发射球数:</strong> {selectedRecord.autoFuelShots}</div>
                <div><strong>自动命中率:</strong> {selectedRecord.autoFuelAccuracy}%</div>
                <div><strong>自动攀爬:</strong> Level {selectedRecord.autoClimbLevel}</div>
                <div><strong>手动攀爬:</strong> Level {selectedRecord.teleopClimbLevel}</div>
                <div><strong>攀爬时间:</strong> {selectedRecord.teleopClimbTime}秒</div>
              </div>

              <Separator />

              <div className="text-sm">
                <strong>各周期发射:</strong>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
                  <div className="bg-purple-50 p-2 rounded text-center">
                    <div className="text-xs text-gray-500">过渡</div>
                    <div>{selectedRecord.teleopTransitionShots}球</div>
                    <div className="text-xs">{selectedRecord.teleopTransitionAccuracy}%</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded text-center">
                    <div className="text-xs text-gray-500">切换1</div>
                    <div>{selectedRecord.teleopShift1Shots}球</div>
                    <div className="text-xs">{selectedRecord.teleopShift1Accuracy}%</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <div className="text-xs text-gray-500">切换2</div>
                    <div>{selectedRecord.teleopShift2Shots}球</div>
                    <div className="text-xs">{selectedRecord.teleopShift2Accuracy}%</div>
                  </div>
                  <div className="bg-orange-50 p-2 rounded text-center">
                    <div className="text-xs text-gray-500">切换3</div>
                    <div>{selectedRecord.teleopShift3Shots}球</div>
                    <div className="text-xs">{selectedRecord.teleopShift3Accuracy}%</div>
                  </div>
                  <div className="bg-blue-50 p-2 rounded text-center">
                    <div className="text-xs text-gray-500">切换4</div>
                    <div>{selectedRecord.teleopShift4Shots}球</div>
                    <div className="text-xs">{selectedRecord.teleopShift4Accuracy}%</div>
                  </div>
                  <div className="bg-green-50 p-2 rounded text-center">
                    <div className="text-xs text-gray-500">最终</div>
                    <div>{selectedRecord.teleopEndgameShots}球</div>
                    <div className="text-xs">{selectedRecord.teleopEndgameAccuracy}%</div>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <strong>评分:</strong>
                  <div className="text-sm space-y-1">
                    <div>Driver能力: {selectedRecord.driverRating}/10</div>
                    <div>防守能力: {selectedRecord.defenseRating}/10</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <strong>犯规:</strong>
                  <div className="text-sm">
                    <div>小犯规: {selectedRecord.minorFouls}, 大犯规: {selectedRecord.majorFouls}</div>
                    {selectedRecord.yellowCard && <Badge className="bg-yellow-400 text-xs mr-1">黄牌</Badge>}
                    {selectedRecord.redCard && <Badge className="bg-red-500 text-xs">红牌</Badge>}
                  </div>
                </div>
              </div>

              {selectedRecord.notes && (
                <>
                  <Separator />
                  <div>
                    <strong>备注:</strong>
                    <p className="text-sm text-gray-600 mt-1">{selectedRecord.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Team Data Page Component  
function TeamDataPage() {
  const { teamStats, token } = useAppStore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof TeamStats>('avgTotalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);

  const filteredStats = teamStats
    .filter((team) =>
      team.teamNumber.toString().includes(searchTerm) ||
      (team.nickname?.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      const aVal = a[sortField] ?? 0;
      const bVal = b[sortField] ?? 0;
      return sortDirection === 'asc' ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

  const handleSort = (field: keyof TeamStats) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Team List */}
      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                队伍数据
              </CardTitle>
              <CardDescription className="text-blue-100">
                共 {teamStats.length} 支队伍
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索队伍..."
                className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-320px)]">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50">
                <TableRow>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('teamNumber')}
                  >
                    队伍 {sortField === 'teamNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('matchCount')}
                  >
                    场次 {sortField === 'matchCount' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('avgTotalScore')}
                  >
                    均分 {sortField === 'avgTotalScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('avgDriverRating')}
                  >
                    Driver {sortField === 'avgDriverRating' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('avgDefenseRating')}
                  >
                    防守 {sortField === 'avgDefenseRating' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStats.map((team, index) => (
                    <TableRow
                      key={team.teamId}
                      className={`cursor-pointer hover:bg-blue-50 ${selectedTeam?.teamId === team.teamId ? 'bg-blue-100' : ''}`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {index < 3 && (
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                              }`}>
                              {index + 1}
                            </div>
                          )}
                          <div>
                            <div className="font-bold">{team.teamNumber}</div>
                            {team.nickname && (
                              <div className="text-xs text-gray-500">{team.nickname}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{team.matchCount}</TableCell>
                      <TableCell className="font-bold text-lg">{team.avgTotalScore}</TableCell>
                      <TableCell>{team.avgDriverRating}</TableCell>
                      <TableCell>{team.avgDefenseRating}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Team Details */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            队伍详情
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {selectedTeam ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-3xl font-bold">{selectedTeam.teamNumber}</h3>
                {selectedTeam.nickname && (
                  <p className="text-gray-500">{selectedTeam.nickname}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{selectedTeam.avgTotalScore}</div>
                  <div className="text-sm text-gray-500">平均总分</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedTeam.matchCount}</div>
                  <div className="text-sm text-gray-500">比赛场次</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedTeam.avgAutoScore}</div>
                  <div className="text-sm text-gray-500">自动均分</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{selectedTeam.avgTeleopScore}</div>
                  <div className="text-sm text-gray-500">手动均分</div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">自动能力</span>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedTeam.autoCapability * 10} className="w-24 h-2" />
                    <span className="font-semibold">{selectedTeam.autoCapability}/10</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">燃料效率</span>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedTeam.fuelEfficiency * 10} className="w-24 h-2" />
                    <span className="font-semibold">{selectedTeam.fuelEfficiency}/10</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">攀爬能力</span>
                  <div className="flex items-center gap-2">
                    <Progress value={selectedTeam.climbCapability * 10} className="w-24 h-2" />
                    <span className="font-semibold">{selectedTeam.climbCapability}/10</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">攀爬成功率</span>
                  <span className="font-semibold">{selectedTeam.climbSuccessRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">自动离线率</span>
                  <span className="font-semibold">{selectedTeam.autoLeaveRate}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">平均Driver评分</span>
                  <span className="font-semibold">{selectedTeam.avgDriverRating}/10</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">平均防守评分</span>
                  <span className="font-semibold">{selectedTeam.avgDefenseRating}/10</span>
                </div>
              </div>

              {selectedTeam.cycleStats && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-semibold mb-3">各周期表现</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-purple-50 p-2 rounded text-center">
                        <div className="text-gray-500">过渡</div>
                        <div>{selectedTeam.cycleStats.transition.avgShots}球</div>
                        <div className="text-gray-400">{selectedTeam.cycleStats.transition.avgAccuracy}%</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="text-gray-500">切换1</div>
                        <div>{selectedTeam.cycleStats.shift1.avgShots}球</div>
                        <div className="text-gray-400">{selectedTeam.cycleStats.shift1.avgAccuracy}%</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="text-gray-500">切换2</div>
                        <div>{selectedTeam.cycleStats.shift2.avgShots}球</div>
                        <div className="text-gray-400">{selectedTeam.cycleStats.shift2.avgAccuracy}%</div>
                      </div>
                      <div className="bg-orange-50 p-2 rounded text-center">
                        <div className="text-gray-500">切换3</div>
                        <div>{selectedTeam.cycleStats.shift3.avgShots}球</div>
                        <div className="text-gray-400">{selectedTeam.cycleStats.shift3.avgAccuracy}%</div>
                      </div>
                      <div className="bg-blue-50 p-2 rounded text-center">
                        <div className="text-gray-500">切换4</div>
                        <div>{selectedTeam.cycleStats.shift4.avgShots}球</div>
                        <div className="text-gray-400">{selectedTeam.cycleStats.shift4.avgAccuracy}%</div>
                      </div>
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="text-gray-500">最终</div>
                        <div>{selectedTeam.cycleStats.endgame.avgShots}球</div>
                        <div className="text-gray-400">{selectedTeam.cycleStats.endgame.avgAccuracy}%</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>点击左侧队伍查看详情</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Analytics Page Component
function AnalyticsPage() {
  const { teamStats, scoutingRecords } = useAppStore();
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  // Top teams
  const topTeams = [...teamStats]
    .sort((a, b) => b.avgTotalScore - a.avgTotalScore)
    .slice(0, 10);

  // Selected team stats
  const selectedTeamStats = teamStats.find(t => t.teamId === selectedTeamId);

  // Alliance recommendations
  const recommendations = {
    topScorers: [...teamStats].sort((a, b) => b.avgTotalScore - a.avgTotalScore).slice(0, 5),
    topClimbers: [...teamStats].sort((a, b) => b.climbCapability - a.climbCapability).slice(0, 5),
    topDrivers: [...teamStats].sort((a, b) => b.avgDriverRating - a.avgDriverRating).slice(0, 5),
    topDefense: [...teamStats].sort((a, b) => b.avgDefenseRating - a.avgDefenseRating).slice(0, 5),
  };

  // Comparison data
  const comparisonTeams = teamStats.filter(t => selectedTeamIds.includes(t.teamId));

  // Cycle heatmap data
  const heatmapData = teamStats.slice(0, 10).map(team => ({
    name: team.teamNumber.toString(),
    transition: team.cycleStats?.transition.avgShots || 0,
    shift1: team.cycleStats?.shift1.avgShots || 0,
    shift2: team.cycleStats?.shift2.avgShots || 0,
    shift3: team.cycleStats?.shift3.avgShots || 0,
    shift4: team.cycleStats?.shift4.avgShots || 0,
    endgame: team.cycleStats?.endgame.avgShots || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Team Rankings */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-orange-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            队伍排名 (前10)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={topTeams} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="teamNumber" type="category" width={60} />
                <Tooltip
                  formatter={(value: number, name: string) => [value.toFixed(1), name === 'avgTotalScore' ? '平均总分' : name]}
                  labelFormatter={(label) => `队伍 ${label}`}
                />
                <Legend />
                <Bar dataKey="avgTotalScore" name="平均总分" fill="#f97316" />
                <Bar dataKey="avgAutoScore" name="自动均分" fill="#3b82f6" />
                <Bar dataKey="avgTeleopScore" name="手动均分" fill="#10b981" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Score Trend and Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                得分趋势
              </CardTitle>
              <Select value={selectedTeamId || ''} onValueChange={setSelectedTeamId}>
                <SelectTrigger className="w-40 bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="选择队伍" />
                </SelectTrigger>
                <SelectContent>
                  {teamStats.map(team => (
                    <SelectItem key={team.teamId} value={team.teamId}>
                      {team.teamNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {selectedTeamStats ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={selectedTeamStats.scoresByMatch || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="matchNumber" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="totalScore" name="总分" stroke="#f97316" strokeWidth={2} />
                    <Line type="monotone" dataKey="autoScore" name="自动" stroke="#3b82f6" />
                    <Line type="monotone" dataKey="teleopScore" name="手动" stroke="#10b981" />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                请选择一个队伍查看得分趋势
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              能力雷达图
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {selectedTeamStats ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={[
                    { subject: '自动能力', value: selectedTeamStats.autoCapability, fullMark: 10 },
                    { subject: '燃料效率', value: selectedTeamStats.fuelEfficiency, fullMark: 10 },
                    { subject: '攀爬能力', value: selectedTeamStats.climbCapability, fullMark: 10 },
                    { subject: '攀爬成功', value: selectedTeamStats.climbSuccessRate / 10, fullMark: 10 },
                    { subject: 'Driver', value: selectedTeamStats.avgDriverRating, fullMark: 10 },
                    { subject: '防守', value: selectedTeamStats.avgDefenseRating, fullMark: 10 },
                  ]}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis angle={30} domain={[0, 10]} />
                    <Radar name={selectedTeamStats.teamNumber.toString()} dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.5} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400">
                请选择一个队伍查看能力雷达图
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cycle Heatmap */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            各周期发射热力图 (前10队伍)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={heatmapData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="transition" name="过渡" fill="#a855f7" />
                <Bar dataKey="shift1" name="切换1" fill="#f97316" />
                <Bar dataKey="shift2" name="切换2" fill="#3b82f6" />
                <Bar dataKey="shift3" name="切换3" fill="#f97316" />
                <Bar dataKey="shift4" name="切换4" fill="#3b82f6" />
                <Bar dataKey="endgame" name="最终" fill="#10b981" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Alliance Recommendations */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            联盟选择建议
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-500" />
                得分之王
              </h4>
              <div className="space-y-2">
                {recommendations.topScorers.map((team, index) => (
                  <div key={team.teamId} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                      }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{team.teamNumber}</div>
                      <div className="text-xs text-gray-500">均分: {team.avgTotalScore}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-500" />
                攀爬专家
              </h4>
              <div className="space-y-2">
                {recommendations.topClimbers.map((team, index) => (
                  <div key={team.teamId} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                      }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{team.teamNumber}</div>
                      <div className="text-xs text-gray-500">成功率: {team.climbSuccessRate}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                最佳Driver
              </h4>
              <div className="space-y-2">
                {recommendations.topDrivers.map((team, index) => (
                  <div key={team.teamId} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                      }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{team.teamNumber}</div>
                      <div className="text-xs text-gray-500">评分: {team.avgDriverRating}/10</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" />
                防守专家
              </h4>
              <div className="space-y-2">
                {recommendations.topDefense.map((team, index) => (
                  <div key={team.teamId} className="flex items-center gap-3 p-2 bg-gray-50 rounded">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                      }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{team.teamNumber}</div>
                      <div className="text-xs text-gray-500">评分: {team.avgDefenseRating}/10</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Admin Page Component
function AdminPage() {
  const { token, user } = useAppStore();
  const { toast } = useToast();
  const [users, setUsers] = useState<Array<{
    id: string;
    username: string;
    name: string | null;
    isAdmin: boolean;
    createdAt: string;
    _count?: { scoutingRecords: number };
  }>>([]);
  const [stats, setStats] = useState({ teamCount: 0, matchCount: 0, recordCount: 0 });
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.fetch('/admin', {}, token);
      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      toast({ title: '加载管理数据失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast({ title: '请填写用户名和密码', variant: 'destructive' });
      return;
    }
    try {
      await api.fetch('/admin', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          name: newName,
          isAdmin: newIsAdmin
        })
      }, token);
      toast({ title: '用户创建成功' });
      setNewUsername('');
      setNewPassword('');
      setNewName('');
      setNewIsAdmin(false);
      // Reload data
      const data = await api.fetch('/admin', {}, token);
      setUsers(data.users);
      setStats(data.stats);
    } catch (err) {
      toast({ title: '创建失败', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('确定要删除此用户吗？')) return;
    try {
      await api.fetch(`/admin?userId=${userId}`, { method: 'DELETE' }, token);
      toast({ title: '用户已删除' });
      loadAdminData();
    } catch (err) {
      toast({ title: '删除失败', variant: 'destructive' });
    }
  };

  const handleClearData = async (action: string) => {
    if (!confirm(`确定要执行此操作吗？此操作不可撤销！`)) return;
    try {
      await api.fetch(`/admin?action=${action}`, { method: 'DELETE' }, token);
      toast({ title: '操作成功' });
      loadAdminData();
    } catch (err) {
      toast({ title: '操作失败', variant: 'destructive' });
    }
  };

  if (!user?.isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          您没有管理员权限访问此页面
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Users className="w-10 h-10 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.teamCount}</div>
                <div className="text-sm text-gray-500">队伍数量</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Trophy className="w-10 h-10 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.matchCount}</div>
                <div className="text-sm text-gray-500">比赛数量</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Database className="w-10 h-10 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.recordCount}</div>
                <div className="text-sm text-gray-500">记录数量</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            用户管理
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Add User Form */}
          <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>用户名</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="用户名" />
            </div>
            <div className="space-y-2">
              <Label>密码</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="密码" />
            </div>
            <div className="space-y-2">
              <Label>显示名称</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="显示名称" />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="isAdmin"
                checked={newIsAdmin}
                onCheckedChange={(checked) => setNewIsAdmin(checked as boolean)}
              />
              <Label htmlFor="isAdmin">管理员</Label>
            </div>
            <Button type="submit" className="bg-purple-500 hover:bg-purple-600">
              <Plus className="w-4 h-4 mr-2" /> 添加用户
            </Button>
          </form>

          <Separator />

          {/* Users List */}
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                    {u.isAdmin ? <Shield className="w-5 h-5 text-purple-500" /> : <Users className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <div className="font-medium">{u.username} {u.isAdmin && <Badge className="ml-2 bg-purple-100 text-purple-800">管理员</Badge>}</div>
                    <div className="text-sm text-gray-500">{u.name || '-'} | {u._count?.scoutingRecords || 0} 条记录</div>
                  </div>
                </div>
                {u.username !== '预览账号' && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            数据管理
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Alert className="mb-4 bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              以下操作将永久删除数据，请谨慎操作！
            </AlertDescription>
          </Alert>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleClearData('clear-records')}>
              清空所有记录
            </Button>
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleClearData('clear-teams')}>
              清空所有队伍
            </Button>
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleClearData('clear-matches')}>
              清空所有比赛
            </Button>
            <Button variant="destructive" onClick={() => handleClearData('clear-all')}>
              清空所有数据
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export Page Component
function ExportPage() {
  const { scoutingRecords, teamStats, token } = useAppStore();
  const { toast } = useToast();

  const handleExportCSV = () => {
    const headers = [
      '比赛编号', '队伍编号', '联盟', '情报员',
      '自动得分', '手动得分', '总分',
      '自动发射', '自动命中率', '自动攀爬',
      '过渡发射', '过渡命中率', '过渡防守',
      '切换1发射', '切换1命中率', '切换1防守',
      '切换2发射', '切换2命中率', '切换2防守',
      '切换3发射', '切换3命中率', '切换3防守',
      '切换4发射', '切换4命中率', '切换4防守',
      '最终发射', '最终命中率',
      '攀爬等级', '攀爬时间',
      '小犯规', '大犯规', '黄牌', '红牌',
      'Driver评分', '防守评分',
      '宕机', '宕机时长', '备注'
    ];

    const rows = scoutingRecords.map(r => [
      r.match.matchNumber, r.team.teamNumber, r.alliance, r.scoutName || '',
      r.autoScore, r.teleopScore, r.totalScore,
      r.autoFuelShots, r.autoFuelAccuracy, r.autoClimbLevel,
      r.teleopTransitionShots, r.teleopTransitionAccuracy, r.teleopTransitionDefense,
      r.teleopShift1Shots, r.teleopShift1Accuracy, r.teleopShift1Defense,
      r.teleopShift2Shots, r.teleopShift2Accuracy, r.teleopShift2Defense,
      r.teleopShift3Shots, r.teleopShift3Accuracy, r.teleopShift3Defense,
      r.teleopShift4Shots, r.teleopShift4Accuracy, r.teleopShift4Defense,
      r.teleopEndgameShots, r.teleopEndgameAccuracy,
      r.teleopClimbLevel, r.teleopClimbTime,
      r.minorFouls, r.majorFouls, r.yellowCard ? '是' : '否', r.redCard ? '是' : '否',
      r.driverRating, r.defenseRating,
      r.wasDisabled ? '是' : '否', r.disabledDuration || '', r.notes || ''
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scouting-data-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();

    toast({ title: '导出成功' });
  };

  const handleExportJSON = () => {
    const data = JSON.stringify(scoutingRecords, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `scouting-data-${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    toast({ title: '导出成功' });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            数据导出
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">导出为 CSV</h3>
              <p className="text-sm text-gray-500 mb-4">
                导出为 Excel 兼容的 CSV 格式，包含所有记录的详细数据
              </p>
              <Button onClick={handleExportCSV} className="w-full bg-green-500 hover:bg-green-600">
                <Download className="w-4 h-4 mr-2" /> 导出 CSV
              </Button>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-2">导出为 JSON</h3>
              <p className="text-sm text-gray-500 mb-4">
                导出为 JSON 格式，适合数据分析和系统集成
              </p>
              <Button onClick={handleExportJSON} className="w-full bg-blue-500 hover:bg-blue-600">
                <Download className="w-4 h-4 mr-2" /> 导出 JSON
              </Button>
            </div>
          </div>

          <Separator />

          <div className="text-center text-sm text-gray-500">
            当前共有 {scoutingRecords.length} 条记录，{teamStats.length} 支队伍
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main App Sidebar
function AppSidebar() {
  const { user, logout, activePage, setActivePage } = useAppStore();

  const menuItems = [
    { id: 'new-record', label: '新增记录', icon: Plus },
    { id: 'data-list', label: '数据列表', icon: ClipboardList },
    { id: 'team-data', label: '队伍数据', icon: Users },
    { id: 'analytics', label: '数据分析', icon: BarChart3 },
    { id: 'export', label: '数据导出', icon: Download },
    ...(user?.isAdmin ? [{ id: 'admin', label: '管理员面板', icon: Settings }] : []),
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-blue-600 rounded-lg flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-bold text-lg">FRC 2026</div>
            <div className="text-xs text-gray-500">REBUILT Scouting</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航菜单</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    isActive={activePage === item.id}
                    onClick={() => setActivePage(item.id)}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <div className="font-medium">{user?.username}</div>
            <div className="text-xs text-gray-500">{user?.isAdmin ? '管理员' : '用户'}</div>
          </div>
          <Button variant="ghost" size="icon" onClick={logout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

// Main Dashboard Component
function Dashboard() {
  const { activePage } = useAppStore();

  const renderPage = () => {
    switch (activePage) {
      case 'new-record':
        return <NewRecordPage />;
      case 'data-list':
        return <DataListPage />;
      case 'team-data':
        return <TeamDataPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'export':
        return <ExportPage />;
      case 'admin':
        return <AdminPage />;
      default:
        return <NewRecordPage />;
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'new-record': return '新增比赛记录';
      case 'data-list': return '数据列表';
      case 'team-data': return '队伍数据';
      case 'analytics': return '数据分析';
      case 'export': return '数据导出';
      case 'admin': return '管理员面板';
      default: return '新增比赛记录';
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-white px-6">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
        </header>
        <main className="flex-1 overflow-auto p-6 bg-gray-50">
          {renderPage()}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

// Main App
export default function App() {
  const { isAuthenticated } = useAppStore();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
