import { WindowChangeMotiveSection } from "../components/WindowChangeMotiveSection";
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

export type ChangeMotiveContract = { "c ID": number };

export type ChangeMotiveSharedData = {
  contractIds: number[];
  contractsCount: number;
  motiveValue: number;
  failedSavesIds: number[];
};

export type ChangeMotiveTask = Omit<Task, "sharedData"> & {
  sharedData: ChangeMotiveSharedData;
};

export async function changeMotiveTaskFn(task: ChangeMotiveTask) {
  errorIfIcareTools();
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
        await nextTaskStep("updateMotive", task, true);
        confirmBox.checked = true;
        confirmBox.form?.submit();
        return;
      }
      nextTaskStep("updateMotive", task);

      return;
    }

    case "updateMotive": {
      //check page, I don't check the contract id because I don't have all day. may cause issues in the future ¯\_(ツ)_/¯
      if (!urlCheck(`/icare/Be/VertragEdit.do`)) {
        return;
      }

      //change motive
      const motiveSelect = await waitForSelector<HTMLSelectElement>("select#motivId");
      motiveSelect.value = task.sharedData.motiveValue.toString();

      //ASYNC GARBAGE: wait for success on the same page
      task = await nextTaskStep("confirmSave", task, true); //AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
      //click on save
      const submitButton = await waitForSelector<HTMLButtonElement>(
        "form[name=VertragEditForm] button[type=submit].btn-success"
      );
      submitButton.click();

      //wait for success message
      try {
        await waitForSelector(
          () => {
            const savedBox = document.querySelector<HTMLElement>("#saved");
            return savedBox?.style.visibility === "visible" ? savedBox : null;
          },
          undefined,
          100
        );
      } catch (e) {
        //just save the error
        task = await setCurrentTask(<ChangeMotiveTask>{
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

      await nextTaskStep("endOfLoop", task);
      //   throw new Warning("wait");

      return;
    }

    case "confirmSave": {
      //WARNING: asynchronous step, don't update the task here!
      if (!urlCheck("/icare/Be/PlatzierungVertragPrepare.do")) return;

      const okButton = document.querySelector<HTMLInputElement>(
        "form[name=VertragEditForm] input.btn.btn-primary"
      );
      okButton?.click();
    }

    case "endOfLoop": {
      const newTask: ChangeMotiveTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contractIds: task.sharedData.contractIds.slice(1),
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

export const changeMotiveTaskParams: TaskParams = {
  taskFn: changeMotiveTaskFn,
  windowSectionComponent: WindowChangeMotiveSection,
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
