import { read as readXLSX, utils as XLSXUtils } from "xlsx";
import { hideWindow } from "../components/ToolsWindow";
import { setNewTask } from "../lib/task";
import { BindRef, createElem, promptIndex } from "../lib/UITools";
import { namedLog, objectContainsKeys } from "../lib/utils";
import {
  ExistingDataStrategy,
  FillContractClassesSharedData,
  FillContractsClasseContract,
  FillContractsClassePerson,
} from "../tasks/fillContractClasses";

export function WindowFillContractsClassesSection() {
  const submitButtonRef: BindRef<HTMLButtonElement> = {};
  const formRef: BindRef<HTMLFormElement> = {};

  async function onSubmit(evt: SubmitEvent) {
    evt.preventDefault();

    if (!submitButtonRef.current || !formRef.current) {
      alert("erreur d'initialisation");
      return;
    }

    type FormEntries = {
      allStudents: File;
      wrongContracts: File;
      autoUseFirstDuplicateData?: "on";
      autoSkipNotFound?: "on";
      autoSelectLastContract?: "on";
      existingDataStrat: ExistingDataStrategy;
    };

    const formData = Object.fromEntries(new FormData(formRef.current).entries()) as FormEntries;

    if (!formData.allStudents || !formData.wrongContracts) {
      alert("Merci de déposer tous les fichiers");
      return;
    }

    submitButtonRef.current.disabled = true;

    const [allPeopleBuffer, wrongContractsBuffer] = await Promise.all([
      formData.allStudents.arrayBuffer(),
      formData.wrongContracts.arrayBuffer(),
    ]);

    const allPeopleWorkbook = readXLSX(allPeopleBuffer);
    let selectedAllPeopleSheet = 0;
    if (allPeopleWorkbook.SheetNames.length > 1) {
      const promptRes = promptIndex(
        "Tableur agapeo: Sélectionnez la feuille de données",
        allPeopleWorkbook.SheetNames,
        0,
        true
      );
      if (promptRes === null) {
        submitButtonRef.current.disabled = false;
        return;
      }
      selectedAllPeopleSheet = promptRes;
    }
    const allPeopleSheet =
      allPeopleWorkbook.Sheets[allPeopleWorkbook.SheetNames[selectedAllPeopleSheet]];
    const allPeopleJSON: FillContractsClassePerson[] = XLSXUtils.sheet_to_json(allPeopleSheet);
    if (
      !Array.isArray(allPeopleJSON) ||
      !objectContainsKeys(allPeopleJSON[0], ["Nom", "Prenom", "DateNaissance"])
    ) {
      submitButtonRef.current.disabled = false;
      alert("Le fichier d'élèves est vide ou corrompu. Veuillez réessayer.");
      console.error(allPeopleJSON[0]);
      return;
    }
    namedLog({ allPeopleJSON });

    const wrongContractsWorkbook = readXLSX(wrongContractsBuffer);

    let selectedWrongContractsSheet = 0;
    if (wrongContractsWorkbook.SheetNames.length > 1) {
      const promptRes = promptIndex(
        "Tableur des contrats incomplêts: Sélectionnez la feuille de données",
        wrongContractsWorkbook.SheetNames,
        0,
        true
      );
      if (promptRes === null) {
        submitButtonRef.current.disabled = false;
        return;
      }
      selectedWrongContractsSheet = promptRes;
    }
    const wrongContractsSheet =
      wrongContractsWorkbook.Sheets[wrongContractsWorkbook.SheetNames[selectedWrongContractsSheet]];

    const wrongContractsJSON: FillContractsClasseContract[] =
      XLSXUtils.sheet_to_json(wrongContractsSheet);
    if (
      !Array.isArray(wrongContractsJSON) ||
      !objectContainsKeys(wrongContractsJSON[0], [
        "e id",
        "e nom",
        "e prenom",
        "institution",
        "institution id",
      ])
    ) {
      submitButtonRef.current.disabled = false;
      alert("Le fichier de contrats est vide ou corrompu. Veuillez réessayer.");
      return;
    }

    namedLog({ wrongContractsJSON });

    const contractsById = Object.fromEntries(wrongContractsJSON.map((wc) => [wc["e id"], wc]));

    const contractsIdsToHandle = Object.keys(contractsById).sort(
      (a, b) => parseInt(a) - parseInt(b)
    );
    // .slice(127); //debug

    const taskData: FillContractClassesSharedData = {
      contracts: contractsById,
      contractsIds: contractsIdsToHandle,
      existingDataStrategy: formData.existingDataStrat,
      shouldSelectFirstData: formData.autoUseFirstDuplicateData === "on",
      shouldSkipContractNotFound: formData.autoSkipNotFound === "on",
      shouldSelectLastContractNotFound: formData.autoSelectLastContract === "on",
      contractsNotFound: {},
      contractsDuplicates: {},
      contractByContractMode: false,
    };

    setNewTask(
      "fillContractClasses",
      taskData,
      allPeopleJSON,
      "Remplissage des contrats sans classe."
    );

    hideWindow();
    submitButtonRef.current.disabled = false;
  }

  return createElem(
    "p",
    null,
    createElem("h3", null, "Remplissage des contrats sans classes"),
    createElem(
      "form",
      {
        onsubmit: onSubmit,
        bindTo: formRef,
        style: {
          borderLeft: "3px solid gray",
          paddingLeft: "10px",
          display: "flex",
          flexFlow: "column",
          alignItems: "flex-start",
          gap: "10px",
        },
      },
      createElem(
        "label",
        { htmlFor: "inputAllStudents" },
        "Feuille Excel avec tous les élèves (Nom, Prenom, DateNaissance, ClasseCourante)"
      ),
      createElem("input", {
        name: "allStudents",
        type: "file",
        accept: ".xlsx, .xlsm, .xls",
        required: true,
        id: "inputAllStudents",
      }),
      createElem(
        "label",
        { htmlFor: "inputWrongContracts" },
        "Feuille Excel avec les contrats incomplèts (e id, e nom, e prenom, institution, institution id)"
      ),
      createElem("input", {
        name: "wrongContracts",
        type: "file",
        accept: ".xlsx, .xlsm, .xls",
        required: true,
        id: "inputWrongContracts",
      }),
      createElem(
        "div",
        null,
        createElem("input", {
          type: "checkbox",
          id: "checkboxAutoUseFirstDuplicateData",
          name: "autoUseFirstDuplicateData",
        }),
        createElem(
          "label",
          {
            htmlFor: "checkboxAutoUseFirstDuplicateData",
            style: { margin: "0 0 0 .5em" },
          },
          "Toujours sélectionner la première école/classe en cas de résultats similaires."
        )
      ),
      createElem(
        "div",
        null,
        createElem("input", {
          type: "checkbox",
          id: "checkboxAutoSkipNotFound",
          name: "autoSkipNotFound",
        }),
        createElem(
          "label",
          {
            htmlFor: "checkboxAutoSkipNotFound",
            style: { margin: "0 0 0 .5em" },
          },
          "Toujours ignorer les contrats introuvable. (Une liste sera affichée à la fin de l'éxecution)"
        )
      ),
      createElem(
        "div",
        null,
        createElem("input", {
          type: "checkbox",
          id: "checkboxAutoSelectLastContract",
          name: "autoSelectLastContract",
        }),
        createElem(
          "label",
          {
            htmlFor: "checkboxAutoSelectLastContract",
            style: { margin: "0 0 0 .5em" },
          },
          "Toujours sélectionner le dernier contrat lorsque plusieurs sont disponibles. (Une liste sera affichée à la fin de l'éxecution)"
        )
      ),
      createElem(
        "fieldset",
        null,
        createElem(
          "legend",
          { style: { fontSize: "1em", marginInlineEnd: "1em" } },
          "Si une donnée est déjà enregistrée"
        ),
        createElem("input", {
          name: "existingDataStrat",
          type: "radio",
          id: "radioExistingDataStratAsk",
          value: "ask",
          style: { margin: "0 .5em" },
          checked: true,
        }),
        createElem("label", { htmlFor: "radioExistingDataStratAsk" }, "Toujours demander"),
        createElem("br"),
        createElem("input", {
          name: "existingDataStrat",
          type: "radio",
          id: "radioExistingDataStratSkip",
          value: "skip",
          style: { margin: "0 .5em" },
        }),
        createElem("label", { htmlFor: "radioExistingDataStratSkip" }, "Toujours ignorer"),
        createElem("br"),
        createElem("input", {
          name: "existingDataStrat",
          type: "radio",
          id: "radioExistingDataStratForce",
          value: "force",
          style: { margin: "0 .5em" },
        }),
        createElem("label", { htmlFor: "radioExistingDataStratForce" }, "Toujours remplacer")
      ),
      createElem("button", { type: "submit", bindTo: submitButtonRef }, "Démarrer")
    )
  );
}
