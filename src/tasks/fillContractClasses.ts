import localforage from "localforage";
import { waitForSelector, waitForValue } from "../lib/async";
import { Warning } from "../lib/errors";
import { fillContractData } from "../lib/icareInteractions";
import { IcareWindow } from "../lib/icareTypes";
import {
  getCurrentTask,
  getHeavyData,
  nextTaskStep,
  removeCurrentTask,
  setCurrentTask,
  Task,
  TaskParams,
} from "../lib/task";
import { createElem, promptIndex } from "../lib/UITools";
import { urlCheck, urlCheckOrGo } from "../lib/url";

export type FillContractsClasseContract = {
  "e id": number;
  "institution id": number;
  institution: string;
  "e nom": string;
  "e prenom": string;
  "e naissance"?: string;
  schoolClass?: string;
  schoolName?: string;
};
export type FillContractsClassePerson = {
  Nom: string;
  Prenom: string;
  DateNaissance: string;
  ClasseCourante: string;
  BatimentNomOfficiel: string;
};
export type ExistingDataStrategy = "ask" | "skip" | "force";
type FillContractClassesHeavyData = FillContractsClassePerson[];
export type FillContractClassesSharedData = {
  contracts: {
    [id: string]: FillContractsClasseContract;
  };
  contractsIds: string[];
  shouldSelectFirstData: boolean;
  shouldSkipContractNotFound: boolean;
  shouldSelectLastContractNotFound: boolean;
  existingDataStrategy: ExistingDataStrategy;
  contractsNotFound: {
    [id: string]: { fname: string; lname: string; count: number };
  };
  contractsDuplicates: {
    [id: string]: { fname: string; lname: string; count: number };
  };
  contractByContractMode: boolean;
};

export type FillContractClasseTask = Omit<Task, "sharedData"> & {
  sharedData: FillContractClassesSharedData;
};

type FillContractClassesWindow = IcareWindow & {
  cbc?: (mode?: boolean) => Promise<void>;
};

