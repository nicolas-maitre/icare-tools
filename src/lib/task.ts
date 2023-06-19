import localforage from "localforage";
import { refreshTaskWindow } from "../components/TaskWindow";
import { addOtherPrestTaskParams } from "../tasks/addOtherPrests";
import { applyContractTaskParams } from "../tasks/applyContract";
import { applyPercentFacturationTaskParams } from "../tasks/applyPercentFacturation";
import { changeMotiveTaskParams } from "../tasks/changeMotive";
import { fillContractClassesTaskParams } from "../tasks/fillContractClasses";
import { goToContractsTaskParams } from "../tasks/goToContracts";
import { removeDACPrestTaskParams } from "../tasks/removeDACPrest";
import { testTaskParams } from "../tasks/test";
import { Warning } from "./errors";
import { IcareWindow } from "./icareTypes";
import { stepContractsTaskParams } from "../tasks/stepContracts";
import { removeEndDateTaskParams } from "../tasks/removeEndDate";
import { addDispensesTaskParams } from "../tasks/addDispenses";

export type Task = {
  name: keyof typeof taskMap;
  description?: string;
  isPaused: boolean;
  stepName: "start" | "success" | string;
  startedAt: number;
  endedAt?: number;
  stepStartedAt: number;
  lastMessage?: string;
  sharedData: any;
};

export type TaskParams = {
  taskFn: (task: Task) => Promise<void>;
  actionsElems?: Element[];
  windowSectionComponent?(): Element;
};

export const taskMap = {
  applyContract: applyContractTaskParams,
  test: testTaskParams,
  addDispenses: addDispensesTaskParams,
  fillContractClasses: fillContractClassesTaskParams,
  applyPercentFacturation: applyPercentFacturationTaskParams,
  goToContracts: goToContractsTaskParams,
  removeEndDate: removeEndDateTaskParams,
  addOtherPrest: addOtherPrestTaskParams,
  removeDACPrest: removeDACPrestTaskParams,
  changeMotive: changeMotiveTaskParams,
  stepContracts: stepContractsTaskParams,
} satisfies Record<string, TaskParams>;

// CONFIG
// const STEP_BY_STEP = true;
const STEP_BY_STEP = false;

export async function handleTasks() {
  const [task, shouldKillTask] = await Promise.all([
    getCurrentTask(),
    localforage.getItem("LTShouldStopTask"),
  ]);

  //kill task
  if (shouldKillTask) {
    await removeCurrentTask();
    await localforage.removeItem("LTShouldStopTask");
    return;
  }

  refreshTaskWindow(task);
  if (!task) {
    console.info("no task");
    return;
  }

  if (task.isPaused) {
    console.info(`task ${task.name} is paused`, task);
    return;
  }

  console.info(`handling task ${task.name}, step ${task.stepName}`, task);

  try {
    await taskMap[task.name].taskFn(task);
  } catch (e: unknown | Error | Warning) {
    const brokenTask = await getCurrentTask();
    console.error(
      `An error occured in the task ${task.name} at step ${task.stepName}. Pausing the task.`,
      e,
      task,
      brokenTask
    );
    if (brokenTask)
      await setCurrentTask({
        ...brokenTask,
        isPaused: true,
        lastMessage: e?.toString?.(),
      });
  }
}

export async function setCurrentTask(task: Task) {
  await localforage.setItem("LTCurrentTask", task);
  refreshTaskWindow(task);
  return task;
}
export async function getCurrentTask(): Promise<Task | null> {
  return await localforage.getItem("LTCurrentTask");
}

(window as IcareWindow).getCurrentTask = getCurrentTask;

export async function removeCurrentTask() {
  await Promise.all([localforage.removeItem("LTCurrentTask"), removeHeavyData()]);
  refreshTaskWindow(null);
}

export async function setHeavyData(value: any) {
  await localforage.setItem("LTHeavyData", value);
}
export async function getHeavyData() {
  return await localforage.getItem("LTHeavyData");
}
export async function removeHeavyData() {
  await localforage.removeItem("LTHeavyData");
}

export async function setNewTask(
  name: keyof typeof taskMap,
  sharedData: any,
  heavyData?: any,
  description?: string
) {
  if (await getCurrentTask()) {
    alert("Impossible de démarrer une nouvelle tâche. Une tâche est déjà en cours.");
    throw new Error("a task is already running");
  }

  const task: Task = {
    name,
    description,
    stepName: "start",
    startedAt: Date.now(),
    stepStartedAt: Date.now(),
    isPaused: false,
    sharedData,
  };
  await Promise.all([setCurrentTask(task), setHeavyData(heavyData)]);
  handleTasks();
  return task;
}

export async function setStep(stepName: string) {
  const task = await getCurrentTask();
  if (!task) throw new Error("No current task");
  return await nextTaskStep(stepName, task);
}

(window as IcareWindow).icareTools = {
  ...(window as IcareWindow).icareTools,
  setNewTask,
  setStep,
};

export async function nextTaskStep(stepName: string, task: Task, willReloadPage = false) {
  task = { ...task, stepName, stepStartedAt: Date.now() };

  if (STEP_BY_STEP) task = { ...task, isPaused: true, lastMessage: "Step by step..." };

  task = await setCurrentTask(task);

  if (!willReloadPage) handleTasks();

  return task;
}
