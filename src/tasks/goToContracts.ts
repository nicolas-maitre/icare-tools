import { nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";
import { urlCheckOrGo } from "../lib/url";

type GoToContractsTask = Omit<Task, "sharedData"> & {
  sharedData: {
    personId: number;
  };
};

async function goToContractsTaskFn(task: GoToContractsTask) {
  switch (task.stepName) {
    case "start": {
      if (!urlCheckOrGo("/icare/Be/VertragList.do?suchen=firstSearch&reset=true")) {
        return;
      }

      const contractForm = document.querySelector<HTMLFormElement>("form[name=VertragListeForm]");
      if (!contractForm) return;

      const contractIdInput = contractForm.querySelector<HTMLInputElement>("input[name=verNr]");
      if (!contractIdInput) return;

      contractIdInput.value = task.sharedData.personId.toString();

      task = await nextTaskStep("success", task, true);

      contractForm.submit();

      return;
    }

    case "success": {
      console.info("go to contracts task success");

      await removeCurrentTask();

      return;
    }
  }
}

export const goToContractsTaskParams: TaskParams = {
  taskFn: goToContractsTaskFn,
};