async function fillContractClassesTaskFn(task: FillContractClasseTask) {
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

  if (!(window as FillContractClassesWindow).cbc)
    (window as FillContractClassesWindow).cbc = async (mode = true) => {
      const lateTask = await getCurrentTask();
      if (!lateTask) return;
      const newTask: FillContractClasseTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contractByContractMode: mode,
        },
        lastMessage: "Mode CBC activé!",
      };
      task = await setCurrentTask(newTask);
    };

  const personId = task.sharedData.contractsIds[0];
  const person = task.sharedData.contracts[personId];
  switch (task.stepName) {
    case "start": {
      if (task.sharedData.contractsIds.length === 0) {
        nextTaskStep("success", task);
        return;
      }

      const contractsCount = Object.keys(task.sharedData.contracts).length;
      const currentContractIndex = contractsCount - task.sharedData.contractsIds.length + 1;
      const taskWithMessage: FillContractClasseTask = {
        ...task,
        lastMessage: `Info: Personne courante: ${personId} (${currentContractIndex}/${contractsCount})`,
      };

      //skip to step if person already known
      if (person["e naissance"]) nextTaskStep("useDataFromAllPeople", taskWithMessage);
      else nextTaskStep("searchPerson", taskWithMessage);

      return;
    }

    case "searchPerson": {
      if (!urlCheckOrGo("/icare/Be/PersonenList.do?suchen=firstSearch")) return;

      const resetFilterBtn = document.querySelector<HTMLElement>("button.btn-danger.float-left");
      resetFilterBtn?.click();

      const personIdInput = document.querySelector<HTMLInputElement>("#personentyp[name=perId]");
      if (!personIdInput) throw new Error("person input not found");
      personIdInput.value = personId;

      const submitButton = document.querySelector<HTMLButtonElement>(
        "form#filterForm .float-right button[type=submit]"
      );

      task = await nextTaskStep("findPerson", task, true);

      submitButton?.click();

      return;
    }

    case "findPerson": {
      if (!urlCheck("/icare/Be/PersonenList.do", "?suchen=firstSearch")) return;

      const personLines = document.querySelectorAll<HTMLTableRowElement>(
        ".dataTable.jqResultList > tbody > tr"
      );
      if (personLines.length !== 1)
        throw new Warning(
          `Personne précise introuvable. id:${personId}. ${personLines.length} résultat(s)`
        );

      const personInfosTDs = personLines[0].getElementsByTagName("td");

      const foundId = personInfosTDs[2].textContent?.trim();
      const foundBirthday = personInfosTDs[9].textContent?.trim();

      if (foundId !== personId) {
        console.info({ foundId });
        throw new Warning(`Personne avec id ${personId} introuvable`);
      }

      const newTask: FillContractClasseTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contracts: {
            ...task.sharedData.contracts,
            [personId]: {
              ...task.sharedData.contracts[personId],
              "e naissance": foundBirthday,
            },
          },
        },
      };

      await nextTaskStep("useDataFromAllPeople", newTask);

      return;
    }

    case "useDataFromAllPeople": {
      const allPeople = (await getHeavyData()) as FillContractClassesHeavyData;
      //find person in people list
      let foundPeople = allPeople.filter(
        (p) =>
          person["e nom"].toLowerCase().includes(p.Nom.trim().toLowerCase()) &&
          person["e naissance"] === p.DateNaissance
      );

      if (foundPeople.length === 0)
        throw new Warning(`${person["e nom"]} ${person["e prenom"]} introuvable dans le fichier`);

      let personIndex = 0;
      if (foundPeople.length > 1) {
        //search by first name
        const foundByFirstName = foundPeople.filter((p) =>
          person["e prenom"].toLowerCase().includes(p.Prenom.trim().toLowerCase())
        );
        if (foundByFirstName.length > 0) foundPeople = foundByFirstName;

        //prompt if still not found
        if (foundPeople.length > 1) {
          personIndex =
            promptIndex(
              "Personne exacte introuvable.\n" +
                `Recherche: ${person["e prenom"]} ${person["e nom"]} [${personId}]` +
                "Veuillez sélectionner la bonne personne:",
              foundPeople.map((p) => `${p.Prenom} ${p.Nom} ${p.DateNaissance}`)
            ) ?? 0;
        }
      }

      const foundPerson = foundPeople[personIndex];

      const newTask: FillContractClasseTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contracts: {
            ...task.sharedData.contracts,
            [personId]: {
              ...task.sharedData.contracts[personId],
              schoolClass: foundPerson.ClasseCourante,
              schoolName: foundPerson.BatimentNomOfficiel,
            },
          },
        },
      };
      task = await setCurrentTask(newTask);

      nextTaskStep("searchContract", task);
      return;
    }

    case "searchContract": {
      if (!urlCheckOrGo("/icare/Be/VertragList.do?reset=true")) return;

      const contractIdInput = document.querySelector<HTMLInputElement>("input[name=verNr]");
      if (!contractIdInput) throw new Error("contract input not found");
      contractIdInput.value = personId;

      const institutionIdSelect = document.querySelector<HTMLSelectElement>(
        "select[name=mandantgruppe].select2-offscreen"
      );
      if (!institutionIdSelect) throw new Error("institution input not found");

      const institutionId = person["institution id"].toString();

      institutionIdSelect.value = institutionId;
      if (institutionIdSelect.value !== institutionId) {
        //store contract not found
        task = await setCurrentTask({
          ...task,
          sharedData: {
            ...task.sharedData,
            contractsNotFound: {
              ...task.sharedData.contractsNotFound,
              [personId]: {
                fname: person["e prenom"],
                lname: person["e nom"],
              },
            },
          },
        });

        if (task.sharedData.shouldSkipContractNotFound) {
          console.info("skipping contract because the institution was not found");
          nextTaskStep("endOfLoop", task);
          return;
        }
        alert(
          "La recherche ne peut pas être effectuée car l'institution n'est pas disponible.\n" +
            "Trouvez et naviguez manuellement sur le contrat puis continuez la tâche.\n" +
            `Institution: [${person["institution id"]}] ${person.institution} \n` +
            `Pour: ${person["e prenom"]} ${person["e nom"]} [${personId}]`
        );
        task = await nextTaskStep("openContractEditPage", task, true);
        throw new Warning(
          `Institution introuvable:[${institutionId}] "${person.institution}", p-id:${personId}.`
        );
      }

      const contractForm = document.querySelector<HTMLFormElement>("form[name=VertragListeForm]");
      if (!contractForm) throw new Error("contract form not found");

      task = await nextTaskStep("findContract", task, true);

      contractForm.submit();

      return;
    }

    case "findContract": {
      if (!urlCheck("/icare/Be/VertragList.do", "?reset=true")) return;

      const contractLines = document.querySelectorAll<HTMLTableRowElement>(
        "#ver.dataTable > tbody > tr"
      );

      function getContractLineCells(tr: HTMLTableRowElement) {
        const tds = tr.getElementsByTagName("td");
        const [id, name, institution, group, dates, clientGroup, internalMessage, deleteDate] = tds;

        const [startDate, endDate] = dates.textContent?.trim()?.split(" - ") ?? [];

        return {
          id,
          name,
          institution,
          group,
          dates,
          startDate,
          endDate,
          clientGroup,
          internalMessage,
          deleteDate,
        };
      }

      let contractCells: ReturnType<typeof getContractLineCells> | undefined = undefined;

      //Precise contract not found
      if (contractLines.length !== 1) {
        //Store contract that wasn't found
        const newTask: FillContractClasseTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
          },
        };
        if (contractLines.length === 0)
          newTask.sharedData.contractsNotFound = {
            ...task.sharedData.contractsNotFound,
            [personId]: {
              fname: person["e prenom"],
              lname: person["e nom"],
              count: contractLines.length,
            },
          };
        else
          newTask.sharedData.contractsDuplicates = {
            ...task.sharedData.contractsDuplicates,
            [personId]: {
              fname: person["e prenom"],
              lname: person["e nom"],
              count: contractLines.length,
            },
          };

        task = await setCurrentTask(newTask);

        //auto skip if no contract found
        if (task.sharedData.shouldSkipContractNotFound && contractLines.length === 0) {
          console.info("skipping contract because it wasn't found.");
          nextTaskStep("endOfLoop", task);
          return;
        }

        //select last if multiple results
        if (task.sharedData.shouldSelectLastContractNotFound) {
          contractCells = [...contractLines].map(getContractLineCells).reduce((prev, curr) => {
            const currDate = new Date(curr.startDate.split(".").reverse().join("-"));
            const prevDate = new Date(prev.startDate.split(".").reverse().join("-"));
            return currDate > prevDate ? curr : prev;
          });
        } else {
          //prompt user to choose correct contract
          alert(
            "Contrat précis introuvable.\n" +
              "Naviguez sur le contrat concerné et/ou continuez la tâche.\n" +
              `Institution: [${person["institution id"]}] ${person.institution} \n` +
              `Pour: ${person["e prenom"]} ${person["e nom"]} [${personId}]`
          );
          task = await nextTaskStep("openContractEditPage", task, true);

          throw new Warning(
            `Contrat précis introuvable. p-id:${personId}. ${contractLines.length} résultat(s)`
          );
        }
      } else {
        contractCells = getContractLineCells(contractLines[0]);
      }

      const foundContractId = contractCells.id.textContent?.trim();
      if (!foundContractId?.includes(personId))
        throw new Error(
          `Contrat de la personne ${personId} introuvable. Contrat faux ${foundContractId} trouvé.`
        );

      const contractLink = contractCells.id.querySelector("a");
      if (!contractLink) throw new Error("contract link not found");

      task = await nextTaskStep("openContractEditPage", task, true);
      contractLink.click();
      return;
    }

    case "openContractEditPage": {
      if (!urlCheck("/icare/Be/VertragEdit.do?method=main&aktuelle=true&theVerId=")) return;

      //check if id is still the same
      const nameAndIdH2 = document.querySelector("#data h2");
      if (!nameAndIdH2?.textContent?.includes(personId))
        throw new Error("L'id du contrat ne correspond pas.");

      const iframe: HTMLIFrameElement = await waitForSelector("iframe[name=klassifizierungframe]");
      if (!iframe) throw new Error("iframe de contrat introuvable");
      const iframeSrc = await waitForValue(() => iframe.src || undefined);
      if (!iframeSrc) {
        console.log("iframe src", iframe.src, iframe);
        alert(
          "Impossible d'accéder aux modifications. Essayez de recharger la page puis continuez la tâche"
        );
        throw new Error("url de l'iframe introuvable. id:" + personId);
      }

      task = await nextTaskStep("fillContractCollege", task, true);

      window.location.href = iframe.src;

      return;
    }

    case "fillContractCollege": {
      if (!urlCheck(["/icare/KlassifizierungSave.do", "/icare/PrepareKlassifizierung.do"])) return;

      await fillContractData(task, "Collège", person.schoolName, "fillContractClass");

      /// nextTaskStep("fillContractClass", task, true);

      return;
    }

    case "fillContractClass": {
      if (!urlCheck(["/icare/KlassifizierungSave.do", "/icare/PrepareKlassifizierung.do"])) return;

      await fillContractData(task, "Classe et enseignant", person.schoolClass, "endOfLoop");

      /// nextTaskStep("endOfLoop", task, true);

      return;
    }

    case "endOfLoop": {
      const newTask: FillContractClasseTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          contractsIds: task.sharedData.contractsIds.slice(1),
        },
      };

      //step by step check
      if (newTask.sharedData.contractByContractMode) {
        task = await nextTaskStep("start", newTask, true);
        throw new Warning("Mode pas à pas");
      }

      nextTaskStep("start", newTask);

      return;
    }
    case "success": {
      console.info("CONTRATS INTROUVABLES:");
      console.table(task.sharedData.contractsNotFound);
      console.info("CONTRATS MULTIPLES:");
      console.table(task.sharedData.contractsDuplicates);

      //store end time
      const endedAt = Date.now();
      task = await setCurrentTask({ ...task, endedAt });

      //store finished task
      (async () => {
        const finishedTasks =
          (await localforage.getItem<FillContractClasseTask[]>("LTFinishedTasks")) ?? [];
        const cleanTask: FillContractClasseTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
            contracts: {},
          },
        };
        await localforage.setItem("LTFinishedTasks", [...finishedTasks, cleanTask]);
      })();

      const elapsedTimeString = new Date(endedAt - task.startedAt).toISOString().substring(11, 19);

      const contractsNotFoundEntries = Object.entries(task.sharedData.contractsNotFound);
      const contractDuplicatesEntries = Object.entries(task.sharedData.contractsDuplicates);
      //display end of task infos
      alert(
        `Tâche terminée! (en ${elapsedTimeString}) \n` +
          `[F12] Listes complêtes affichées dans la console\n` +
          `${contractsNotFoundEntries.length} contrats pas trouvés sur ${
            Object.keys(task.sharedData.contracts).length
          }.\n` +
          contractsNotFoundEntries
            .map(([id, { fname, lname }], i) => `${i}. [${id}] ${fname} ${lname}`)
            .join("\n") +
          `${contractDuplicatesEntries.length} contrats multiples sur ${
            Object.keys(task.sharedData.contracts).length
          }.\n` +
          contractDuplicatesEntries
            .map(([id, { fname, lname }], i) => `${i}. [${id}] ${fname} ${lname}`)
            .join("\n")
      );

      await removeCurrentTask();
      return;
    }
    default: {
      throw new Error("Étape introuvable");
    }
  }
}

export const fillContractClassesTaskParams: TaskParams = {
  taskFn: fillContractClassesTaskFn,
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
