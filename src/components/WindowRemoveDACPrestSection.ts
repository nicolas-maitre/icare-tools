import { read as readXLSX, utils as XLSXUtils } from "xlsx";
import { setNewTask } from "../lib/task";
import { BindRef, createElem, promptIndex } from "../lib/UITools";
import { namedLog, objectContainsKeys } from "../lib/utils";
import { AddOtherPrestContract, AddOtherPrestSharedData } from "../tasks/addOtherPrests";
import { RemoveDACPrestSharedData } from "../tasks/removeDACPrest";
import { hideWindow } from "./ToolsWindow";

export function WindowRemoveDACPrestSection() {
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
    };

    const formData = Object.fromEntries(new FormData(formRef.current).entries()) as FormEntries;

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

    const wrongContractsJSON: AddOtherPrestContract[] =
      XLSXUtils.sheet_to_json(wrongContractsSheet);
    if (
      !Array.isArray(wrongContractsJSON) ||
      !objectContainsKeys(wrongContractsJSON[0], ["c ID", "institution id", "pp id"])
    ) {
      submitButtonRef.current.disabled = false;
      alert("Le fichier de contrats est vide ou corrompu. Veuillez réessayer.");
      return;
    }

    const contractsById = Object.fromEntries(
      wrongContractsJSON
        .filter((c) => (c["Facturation DAC à supprimer"] ?? 0) > 0)
        .map((wc) => [wc["c ID"], wc])
    );

    namedLog({ wrongContractsJSON, contractsById });

    const contractsIdsToHandle = Object.keys(contractsById)
      .map(Number)
      .sort((a, b) => a - b);
    // .slice(127); //debug

    const taskData: RemoveDACPrestSharedData = {
      contracts: contractsById,
      contractIds: contractsIdsToHandle,
      doneContracts: [],
      strangeContracts: [],
    };

    setNewTask("removeDACPrest", taskData, undefined, "Supression des 'autres prestations' DAC");

    hideWindow();
    submitButtonRef.current.disabled = false;
  }

  return createElem(
    "p",
    null,
    createElem("h3", null, "Supression des 'autres prestations' DAC et facturation"),
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
        "Feuille Excel avec les contrats incorrects (c ID)"
      ),
      createElem("input", {
        name: "wrongContracts",
        type: "file",
        accept: ".xlsx, .xlsm, .xls",
        required: true,
        id: "inputWrongContracts",
      }),
      createElem("button", { type: "submit", bindTo: submitButtonRef }, "Démarrer")
    )
  );
}
