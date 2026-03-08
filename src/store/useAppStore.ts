import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  username: string;
  name: string | null;
  isAdmin: boolean;
}

export interface Team {
  id: string;
  teamNumber: number;
  nickname: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  _count?: { scoutingRecords: number };
}

export interface Match {
  id: string;
  matchNumber: number;
  matchType: string;
  _count?: { scoutingRecords: number };
}

export interface FoulRecord {
  type: 'minor' | 'major' | 'yellow' | 'red';
  time: string;
  description: string;
}

export interface ScoutingRecord {
  id: string;
  teamId: string;
  matchId: string;
  userId: string;
  alliance: string;
  scoutName: string | null;
  robotType: string | null; // "bump", "trench", "both", "bump_heavy", "trench_heavy"

  // Autonomous Phase
  autoLeftStartLine: boolean;
  autoFuelShots: number;
  autoFuelAccuracy: number;
  autoClimbLevel: number;

  // Teleop Phase Cycles
  teleopTransitionShots: number;
  teleopTransitionAccuracy: number;
  teleopTransitionDefense: number;
  teleopTransitionTransport: number;
  teleopShift1Shots: number;
  teleopShift1Accuracy: number;
  teleopShift1Defense: number;
  teleopShift1Transport: number;
  teleopShift2Shots: number;
  teleopShift2Accuracy: number;
  teleopShift2Defense: number;
  teleopShift2Transport: number;
  teleopShift3Shots: number;
  teleopShift3Accuracy: number;
  teleopShift3Defense: number;
  teleopShift3Transport: number;
  teleopShift4Shots: number;
  teleopShift4Accuracy: number;
  teleopShift4Defense: number;
  teleopShift4Transport: number;
  teleopEndgameShots: number;
  teleopEndgameAccuracy: number;

  // Climbing
  teleopClimbLevel: number;
  teleopClimbTime: number;

  // Fouls
  minorFouls: number;
  majorFouls: number;
  yellowCard: boolean;
  redCard: boolean;
  foulRecords: string | null;
  foulNotes: string | null;

  // Ratings (1-10, 以0.2为单位)
  driverRating: number;
  defenseRating: number;

  // Issues
  wasDisabled: boolean;
  disabledDuration: string | null;

  // Notes
  notes: string | null;

  // Calculated scores
  autoScore: number;
  teleopScore: number;
  totalScore: number;
  autoWon: boolean;

  // Relations
  team: Team;
  match: Match;
  user?: { username: string; name: string | null };
}

export interface ScoreByMatch {
  matchNumber: number;
  totalScore: number;
  autoScore: number;
  teleopScore: number;
}

export interface CycleStats {
  avgShots: number;
  avgAccuracy: number;
}

export interface TeamCycleStats {
  transition: CycleStats;
  shift1: CycleStats;
  shift2: CycleStats;
  shift3: CycleStats;
  shift4: CycleStats;
  endgame: CycleStats;
}

export interface TeamStats {
  teamId: string;
  teamNumber: number;
  nickname: string | null;
  matchCount: number;
  avgTotalScore: number;
  avgAutoScore: number;
  avgTeleopScore: number;
  avgFuelShots: number;
  climbSuccessRate: number;
  autoLeaveRate: number;
  avgDefenseTime: number;
  avgDriverRating: number;
  avgDefenseRating: number;
  autoCapability: number;
  fuelEfficiency: number;
  climbCapability: number;
  scoresByMatch: ScoreByMatch[];
  cycleStats?: TeamCycleStats;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // UI State
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activePage: string;
  setActivePage: (page: string) => void;

  // Data
  teams: Team[];
  setTeams: (teams: Team[]) => void;
  matches: Match[];
  setMatches: (matches: Match[]) => void;
  scoutingRecords: ScoutingRecord[];
  setScoutingRecords: (records: ScoutingRecord[]) => void;
  teamStats: TeamStats[];
  setTeamStats: (stats: TeamStats[]) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Auth
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      // UI State
      activeTab: 'scouting',
      setActiveTab: (activeTab) => set({ activeTab }),
      activePage: 'new-record',
      setActivePage: (activePage) => set({ activePage }),

      // Data
      teams: [],
      setTeams: (teams) => set({ teams }),
      matches: [],
      setMatches: (matches) => set({ matches }),
      scoutingRecords: [],
      setScoutingRecords: (scoutingRecords) => set({ scoutingRecords }),
      teamStats: [],
      setTeamStats: (teamStats) => set({ teamStats }),
    }),
    {
      name: 'frc-scouting-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        activeTab: state.activeTab,
        activePage: state.activePage
      }),
    }
  )
);
