import { WindowApplyPercentFacturation } from "../components/WindowApplyPercentFacturation";
import { Warning } from "../lib/errors";
import { IcareWindow } from "../lib/icareTypes";
import { nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";
import { urlCheck, urlCheckOrGo } from "../lib/url";

type Order = {
  number: number;
  text: string;
  compteDeb: string;
  ctrCostDeb: string;
  compteCred: string;
  ctrCostCred: string;
  priceAsCents: number;
};

type Facture = {
  id: string;
  href: string;
  orders?: Order[];
  newOrders?: Order[];
  newOrderIndex?: number;
};

export type ApplyPercentFacturationSharedData = {
  factures: {
    [id: string]: Facture;
  };
  idsToHandle: string[];
  text: string;
};

export type ApplyPercentFacturationTask = Omit<Task, "sharedData"> & {
  sharedData: ApplyPercentFacturationSharedData;
};

async function applyPercentFacturationTaskFn(task: ApplyPercentFacturationTask) {
  const locale = (window as IcareWindow).locale;
  if (locale && locale.substring(0, 2) !== "fr") {
    alert(
      "Cette tâche supporte uniquement le site en français.\n" +
        "Changez la langue et continuez la tâche"
    );
    throw new Error("Cette tâche supporte uniquement le site en français.");
  }

  const factureId = task.sharedData.idsToHandle[0];
  const currentFacture = task.sharedData.factures[factureId];

  switch (task.stepName) {
    case "start": {
      if (!urlCheck("/icare/Ad/FjEdit.do")) {
        alert(
          "Mauvaise page de départ, naviguez sur la liste des facturation puis continuez la tâche"
        );
        throw new Warning("Mauvaise page de départ.");
      }

      //get factures from list
      const TRs = [
        ...document.querySelectorAll<HTMLTableRowElement>("#jqFjDisplayTable > tbody > tr"),
      ];

      const factures = Object.fromEntries(
        TRs.map((tr) => {
          const cells = tr.querySelectorAll("td");
          const numberLink = cells[1].querySelector<HTMLAnchorElement>("a");
          if (!numberLink) throw new Error("Imposteur de lien...");
          const id = numberLink.textContent?.trim() ?? "";
          const href = numberLink.href;
          const facture: Facture = { id, href };
          return [id, facture];
        })
      );

      const idsToHandle = Object.keys(factures);

      const newTask: ApplyPercentFacturationTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          factures,
          idsToHandle,
        },
      };

      nextTaskStep("startOfLoop", newTask);

      return;
    }

    case "startOfLoop": {
      if (task.sharedData.idsToHandle.length === 0) {
        nextTaskStep("success", task);
        return;
      }

      const facturesCount = Object.keys(task.sharedData.factures).length;
      const currentIndex = facturesCount - task.sharedData.idsToHandle.length + 1;

      const taskWithMessage: ApplyPercentFacturationTask = {
        ...task,
        lastMessage: `Info: Facture courante: ${factureId} (${currentIndex}/${facturesCount})`,
      };

      nextTaskStep("collectOrders", taskWithMessage);
      return;
    }

    case "collectOrders": {
      if (!urlCheckOrGo(currentFacture.href)) {
        return;
      }

      const tbody = document.querySelector("#fakPosTable > tbody");
      const rows = [...(tbody?.querySelectorAll("tr[class=even], tr[class=odd]") ?? [])];
      const orders = rows.map((row) => {
        const inputs = getFacInputs(row);

        const priceAsCents = Math.round(parseFloat(inputs.price.value) * 100);
        if (isNaN(priceAsCents)) throw new Error("invalid price");

        const orderNumber = parseInt(inputs.orderId.value);
        if (isNaN(orderNumber))
          throw new Error("order number is not a number " + inputs.orderId.value);

        const order = {
          number: orderNumber,
          text: inputs.text.value,
          compteDeb: inputs.compteDeb.value,
          ctrCostDeb: inputs.ctrCostDeb.value,
          compteCred: inputs.compteCred.value,
          ctrCostCred: inputs.ctrCostCred.value,
          priceAsCents,
        };

        return order;
      });

      //TODO: use a real algorythm here
      const groupsOfOrders = [orders];
      const newOrders = groupsOfOrders.map((orderGroup) => {
        const lastOrder = orderGroup.at(-1);
        if (!lastOrder) throw new Error("missing order");

        const sumAsCents = orderGroup.reduce((s, o) => s + o.priceAsCents, 0);
        const priceWithPercentAsCents = sumAsCents * 0.2; //APPLY 20%

        const order: Order = {
          number: lastOrder.number + 1,
          text: task.sharedData.text,
          compteDeb: lastOrder.compteDeb,
          ctrCostDeb: lastOrder.ctrCostDeb,
          compteCred: lastOrder.compteCred,
          ctrCostCred: lastOrder.ctrCostCred,
          priceAsCents: priceWithPercentAsCents,
        };
        return order;
      });

      const newTask: ApplyPercentFacturationTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          factures: {
            ...task.sharedData.factures,
            [factureId]: {
              ...currentFacture,
              orders,
              newOrders: newOrders,
              newOrderIndex: 0,
            },
          },
        },
      };

      // nextTaskStep("newOrder_startOfLoop", newTask);
      nextTaskStep("dummyStep", newTask); //TODO: ignore creation for now

      return;
    }

    case "newOrder_startOfLoop": {
      if ((currentFacture.newOrderIndex ?? Infinity) >= (currentFacture.newOrders?.length ?? 0)) {
        nextTaskStep("dummyStep", task);
        return;
      }
      nextTaskStep("newOrder_fillOrder", task);
      return;
    }

    case "newOrder_fillOrder": {
      const orderToFill = currentFacture.newOrders?.[currentFacture.newOrderIndex ?? Infinity];
      if (!orderToFill) throw new Error("no order to fill");
      const table = [...document.querySelectorAll("#fakPosTable")].at(-1);
      if (!table) throw new Error("table not found");

      const inputs = getFacInputs(table);

      inputs.orderId.value = orderToFill.number.toString();
      inputs.text.value = orderToFill.text;
      inputs.compteDeb.value = orderToFill.compteDeb;
      inputs.ctrCostDeb.value = orderToFill.ctrCostDeb;
      inputs.compteCred.value = orderToFill.compteCred;
      inputs.ctrCostCred.value = orderToFill.ctrCostCred;
      inputs.price.value = (orderToFill.priceAsCents / 100).toString();

      const submitButton = document.querySelector<HTMLButtonElement>(
        "div.col > div > button[type=button][onclick].btn-success"
      );
      if (!submitButton) throw new Error("no submit button");
      submitButton.click();

      //TODO: instant execution may cause problems with saving.
      nextTaskStep("newOrder_endOfLoop", task);
      return;
    }

    case "newOrder_endOfLoop": {
      const newTask: ApplyPercentFacturationTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          factures: {
            ...task.sharedData.factures,
            [factureId]: {
              ...task.sharedData.factures[factureId],
              newOrderIndex: (task.sharedData.factures[factureId].newOrderIndex ?? 0) + 1,
            },
          },
        },
      };

      nextTaskStep("newOrder_startOfLoop", newTask);
      return;
    }

    case "dummyStep": {
      nextTaskStep("endOfLoop", task);
      return;
    }

    case "endOfLoop": {
      const newTask: ApplyPercentFacturationTask = {
        ...task,
        sharedData: {
          ...task.sharedData,
          idsToHandle: task.sharedData.idsToHandle.slice(1),
        },
      };

      nextTaskStep("startOfLoop", newTask);

      return;
    }

    case "success": {
      alert("Terminé!");
      const allOrders = Object.fromEntries(
        Object.entries(task.sharedData.factures).flatMap(([facId, fac]) =>
          (fac.orders ?? []).map((or) => [or.number, or])
        )
      );
      console.table(allOrders);
      console.log("done", task.sharedData);

      removeCurrentTask();

      return;
    }
  }
}

