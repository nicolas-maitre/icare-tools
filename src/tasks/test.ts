import { nextTaskStep, removeCurrentTask, Task, TaskParams } from "../lib/task";

async function testTask(task: Task) {
  switch (task.stepName) {
    case "start":
      window.location.href = "/icare/Be/Overview.do";
      nextTaskStep("sayHello", task);
      return;
    case "sayHello":
      if (window.location.href.includes("/icare/Be/Overview.do")) {
        alert(task.sharedData);
        nextTaskStep("success", task);
      }
      return;
    case "success":
      alert("Task success!");
      await removeCurrentTask();
      break;
  }
}

export const testTaskParams: TaskParams = {
  taskFn: testTask,
};
