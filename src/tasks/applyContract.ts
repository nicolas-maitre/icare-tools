import { WindowApplyContractSection } from "../components/WindowApplyContractSection";
import { waitForSelector } from "../lib/async";
import { errorIfIcareTools } from "../lib/checks";
import {
  getCurrentTask,
  nextTaskStep,
  removeCurrentTask,
  setCurrentTask,
  Task,
  TaskParams,
} from "../lib/task";
import { createElem } from "../lib/UITools";
import { urlCheck, urlCheckOrGo } from "../lib/url";

export type ApplyableContract = { "c ID": number; "c fin"?: string };

export type ApplyContractSharedData = {
  contractIdsToHandle: number[];
  contracts: Record<number, ApplyableContract>;
  failedSavesIds: number[];
};

export type ApplyContractTask = Omit<Task, "sharedData"> & {
  sharedData: ApplyContractSharedData;
};

async function applyContractsTaskFn(task: ApplyContractTask) {
  errorIfIcareTools();
  const currentId = task.sharedData.contractIdsToHandle[0];
  switch (task.stepName) {
    case "start": {
      if (task.sharedData.contractIdsToHandle.length === 0) {
        nextTaskStep("success", task);
        return;
      }

      const contractsCount = Object.keys(task.sharedData.contracts).length;

      nextTaskStep("taskContractPageStart", {
        ...task,
        lastMessage: `id contrat: ${currentId}\n${
          contractsCount - task.sharedData.contractIdsToHandle.length + 1
        }/${contractsCount}`,
      });

      return;
    }

    case "taskContractPageStart": {
      const contractToApply = task.sharedData.contracts[currentId];
      if (contractToApply["c fin"] === undefined) {
        //next step
        nextTaskStep("endOfLoop", task);
        return;
      }

      //go to contract url
      if (
        !urlCheckOrGo(`/icare/Be/VertragEdit.do?method=main&aktuelle=true&theVerId=${currentId}`)
      ) {
        return;
      }

      const confirmBox = document.querySelector<HTMLInputElement>("#trotzdem");
      if (confirmBox) {
        //confirm page
        await nextTaskStep("contractPageFillForm", task, true);
        confirmBox.checked = true;
        confirmBox.form?.submit();
        return;
      }
      nextTaskStep("contractPageFillForm", task);

      return;
    }

    case "contractPageFillForm": {
      //check page, I don't check the contract id because I don't have all day. may cause issues in the future ¯\_(ツ)_/¯
      if (!urlCheck(`/icare/Be/VertragEdit.do`)) {
        return;
      }

      const currentContract = task.sharedData.contracts[currentId];

      let shouldSave = false;

      if (currentContract["c fin"] !== undefined) {
        shouldSave = true;
        //change end date
        const endDateInput = await waitForSelector<HTMLInputElement>("input#verEnde");
        endDateInput.value = currentContract["c fin"];
      }

      if (shouldSave) {
        //ASYNC GARBAGE: wait for success on the same page
        task = await nextTaskStep("contractPageConfirmSave", task, true); //AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

        //click on save
        const submitButton = await waitForSelector<HTMLButtonElement>(
          "form[name=VertragEditForm] button[type=submit].btn-success"
        );
        submitButton.click();

        // wait for success message
        try {
          await waitForSelector(
            () => {
              const savedBox = document.querySelector<HTMLElement>("#saved");
              return savedBox?.style.visibility === "visible" ? savedBox : null;
            },
            10,
            500
          );
        } catch (e) {
          //just save the error
          task = await setCurrentTask(<ApplyContractTask>{
            ...task,
            sharedData: {
              ...task.sharedData,
              failedSavesIds: [...(task.sharedData.failedSavesIds ?? []), currentId],
            },
          });

          // throw new Error(
          //   `L'enregistrement automatique de ${currentId} n'a pas fonctionné, continuez la tâche pour réessayer ou faites le manuellement et passez au contrat suivant`
          // );
        }
      }

      task = await nextTaskStep("endOfLoop", task);

      return;
    }

    case "contractPageConfirmSave": {
      //WARNING: asynchronous step, don't update the task here!
      if (!urlCheck("/icare/Be/PlatzierungVertragPrepare.do")) return;

      const okButton = document.querySelector<HTMLInputElement>(
        "form[name=VertragEditForm] input.btn.btn-primary"
      );
      okButton?.click();

      return;
    }

    case "endOfLoop": {
      const newTask: ApplyContractTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contractIdsToHandle: task.sharedData.contractIdsToHandle.slice(1),
        },
      };
      nextTaskStep("start", newTask);

      return;
    }

    case "success": {
      console.info("failed saves:", task.sharedData.failedSavesIds);
      alert("Tâche terminée!");
      await removeCurrentTask();

      return;
    }
  }
}

export const applyContractTaskParams: TaskParams = {
  taskFn: applyContractsTaskFn,
  windowSectionComponent: WindowApplyContractSection,
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
