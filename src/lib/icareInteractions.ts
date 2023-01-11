import { FillContractClassesSharedData } from "../tasks/fillContractClasses";
import { Warning } from "./errors";
import { nextTaskStep, Task } from "./task";
import { namedLog } from "./utils";

type MinimalFillContractTask = Omit<Task, "sharedData"> & {
  sharedData: Pick<
    FillContractClassesSharedData,
    "contracts" | "contractsIds" | "existingDataStrategy" | "shouldSelectFirstData"
  >;
};
export async function fillContractData(
  task: MinimalFillContractTask,
  name: string,
  value: string | undefined,
  nextStep: string
) {
  const person = task.sharedData.contracts[task.sharedData.contractsIds[0]];

  if (value === undefined) {
    alert(
      `Aucune valeur fournie pour ${name}.\n` +
        `
      Entrez la donnée manuellement et continuez la tâche\n` +
        `Personne: [${person["e id"]}] ${person["e prenom"]} ${person["e nom"]}`
    );
    task = await nextTaskStep(nextStep, task, true);
    throw new Error(`Aucune valeur fournie pour ${name}. p.id: ${person["e id"]}`);
  }

  const tables = document.querySelectorAll<HTMLTableElement>("#theKlForm > table.sortable");
  let select: HTMLSelectElement | undefined;
  let saveButton: HTMLButtonElement | undefined;

  for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
    const table = tables[tableIndex];

    const TRList = table.querySelectorAll<HTMLTableRowElement>(
      "table > thead > tr, table > tbody > tr"
    );
    const TRs = [...TRList];

    const nameTR = tableIndex === 0 ? TRs[1] : TRs[0];
    const nameFromTR = nameTR?.textContent?.trim();
    if (!nameFromTR?.includes(name)) continue;

    const dataTR = tableIndex === 0 ? TRs[2] : TRs[1];

    select =
      dataTR?.querySelector<HTMLSelectElement>("td > span > select.inputNoWidth") ?? undefined;
    saveButton = dataTR?.querySelector<HTMLButtonElement>("td > button.link") ?? undefined;
    if (
      !saveButton?.getAttribute("onclick")?.includes("javascript:saveEntry('KlassifizierungForm'")
    )
      throw new Error("Imposteur de bouton de sauvegarde (btn pas trouvé)");

    break;
  }

  namedLog({ name, select, saveButton });

  if (!select || !saveButton) {
    alert(
      `L'entrée ${name} est introuvable. Vérifiez et créez la si besoin.\nEnsuite relancez la tâche`
    );
    throw new Warning(`Ligne ${name} introuvable.`);
  }

  //Already a value inside the select
  if (select.value !== "0") {
    //Ask to overwrite
    if (
      task.sharedData.existingDataStrategy === "ask" &&
      !confirm(`${name} déjà renseigné.\nSouhaitez vous l'écraser?\n` + `Valeur: '${value}'`)
    ) {
      alert(`Vérifiez/renseignez le collège, enregistrez puis continuez la tâche.`);
      task = await nextTaskStep(nextStep, task, true);
      throw new Warning(`Vérifier/Renseigner manuellement ${name}`);
    }
    //Skip to next step
    else if (task.sharedData.existingDataStrategy === "skip") {
      console.info("skipping to next step according to existingData strategy");
      task = await nextTaskStep(nextStep, task, true);
      return;
    }
  }

  //find matching name
  const optionsToSelect = [...select.options].filter((op) =>
    op.textContent?.trim().split("''").join("'").includes(value.trim().split("''").join("'"))
  );

  let resIndexChosen = 1;
  if (!task.sharedData.shouldSelectFirstData && optionsToSelect.length > 1) {
    do {
      const txtRes = prompt(
        `Veuillez choisir la bonne valeur pour '${name}'.\n\n` +
          `Valeur cherchée: '${value}'\n` +
          `Personne: ${person["e prenom"]} ${person["e nom"]} [${person["e id"]}]\n\n` +
          optionsToSelect.map((o, i) => `[${i + 1}] ${o.textContent?.trim()}`).join("\n"),
        resIndexChosen.toString()
      );
      if (txtRes === null) {
        alert(
          `Entrez manuellement la valeur de ${name}.\nValeur du fichier: ${value}\n` +
            `Personne: [${person["e id"]}] ${person["e prenom"]} ${person["e nom"]}`
        );
        task = await nextTaskStep(nextStep, task, true);
        throw new Warning(`Entrer manuellement: ${name}: "${value}". p.id: ${person["e id"]}`);
      }
      resIndexChosen = parseInt(txtRes);
    } while (
      isNaN(resIndexChosen) ||
      resIndexChosen < 1 ||
      resIndexChosen > optionsToSelect.length
    );
  }

  const optionToSelect = optionsToSelect[resIndexChosen - 1];

  if (!optionToSelect?.value) {
    alert(
      `${name}: '${value}': introuvable dans les listes. Renseignez le manuellement puis enregistrez. Ensuite continuez la tâche.\n` +
        `Personne: [${person["e id"]}] ${person["e prenom"]} ${person["e nom"]}`
    );
    task = await nextTaskStep(nextStep, task, true);
    throw new Warning(
      `${name}: '${value}' introuvable. Renseigner manuellement. p.id: ${person["e id"]}`
    );
  }

  //skip if already right value
  if (select.value === optionToSelect.value) {
    nextTaskStep(nextStep, task);
    return;
  }

  task = await nextTaskStep(nextStep, task, true);
  select.value = optionToSelect.value;
  saveButton.click();
}
