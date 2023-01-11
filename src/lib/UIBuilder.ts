import { showWindow, ToolWindow } from "../components/ToolsWindow";
import { setNewTask } from "./task";
import { BindRef, createElem, e } from "./UITools";

export function buildToolsButtonIntegration() {
  //BUILD UI
  const mainMenuUlElement = document.querySelector("#mainmenu > ul");
  if (mainMenuUlElement) {
    e(mainMenuUlElement).addElem(
      "li",
      null,
      createElem(
        "a",
        {
          onclick: showWindow,
          dataset: {
            toggle: "tooltip",
            placement: "top",
            originalTitle: "Les outils pratiques",
          },
        },
        createElem("i", { className: "fa fa-solid fa-toolbox" })
      )
    );
  }

  const frontDivRef: BindRef<HTMLDivElement> = {};
  const toolWindowRef: BindRef<HTMLDivElement> = {};

  e(document.body).addElem(
    "div",
    {
      bindTo: frontDivRef,
      style: {
        position: "fixed",
        visibility: "hidden",
        top: "0",
        left: "0",
        minWidth: "100vw",
        height: "100vh",
        overflowY: "auto",
        backgroundColor: "#000a",
        zIndex: "1",
      },
    },
    ToolWindow(toolWindowRef, frontDivRef)
  );
}

export function buildGoToContractButtonIntegration() {
  const h2 = document.querySelector("#data h2");
  const personIdForButton = Number(
    h2?.textContent?.split("(").at(1)?.split(")").at(0)
  );
  if (h2 && !isNaN(personIdForButton)) {
    e(h2).addElem(
      "button",
      {
        type: "button",
        title: "Afficher les contrats",
        onclick() {
          setNewTask("goToContracts", { personId: personIdForButton });
        },
        style: {
          borderRadius: "1em",
          lineHeight: "1em",
          paddingBottom: ".2em",
        },
      },
      "c"
    );
  }
}
