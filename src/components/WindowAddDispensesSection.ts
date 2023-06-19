import { read as readXLSX, utils as XLSXUtils } from "xlsx";
import { setNewTask } from "../lib/task";
import { BindRef, createElem, promptIndex } from "../lib/UITools";
import { namedLog, objectContainsKeys } from "../lib/utils";
import { hideWindow } from "./ToolsWindow";
import { AddDispensesContract, AddDispensesSharedData } from "../tasks/addDispenses";

export function WindowAddDispensesSection() {
  const submitButtonRef: BindRef<HTMLButtonElement> = {};
  const formRef: BindRef<HTMLFormElement> = {};

  async function onSubmit(evt: SubmitEvent) {
    evt.preventDefault();

    if (!submitButtonRef.current || !formRef.current) {
      alert("erreur d'initialisation");
      return;
    }

    type FormEntries = {
      wrongContracts: File;
      startDate: string;
      endDate: string;
      day: string;
    };

    const formData = Object.fromEntries(new FormData(formRef.current).entries()) as FormEntries;

    if (!formData.startDate || !formData.endDate || !formData.day) {
      alert("Merci de remplir tous les champs");
      return;
    }

    const dateInputToString = (input: string) => input.split("-").reverse().join(".");

    const startDate = dateInputToString(formData.startDate);
    const endDate = dateInputToString(formData.endDate);
    const day = Number(formData.day);

    if (!formData.wrongContracts) {
      alert("Merci de déposer tous les fichiers");
      return;
    }

    submitButtonRef.current.disabled = true;

    const wrongContractsBuffer = await formData.wrongContracts.arrayBuffer();

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

    const wrongContractsJSON: AddDispensesContract[] = XLSXUtils.sheet_to_json(wrongContractsSheet);
    if (
      !Array.isArray(wrongContractsJSON) ||
      !objectContainsKeys(wrongContractsJSON[0], ["c ID"])
    ) {
      submitButtonRef.current.disabled = false;
      alert("Le fichier de contrats est vide ou corrompu. Veuillez réessayer.");
      return;
    }

    const contractsById = Object.fromEntries(wrongContractsJSON.map((wc) => [wc["c ID"], wc]));

    namedLog({ wrongContractsJSON, contractsById });

    const contractsIdsToHandle = Object.keys(contractsById)
      .map(Number)
      .sort((a, b) => a - b);

    const taskData: AddDispensesSharedData = {
      startDate,
      endDate,
      day,
      contracts: contractsById,
      contractIds: contractsIdsToHandle,
      doneContracts: [],
      errorContracts: [],
    };

    setNewTask("addDispenses", taskData, undefined, "Remplissage des contrats sans classe.");

    hideWindow();
    submitButtonRef.current.disabled = false;
  }

  return createElem(
    "p",
    null,
    createElem("h3", null, "Ajout de dispenses dans les autres prestations"),
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
        { htmlFor: "inputWrongContracts" },
        "Feuille Excel avec les contrats incomplèts (c ID, [DISP A, DISP B, ...])"
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
        { style: { display: "flex", width: "100%", gap: "10px" } },
        createElem(
          "div",
          { style: { display: "flex", flexFlow: "column", flex: "1" } },
          createElem("label", { htmlFor: "inpStartDate" }, "Date de début"),
          createElem("input", {
            name: "startDate",
            type: "date",
            required: true,
            id: "inpStartDate",
          })
        ),
        createElem(
          "div",
          { style: { display: "flex", flexFlow: "column", flex: "1" } },
          createElem("label", { htmlFor: "inpEndDate" }, "Date de fin"),
          createElem("input", { name: "endDate", type: "date", required: true, id: "inpEndDate" })
        ),
        createElem(
          "div",
          { style: { display: "flex", flexFlow: "column", flex: "1" } },
          createElem("label", { htmlFor: "selectDay" }, "Jour"),
          createElem(
            "select",
            { name: "day", required: true, id: "selectDay" },
            createElem("option", { value: "" }),
            createElem("option", { value: "1" }, "Lundi"),
            createElem("option", { value: "2" }, "Mardi"),
            createElem("option", { value: "3" }, "Mercredi"),
            createElem("option", { value: "4" }, "Jeudi"),
            createElem("option", { value: "5" }, "Vendredi")
          )
        )
      ),
      createElem("button", { type: "submit", bindTo: submitButtonRef }, "Démarrer")
    )
  );
}