function getFacInputs(parent: Element) {
  const TDs = parent.querySelectorAll("td[valign]");
  const orderId = TDs[0].querySelector<HTMLInputElement>(
    "form[name=FakturaPositionEditForm] > input.input[name=fpReihenfolge]"
  );
  const text = TDs[1].querySelector<HTMLTextAreaElement>("textarea[name=fpText]");
  const compteDeb = TDs[2].querySelector<HTMLTextAreaElement>("textarea[name=fpKonto]");
  const ctrCostDeb = TDs[3].querySelector<HTMLTextAreaElement>("textarea[name=fpKostSt]");
  const compteCred = TDs[4].querySelector<HTMLTextAreaElement>("textarea[name=fpKontoHaben]");
  const ctrCostCred = TDs[5].querySelector<HTMLTextAreaElement>("textarea[name=fpKostStHaben]");
  const price = TDs[9].querySelector<HTMLInputElement>("input[name=fpPreis]");

  if (!orderId || !text || !compteDeb || !ctrCostDeb || !compteCred || !ctrCostCred || !price) {
    throw new Error("Valeurs introuvables");
  }

  return {
    orderId,
    text,
    compteDeb,
    ctrCostDeb,
    compteCred,
    ctrCostCred,
    price,
  };
}

export const applyPercentFacturationTaskParams: TaskParams = {
  taskFn: applyPercentFacturationTaskFn,
  windowSectionComponent: WindowApplyPercentFacturation,
};
