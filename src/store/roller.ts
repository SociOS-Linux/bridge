import create from 'zustand';
import { L2Point, PendingTransaction } from '@urbit/roller-api/build';

import { HOUR, isL2 } from 'lib/utils/roller';
import { Invite } from 'lib/types/Invite';

export interface RollerStore {
  nextBatchTime: number;
  nextRoll: string;
  pendingTransactions: PendingTransaction[];
  currentPoint: L2Point | null;
  currentL2: boolean;
  invites: Invite[];
  recentlyCompleted: number;
  setNextBatchTime: (nextBatchTime: number) => void;
  setNextRoll: (nextRoll: string) => void;
  setPendingTransactions: (pendingTransactions: PendingTransaction[]) => void;
  setCurrentPoint: (currentPoint: L2Point) => void;
  setInvites: (invites: Invite[]) => void;
}

export const useRollerStore = create<RollerStore>(set => ({
  nextBatchTime: new Date().getTime() + HOUR,
  nextRoll: '0h 00m 00s',
  pendingTransactions: [],
  currentPoint: null,
  currentL2: false,
  invites: [],
  recentlyCompleted: 0,
  setNextBatchTime: (nextBatchTime: number) => set(() => ({ nextBatchTime })),
  setNextRoll: (nextRoll: string) => set(() => ({ nextRoll })),
  setPendingTransactions: (pendingTransactions: PendingTransaction[]) =>
    set(state => {
      const oldPending = state.pendingTransactions.length;
      if (oldPending > 0 && pendingTransactions.length === 0) {
        return {
          ...state,
          pendingTransactions,
          recentlyCompleted: oldPending,
        };
      }
      return { ...state, pendingTransactions };
    }),
  setCurrentPoint: (currentPoint: L2Point) =>
    set(() => ({
      currentPoint,
      currentL2: isL2(currentPoint?.dominion),
    })),
  setInvites: (invites: Invite[]) => set(() => ({ invites })),
}));
