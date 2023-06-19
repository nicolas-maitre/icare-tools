import { async_setTimeout, waitForSelector, waitForSelectorAll } from "../lib/async";
import { Warning } from "../lib/errors";
import {
  waitForSpinnerHidden,
  waitForSuccess,
  waitForSuccessHidden,
} from "../lib/icareInteractions";
import { nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";
import { urlCheck } from "../lib/url";
import { namedLog } from "../lib/utils";

type RemoveEndDateTask = Omit<Task, "sharedData"> & {
  sharedData: {
    dateToRemove: string;
    newEndDate: string;
  };
};

async function removeEndDateTaskFn(task: RemoveEndDateTask) {
  switch (task.stepName) {
    case "start": {
      if (!urlCheck("icare/Be/VertragEdit.do")) {
        throw new Warning("Démarrer la tâche depuis une page de contrat");
      }

      // wait for spinner end
      await waitForSpinnerHidden();

      //go to contract tab
      (await waitForSelector("a#ui-id-5")).click();

      //get removal date
      const endDateInput = await waitForSelector<HTMLInputElement>(
        "#ui-id-6 > form > table > tbody > tr > td > input#verEnde"
      );

      if (task.sharedData.dateToRemove !== endDateInput.value) {
        throw new Error("weird date mismatch");
      }

      endDateInput.value = "";

      //save
      //ASYNC GARBAGE: wait for success on the same page
      task = await nextTaskStep("confirmSave", task, true); //AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

      endDateInput.form?.submit();

      // wait for success message
      await waitForSuccess();

      nextTaskStep("updatePrests", task);
      return;
    }

    case "updatePrests": {
      //go to prests tab
      (await waitForSelector("a#ui-id-7")).click();

      // wait for spinner end
      await waitForSpinnerHidden();

      const inputs = await waitForSelectorAll<HTMLInputElement>(
        "#ui-id-8 #contractuelSave input.autoDate"
      );

      namedLog({ inputs });
      //set inputs to end date
      inputs.forEach((input) => {
        if (input.value === task.sharedData.dateToRemove) {
          input.value = task.sharedData.newEndDate;
        }
      });

      await waitForSuccessHidden();

      //ASYNC GARBAGE: wait for success on the same page
      task = await nextTaskStep("confirmSave", task, true); //AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

      //save
      (await waitForSelector("#ui-id-8 .jqSavePlgsButton")).click();

      // wait for success message
      await waitForSuccess();

      nextTaskStep("backToContractTab", task);
      return;
    }

    case "backToContractTab": {
      //back to contract tab
      (await waitForSelector("a#ui-id-5")).click();

      await waitForSpinnerHidden();
      await async_setTimeout(200);
      //focus copy button
      (
        await waitForSelector(
          "#ui-id-6 > [name=VertragEditForm] > table > tbody > tr > td > table > tbody > tr > td > button.btn.btn-primary",
          250,
          Infinity
        )
      ).focus();

      nextTaskStep("success", task);
      return;
    }

    case "confirmSave": {
      //WARNING: asynchronous step (used multiple times), don't update the task here!
      if (!urlCheck("/icare/Be/PlatzierungVertragPrepare.do")) return;

      const okButton = document.querySelector<HTMLInputElement>(
        "form[name=VertragEditForm] input.btn.btn-primary"
      );
      okButton?.click();

      return;
    }

    case "success": {
      console.info("remove end date task success");

      await removeCurrentTask();

      return;
    }
  }
}

export const removeEndDateTaskParams: TaskParams = {
  taskFn: removeEndDateTaskFn,
};
