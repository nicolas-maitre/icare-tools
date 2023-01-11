import type { setNewTask, setStep, Task } from "./task";

export type IcareWindow = typeof window & {
  locale: string;
  HAS_ICARE_HELPERS_LOADED?: boolean;
  getCurrentTask(): Promise<Task | null>;
  icareTools: {
    setNewTask: typeof setNewTask;
    setStep: typeof setStep;
  };
};
