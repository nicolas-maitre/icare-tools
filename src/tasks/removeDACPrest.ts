import { WindowRemoveDACPrestSection } from "../components/WindowRemoveDACPrestSection";
import { async_setTimeout, waitForSelector } from "../lib/async";
import { IcareWindow } from "../lib/icareTypes";
import { getCurrentTask, nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";
import { createElem } from "../lib/UITools";
import { urlCheck, urlCheckOrGo } from "../lib/url";
import { namedLog } from "../lib/utils";

export type RemoveDACPrestContract = {
  "c ID": number;
};

export type RemoveDACPrestSharedData = {
  contracts: {
    [id: number]: RemoveDACPrestContract;
  };
  contractIds: number[];
  doneContracts: RemoveDACPrestContract[];
  strangeContracts: RemoveDACPrestContract[];
};

export type RemoveDACPrestTask = Omit<Task, "sharedData"> & {
  sharedData: RemoveDACPrestSharedData;
};

async function removeDACPrestTask(task: RemoveDACPrestTask) {
  if ((window as IcareWindow).HAS_ICARE_HELPERS_LOADED) {
    alert(
      "Cette tâche ne peut pas fonctionner quand le script 'icare-helpers' est chargé. Désactivez le d'abord."
    );
    throw new Error("Cette tâche ne supporte pas le script 'icare-helpers'");
  }

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
        await nextTaskStep("removePrestation", task, true);
        confirmBox.checked = true;
        confirmBox.form?.submit();
        return;
      }
      nextTaskStep("removePrestation", task);
      return;
    }
    case "removePrestation": {
      //check page, I don't check the contract id because I don't have all day. may cause issues in the future ¯\_(ツ)_/¯
      if (!urlCheck(`/icare/Be/VertragEdit.do`)) {
        return;
      }

      //click on "other prestations" tab
      const tabTitle: HTMLElement = await waitForSelector("#ui-id-9");
      tabTitle.click();

      //TODO: remove prestation
      throw new Error("TODO not implemented");

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
      const newTask: RemoveDACPrestTask = {
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
      console.log("contrats ignorés", task.sharedData.strangeContracts);
      await removeCurrentTask();
      return;
    }
    default: {
      throw new Error(`étape ${task.stepName} inconnue`);
    }
  }
}

export const removeDACPrestTaskParams: TaskParams = {
  taskFn: removeDACPrestTask,
  windowSectionComponent: WindowRemoveDACPrestSection,
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
