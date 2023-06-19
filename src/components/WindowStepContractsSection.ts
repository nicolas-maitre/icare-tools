import { read as readXLSX, utils as XLSXUtils } from "xlsx";
import { setNewTask } from "../lib/task";
import { BindRef, createElem, promptIndex } from "../lib/UITools";
import { namedLog, objectContainsKeys } from "../lib/utils";
import { hideWindow } from "./ToolsWindow";
import { StepContractsSharedData } from "../tasks/stepContracts";
import { BasicContract } from "../lib/icareTypes";

export function WindowStepContractsSection() {
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
        "Tableur des contrats: Sélectionnez la feuille de données",
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

    const wrongContractsJSON: BasicContract[] = XLSXUtils.sheet_to_json(wrongContractsSheet);
    if (
      !Array.isArray(wrongContractsJSON) ||
      !objectContainsKeys(wrongContractsJSON[0], ["c ID"])
    ) {
      submitButtonRef.current.disabled = false;
      alert("Le fichier de contrats est vide ou corrompu. Veuillez réessayer.");
      return;
    }

    const contractIds = wrongContractsJSON.map((wc) => wc["c ID"]);

    namedLog({ contractIds });

    const taskData: StepContractsSharedData = {
      contractIds,
      contractsCount: contractIds.length,
    };

    setNewTask("stepContracts", taskData, undefined, "Visite des contrats");

    hideWindow();
    submitButtonRef.current.disabled = false;
  }

  return createElem(
    "p",
    null,
    createElem("h3", null, "Visite des contrats"),
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
        "Feuille Excel avec les contrats (c ID)"
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
