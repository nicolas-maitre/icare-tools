import { createElem } from "../lib/UITools";
import { BasicContract } from "../lib/icareTypes";
import { Task, TaskParams, getCurrentTask, nextTaskStep } from "../lib/task";

type KlassifizierungsToRemove = {
  "DEL DAC LU"?: 1;
  "DEL DAC MA"?: 1;
  "DEL DAC JE"?: 1;
  "DEL SITE"?: 1;
};
export type RemoveKlassifizierungContract = BasicContract & KlassifizierungsToRemove;

export type RemoveKlassifizierungTask = Omit<Task, "sharedData"> & {
  sharedData: {
    contractIdsToHandle: number[];
    currentContract: RemoveKlassifizierungContract;
    currentContractKlassifizierungsToRemove: (keyof KlassifizierungsToRemove)[];
  };
};

export async function removeKlassifizierungTaskFn(task: RemoveKlassifizierungTask) {}

export const removeKlassifizierungTaskParams: TaskParams = {
  taskFn: removeKlassifizierungTaskFn,
  actionsElems: [
    createElem(
      "button",
      {
        async onclick(e) {
          e.stopPropagation();
          if (!confirm("Êtes vous sûr de vouloir passer au contrat suivant?")) return;
          const task = await getCurrentTask();
          if (!task) return;
          nextTaskStep("endOfLoop", { ...task, isPaused: false });
        },
      },
      "Passer au contrat suivant"
    ),
  ],
};
