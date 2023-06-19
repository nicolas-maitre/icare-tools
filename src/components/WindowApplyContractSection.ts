import { read as readXLSX, utils as XLSXUtils } from "xlsx";
import { setNewTask } from "../lib/task";
import { BindRef, createElem, promptIndex } from "../lib/UITools";
import { namedLog, objectContainsKeys } from "../lib/utils";
import { ApplyContractSharedData } from "../tasks/applyContract";
import { hideWindow } from "./ToolsWindow";
import { BasicContract } from "../lib/icareTypes";

export function WindowApplyContractSection() {
  const submitButtonRef: BindRef<HTMLButtonElement> = {};
  const formRef: BindRef<HTMLFormElement> = {};

  async function onSubmit(evt: SubmitEvent) {
    evt.preventDefault();

    if (!submitButtonRef.current || !formRef.current) {
      alert("erreur d'initialisation");
      return;
    }

    type FormEntries = {
      contracts: File;
    };

    const formData = Object.fromEntries(new FormData(formRef.current).entries()) as FormEntries;

    if (!formData.contracts) {
      alert("Merci de déposer tous les fichiers");
      return;
    }

    submitButtonRef.current.disabled = true;

    const contractsBuffer = await formData.contracts.arrayBuffer();

    const contractsWorkbook = readXLSX(contractsBuffer);

    let selectedContractsSheet = 0;
    if (contractsWorkbook.SheetNames.length > 1) {
      const promptRes = promptIndex(
        "Tableur des contrats incomplêts: Sélectionnez la feuille de données",
        contractsWorkbook.SheetNames,
        0,
        true
      );
      if (promptRes === null) {
        submitButtonRef.current.disabled = false;
        return;
      }
      selectedContractsSheet = promptRes;
    }
    const contractsSheet =
      contractsWorkbook.Sheets[contractsWorkbook.SheetNames[selectedContractsSheet]];

    const contractsJSON: BasicContract[] = XLSXUtils.sheet_to_json(contractsSheet);
    if (!Array.isArray(contractsJSON) || !objectContainsKeys(contractsJSON[0], ["c ID"])) {
      submitButtonRef.current.disabled = false;
      alert("Le fichier de contrats est vide ou corrompu. Veuillez réessayer.");
      return;
    }

    const contracts = Object.fromEntries(contractsJSON.map((c) => [c["c ID"], c]));

    const contractIdsToHandle = contractsJSON.map((c) => c["c ID"]);

    namedLog({ contracts });

    const taskData: ApplyContractSharedData = {
      contractIdsToHandle,
      contracts,
      failedSavesIds: [],
    };

    setNewTask(
      "applyContract",
      taskData,
      undefined,
      "Remplissage dynamique des contrats existants"
    );

    hideWindow();
    submitButtonRef.current.disabled = false;
  }

  return createElem(
    "p",
    null,
    createElem("h3", null, "Remplissage dynamique des contrats existants"),
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
        { htmlFor: "inputContracts" },
        "Feuille Excel avec les contrats à modifier (c ID)"
      ),
      createElem("input", {
        name: "contracts",
        type: "file",
        accept: ".xlsx, .xlsm, .xls",
        required: true,
        id: "inputContracts",
      }),
      createElem("button", { type: "submit", bindTo: submitButtonRef }, "Démarrer")
    )
  );
}
