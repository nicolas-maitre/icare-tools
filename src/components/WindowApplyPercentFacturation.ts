import { setNewTask } from "../lib/task";
import { createElem } from "../lib/UITools";
import { ApplyPercentFacturationSharedData } from "../tasks/applyPercentFacturation";
import { hideWindow } from "./ToolsWindow";

export function WindowApplyPercentFacturation() {
  return createElem(
    "p",
    null,
    createElem("h3", null, "Deduction FAJE 20%"),
    createElem(
      "form",
      {
        onsubmit: onSubmit,
        style: {
          borderLeft: "3px solid gray",
          paddingLeft: "10px",
          display: "flex",
          flexFlow: "column",
          alignItems: "flex-start",
          gap: "10px",
        },
      },
      "Lancez la procédure depuis la liste des journaux de facturation",
      createElem("button", { type: "submit" }, "Démarrer")
    )
  );

  function onSubmit(evt: SubmitEvent) {
    evt.preventDefault();
    hideWindow();
    const newTask: ApplyPercentFacturationSharedData = {
      factures: {},
      idsToHandle: [],
      text: "Déduction FAJE 20%",
    };
    setNewTask(
      "applyPercentFacturation",
      newTask,
      undefined,
      "Ajoute un entrée de rabais à une liste de factures."
    );
  }
}
