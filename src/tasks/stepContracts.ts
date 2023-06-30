import { WindowStepContractsSection } from "../components/WindowStepContractsSection";
import { errorIfIcareTools } from "../lib/checks";
import { Warning } from "../lib/errors";
import { nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";
import { urlCheckOrGo } from "../lib/url";

export type StepContractsSharedData = {
  contractIds: number[];
  contractsCount: number;
};

export type StepContactsTask = Omit<Task, "sharedData"> & {
  sharedData: StepContractsSharedData;
};

export async function stepContractsTaskFn(task: StepContactsTask) {
  // errorIfIcareTools();
  const currentId = task.sharedData.contractIds[0];
  switch (task.stepName) {
    case "start": {
      if (task.sharedData.contractIds.length === 0) {
        nextTaskStep("success", task);
        return;
      }
      nextTaskStep("goToContract", {
        ...task,
        lastMessage: `id contrat: ${currentId}\n${
          task.sharedData.contractsCount - task.sharedData.contractIds.length + 1
        }/${task.sharedData.contractsCount}`,
      });

      return;
    }

    case "goToContract": {
      //go to contract url
      if (
        !urlCheckOrGo(`/icare/Be/VertragEdit.do?method=main&aktuelle=true&theVerId=${currentId}`)
      ) {
        return;
      }

      const confirmBox = document.querySelector<HTMLInputElement>("#trotzdem");
      if (confirmBox) {
        //confirm page
        await nextTaskStep("endOfLoopConfirm", task, true);
        confirmBox.checked = true;
        confirmBox.form?.submit();
        return;
      }
      nextTaskStep("endOfLoopConfirm", task);

      return;
    }

    case "endOfLoopConfirm": {
      const newTask: StepContactsTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contractIds: task.sharedData.contractIds.slice(1),
        },
      };
      await nextTaskStep("start", newTask, true);

      throw new Warning("waiting for continue (next contract)");

      return;
    }

    case "success": {
      alert("Tâche terminée!");
      await removeCurrentTask();

      return;
    }
  }
}

export const stepContractsTaskParams: TaskParams = {
  taskFn: stepContractsTaskFn,
  windowSectionComponent: WindowStepContractsSection,
};
