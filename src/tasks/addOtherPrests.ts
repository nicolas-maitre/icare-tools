import { WindowAddOtherPrestSection } from "../components/WindowAddOtherPrestSection";
import { async_setTimeout, waitForSelector } from "../lib/async";
import { errorIfIcareTools } from "../lib/checks";
import { getCurrentTask, nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";
import { createElem } from "../lib/UITools";
import { urlCheck, urlCheckOrGo } from "../lib/url";
import { namedLog } from "../lib/utils";

export type AddOtherPrestContract = {
  "c ID": number;
};

export type AddOtherPrestSharedData = {
  contracts: {
    [id: number]: AddOtherPrestContract;
  };
  contractIds: number[];
  doneContracts: AddOtherPrestContract[];
};

export type AddOtherPrestTask = Omit<Task, "sharedData"> & {
  sharedData: AddOtherPrestSharedData;
};

export const ADD_OTHER_PREST_START_DATE = "01.04.2023";
export const ADD_OTHER_PREST_END_DATE = "30.04.2023";

async function addOtherPrestTask(task: AddOtherPrestTask) {
  errorIfIcareTools();

  const currentContractId = task.sharedData.contractIds[0];
  const currentContract = currentContractId
    ? task.sharedData.contracts[currentContractId]
    : undefined;

  namedLog({ currentContract });

  switch (task.stepName) {
    case "start": {
      if (task.sharedData.contractIds.length === 0) {
        nextTaskStep("success", task);
        return;
      }
      const totalContracts = Object.keys(task.sharedData.contracts).length;
      nextTaskStep("goToContract", {
        ...task,
        lastMessage: `id contrat: ${currentContractId}\n${
          totalContracts - task.sharedData.contractIds.length + 1
        }/${totalContracts}`,
      });

      return;
    }
    case "goToContract": {
      //go to contract url
      if (
        !urlCheckOrGo(
          `/icare/Be/VertragEdit.do?method=main&aktuelle=true&theVerId=${currentContractId}`
        )
      ) {
        return;
      }

      const confirmBox = document.querySelector<HTMLInputElement>("#trotzdem");
      if (confirmBox) {
        //confirm page
        await nextTaskStep("addPrestation", task, true);
        confirmBox.checked = true;
        confirmBox.form?.submit();
        return;
      }
      nextTaskStep("addPrestation", task);
      return;
    }
    case "addPrestation": {
      //check page, I don't check the contract id because I don't have all day. may cause issues in the future ¯\_(ツ)_/¯
      if (!urlCheck(`/icare/Be/VertragEdit.do`)) {
        return;
      }

      //click on "other prestations" tab
      const tabTitle: HTMLElement = await waitForSelector("#ui-id-9");
      tabTitle.click();

      //show prest form
      const newPrestSelect: HTMLSelectElement = await waitForSelector(
        "#ui-id-10 form[name=PlatzierungNewForm] #al-platzierungstyp-new"
      );
      newPrestSelect.value = "1282"; //Aide individuelle B (125.-)
      newPrestSelect.onchange?.call(newPrestSelect, {} as Event); //the event handler doesn't use the event parameter

      const newPrestForm: HTMLFormElement = await waitForSelector("#ui-id-10 form#al-form");
      await async_setTimeout(100); //to allow the form to load

      //set start date
      const startDateInput = await waitForSelector(() =>
        newPrestForm.querySelector<HTMLInputElement>("#al-beginn")
      );
      startDateInput.value = ADD_OTHER_PREST_START_DATE;

      //set end date
      const endDateInput = await waitForSelector(() =>
        newPrestForm.querySelector<HTMLInputElement>("#al-ende")
      );
      endDateInput.value = ADD_OTHER_PREST_END_DATE;

      //click on save
      const saveButton = await waitForSelector(() =>
        newPrestForm.querySelector<HTMLInputElement>("button[type=submit].btn-success")
      );
      saveButton.click();

      //wait for success message
      try {
        await waitForSelector(() => {
          const savedBox = document.querySelector<HTMLElement>("#saved");
          return savedBox?.style.visibility === "visible" ? savedBox : null;
        });
      } catch (e) {
        throw new Error(
          `L'enregistrement automatique de ${currentContractId} n'a pas fonctionné, continuez la tâche pour réessayer ou faites le manuellement et passez au contrat suivant`
        );
      }

      await nextTaskStep("endOfLoop", task);

      return;
    }

    case "endOfLoop": {
      const newTask: AddOtherPrestTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contractIds: task.sharedData.contractIds.slice(1),
          doneContracts: [
            ...task.sharedData.doneContracts,
            ...(currentContract ? [currentContract] : []),
          ],
        },
      };
      nextTaskStep("start", newTask);
      return;
    }
    case "success": {
      alert("Tâche terminée!");
      console.log("contrats terminés", task.sharedData.doneContracts);
      await removeCurrentTask();
      return;
    }
  }
}

export const addOtherPrestTaskParams: TaskParams = {
  taskFn: addOtherPrestTask,
  windowSectionComponent: WindowAddOtherPrestSection,
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
