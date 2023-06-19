import { WindowAddDispensesSection } from "../components/WindowAddDispensesSection";
import { async_setTimeout, waitForSelector } from "../lib/async";
import { errorIfIcareTools } from "../lib/checks";
import { Warning } from "../lib/errors";
import {
  closeAjaxErrorDialog,
  waitForSpinnerHidden,
  waitForSuccess,
  waitForSuccessHidden,
} from "../lib/icareInteractions";
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

export type AddDispensesContract = {
  "c ID": number;
  "DISP A": 1 | undefined;
  "DISP B": 1 | undefined;
  "DISP C": 1 | undefined;
  "DISP D": 1 | undefined;
  "DISP H": 1 | undefined;
  "DISP J": 1 | undefined;
  prestIdsToAdd?: number[];
};

export type AddDispensesSharedData = {
  startDate: string;
  endDate: string;
  day: number; //1,2,3,4,5
  contracts: {
    [id: number]: AddDispensesContract;
  };
  contractIds: number[];
  doneContracts: AddDispensesContract[];
  errorContracts: AddDispensesContract[];
};

export type AddDispensesTask = Omit<Task, "sharedData"> & {
  sharedData: AddDispensesSharedData;
};

const PREST_ID_BY_LETTER = {
  A: 1172,
  B: 1173,
  C: 1174,
  D: 1175,
  H: 1256,
  J: 1257,
} as const;

async function addDispensesTask(task: AddDispensesTask) {
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
        await nextTaskStep("addPrestations", task, true);
        confirmBox.checked = true;
        confirmBox.form?.submit();
        return;
      }
      nextTaskStep("addPrestations", task);
      return;
    }
    case "addPrestations": {
      if (!currentContract) throw new Error("no contract");

      const prestIdsToAdd = Object.entries(PREST_ID_BY_LETTER).flatMap(([letter, id]) =>
        currentContract[`DISP ${letter as keyof typeof PREST_ID_BY_LETTER}`] === 1 ? [id] : []
      );

      nextTaskStep("addCurrentPrestation_loopStart", {
        ...task,
        sharedData: {
          ...task.sharedData,
          contracts: {
            ...task.sharedData.contracts,
            [currentContractId]: {
              ...task.sharedData.contracts[currentContractId],
              prestIdsToAdd,
            },
          },
        },
      } satisfies AddDispensesTask);

      return;
    }
    case "addCurrentPrestation_loopStart": {
      if (currentContract?.prestIdsToAdd?.length === 0) {
        nextTaskStep("endOfLoop", task);
        return;
      }
      nextTaskStep("addCurrentPrestation_loopBody", task);
      return;
    }
    case "addCurrentPrestation_loopBody": {
      //check page, I don't check the contract id because I don't have all day. may cause issues in the future ¯\_(ツ)_/¯
      if (!urlCheck(`/icare/Be/VertragEdit.do`)) {
        return;
      }

      //click on "other prestations" tab
      const tabTitle: HTMLElement = await waitForSelector("#ui-id-9");
      tabTitle.click();

      await waitForSpinnerHidden();

      //show prest form
      const newPrestSelect: HTMLSelectElement = await waitForSelector(
        "#ui-id-10 form[name=PlatzierungNewForm] #al-platzierungstyp-new"
      );

      const prestId = currentContract?.prestIdsToAdd?.at(0);
      if (prestId === undefined) throw new Error("no prest ID!");

      closeAjaxErrorDialog();
      newPrestSelect.value = prestId.toString();
      newPrestSelect.onchange?.call(newPrestSelect, {} as Event); //the event handler doesn't use the event parameter

      const newPrestForm: HTMLFormElement = await waitForSelector("#ui-id-10 form#al-form");
      await async_setTimeout(100); //to allow the form to load

      //wait for official form load (lol)
      const prestLetter = Object.entries(PREST_ID_BY_LETTER).find(([, v]) => v === prestId)?.[0];
      if (!prestLetter) throw new Error("invalid prest");

      await waitForSelector(() => {
        const input = document.querySelector<HTMLInputElement>("#al-form #al-platzierungstypBez");
        return input?.value[0] === prestLetter ? input : null;
      });

      //set start date
      const startDateInput = await waitForSelector(() =>
        newPrestForm.querySelector<HTMLInputElement>("#al-beginn")
      );
      closeAjaxErrorDialog();
      startDateInput.value = task.sharedData.startDate;

      //set end date
      const endDateInput = await waitForSelector(() =>
        newPrestForm.querySelector<HTMLInputElement>("#al-ende")
      );
      closeAjaxErrorDialog();
      endDateInput.value = task.sharedData.endDate;

      //set day
      const CHECKBOX_TYPES_IDS = [
        PREST_ID_BY_LETTER.A,
        PREST_ID_BY_LETTER.B,
        PREST_ID_BY_LETTER.C,
        PREST_ID_BY_LETTER.D,
      ] as number[];
      const SELECT_TYPES_IDS = [PREST_ID_BY_LETTER.H, PREST_ID_BY_LETTER.J] as number[];

      if (CHECKBOX_TYPES_IDS.includes(prestId)) {
        //checkbox type:

        const dayCheckbox = await waitForSelector(() =>
          newPrestForm.querySelector<HTMLInputElement>(`#al-wochentag${task.sharedData.day}`)
        );
        closeAjaxErrorDialog();
        dayCheckbox.checked = true;
      } else if (SELECT_TYPES_IDS.includes(prestId)) {
        //select type:

        const daySelect = await waitForSelector(() =>
          newPrestForm.querySelector<HTMLSelectElement>("#al-wochentag > select")
        );
        closeAjaxErrorDialog();
        daySelect.value = task.sharedData.day.toString();
      } else {
        //unknown type:

        throw new Error(`prest id ${prestId} (${prestLetter}) not supported`);
      }

      await waitForSuccessHidden();
      //click on save
      const saveButton = await waitForSelector(() =>
        newPrestForm.querySelector<HTMLInputElement>("button[type=submit].btn-success")
      );
      saveButton.click();

      //wait for success message (could also wait for error message)
      try {
        await waitForSuccess();
      } catch (e) {
        await setCurrentTask({
          ...task,
          sharedData: {
            ...task.sharedData,
            errorContracts: [...task.sharedData.errorContracts, currentContract!],
          },
        } satisfies AddDispensesTask);
        // ignore and continue
        // throw new Error(
        //   `L'enregistrement automatique de ${currentContractId} n'a pas fonctionné, continuez la tâche pour réessayer ou faites le manuellement et passez au contrat suivant`
        // );
      }

      nextTaskStep("addCurrentPrestation_loopEnd", task);
      return;
    }
    case "addCurrentPrestation_loopEnd": {
      nextTaskStep("addCurrentPrestation_loopStart", {
        ...task,
        sharedData: {
          ...task.sharedData,
          contracts: {
            ...task.sharedData.contracts,
            [currentContractId]: {
              ...task.sharedData.contracts[currentContractId],
              prestIdsToAdd: task.sharedData.contracts[currentContractId].prestIdsToAdd?.slice(1),
            },
          },
        },
      } satisfies AddDispensesTask);
      return;
    }
    case "endOfLoop": {
      const newTask: AddDispensesTask = {
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
      console.log("contrats avec erreur", task.sharedData.errorContracts);
      await removeCurrentTask();
      return;
    }
  }
}

export const addDispensesTaskParams: TaskParams = {
  taskFn: addDispensesTask,
  windowSectionComponent: WindowAddDispensesSection,
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
