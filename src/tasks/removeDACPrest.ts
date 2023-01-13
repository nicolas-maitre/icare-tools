import { WindowRemoveDACPrestSection } from "../components/WindowRemoveDACPrestSection";
import { async_setTimeout, waitForSelector, waitForSelectorAll, waitForValue } from "../lib/async";
import { Warning } from "../lib/errors";
import { IcareWindow } from "../lib/icareTypes";
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
import { namedLog } from "../lib/utils";

export type RemoveDACPrestContract = {
  "c ID": number;
  "institution id": number;
  "pp id": number;
  "Facturation DAC à supprimer"?: number;
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
  //check for compatibility
  const locale = (window as IcareWindow).locale;
  if (locale && locale.substring(0, 2) !== "fr") {
    alert(
      "Cette tâche supporte uniquement le site en français.\n" +
        "Changez la langue et continuez la tâche"
    );
    throw new Error("Cette tâche supporte uniquement le site en français.");
  }

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
        // //TODO: start with goToContract instead
        // nextTaskStep("searchFactJournal", {
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

      //seems to prevent some fuckups
      await async_setTimeout(200);
      //close icare error dialog
      document
        .querySelector("#ajaxErrorDialog")
        ?.parentElement?.querySelector<HTMLButtonElement>(".ui-dialog-buttonpane button")
        ?.click();

      //click on "other prestations" tab
      //idk but it works
      const tabTitle: HTMLElement = await waitForSelector("#ui-id-9");
      tabTitle.click();

      const clickOnAll = async () => {
        //click on "all"
        const buttonAll = await waitForSelector("#ui-id-10 input[type=button][name=alle]");
        buttonAll.click();
      };

      //find prestation to delete
      try {
        const deleteButton = await waitForSelector(
          async () => {
            await clickOnAll();
            const allPotentialLines = document.querySelectorAll<HTMLElement>(
              "#ui-id-10 .dataTable table tbody"
            );
            for (const tbody of allPotentialLines) {
              const nameInput = tbody.querySelector<HTMLInputElement>("input.inputDesable");
              if (nameInput?.value !== "Redevance Devoirs accompagnés") {
                continue;
              }
              const trashIcon = tbody.querySelector("i.fas.fa-trash-alt");
              return trashIcon?.parentElement ?? null;
            }
            return null;
          },
          100,
          20 //~2sec
        );

        deleteButton.click();
      } catch (e) {
        task = await nextTaskStep("searchFactJournal", task, true);
        throw new Warning(
          "Prestation introuvable, supprimez la manuellement et continuez la tâche"
        );
      }

      task = await nextTaskStep("confirmPrestDelete", task, true);

      //ASYNC GARBAGE: wait for success on the same page (by counting the trash can icons)

      const getElemsCount = () => document.querySelectorAll("#ui-id-10 i.fas.fa-trash-alt").length;
      const baseElemsCount = getElemsCount();
      try {
        await waitForValue<true>(() => (getElemsCount() < baseElemsCount ? true : undefined));
      } catch (e) {
        task = await nextTaskStep("searchFactJournal", task, true);
        throw new Error(
          `La supression automatique de la prestation du contrat ${currentContractId} n'a pas fonctionné,\n vérifiez/supprimez la manuellement et continuez la tâche`
        );
      }

      task = await nextTaskStep("searchFactJournal", task);

      return;
    }

    case "confirmPrestDelete": {
      //WARNING: asynchronous step, don't update the task here!

      if (!urlCheck("/icare/Ad/PlatzierungLoeschen.do")) {
        return;
      }

      const okButton = document.querySelector<HTMLButtonElement>("button.btn.btn-success");
      okButton?.click();

      return;
    }
    case "searchFactJournal": {
      if (!urlCheckOrGo("/icare/Ad/FjUebersicht.do?neueSuche=neueSuche")) {
        return;
      }

      const institutionSelect = await waitForSelector<HTMLSelectElement>("select#fjMandant");
      institutionSelect.value = currentContract!["institution id"].toString();

      const yearInput = await waitForSelector<HTMLInputElement>("input#fjJahr");
      yearInput.value = (2022).toString();

      const nameInput = await waitForSelector<HTMLInputElement>("input#fjBezeichnung");
      nameInput.value = "DAC automne 2022";

      const submitButton = await waitForSelector<HTMLButtonElement>("button#searchButton");

      task = await nextTaskStep("findFactJournal", task, true);
      submitButton.click();

      return;
    }
    case "findFactJournal": {
      if (!urlCheck("/icare/Ad/FjUebersicht.do")) {
        return;
      }

      const fjLink = await waitForSelectorAll<HTMLAnchorElement>(
        "table#fj > tbody > tr > td.link > a",
        2
      );

      task = await nextTaskStep("deleteFact", task, true);
      if (fjLink.length > 2) {
        throw new Warning("Trop de résultats! naviguez sur le bon et continuez la tâche");
      }
      fjLink[0].click();

      return;
    }
    case "deleteFact": {
      const factLines = document.querySelectorAll<HTMLTableRowElement>(
        "table#jqFjDisplayTable > tbody > tr"
      );
      const foundLines = [...factLines].filter((line) => {
        const linkRow = line.querySelectorAll<HTMLTableCellElement>("td.link")[1];
        return linkRow.textContent?.includes(`(${currentContract?.["pp id"]})`);
      });

      if (foundLines.length === 0) {
        throw new Warning(
          `Facture ${currentContract?.["pp id"]} introuvable, supprimez la manuellement et passez au contrat suivant.`
        );
      }
      if (foundLines.length > 1) {
        task = await setCurrentTask(<RemoveDACPrestTask>{
          ...task,
          sharedData: {
            ...task.sharedData,
            strangeContracts: [...task.sharedData.strangeContracts, currentContract],
          },
        });
        throw new Warning(
          "Plusieurs factures trouvées, la supression ne sera pas effectuée.\nPassez au contrat suivant"
        );
      }

      const checkbox = foundLines[0].querySelector<HTMLInputElement>("input[type=checkbox]");
      if (!checkbox) throw new Error("checkbox introuvable");
      checkbox.checked = true;

      try {
        const deleteLink = await waitForSelector<HTMLAnchorElement>(
          "#jqFjDisplayTable #jqFjAuswahlUl li.delete > a[href='javascript:deleteSelectedFaks();']"
        );

        task = await nextTaskStep("endOfLoop", task, true);

        const oldConfirm = window.confirm;
        window.confirm = () => true; //force confirm to true
        deleteLink.click();
      } catch (e) {
        throw new Error(`bouton de supression introuvable (${currentContract?.["pp id"]})`);
      }

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
