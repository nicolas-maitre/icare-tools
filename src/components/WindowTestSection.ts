import { setNewTask } from "../lib/task";
import { createElem } from "../lib/UITools";

export function WindowTestSection() {
  return createElem(
    "p",
    null,
    createElem("h3", null, "Test task"),
    createElem(
      "button",
      {
        async onclick() {
          await setNewTask("test", "Hello there", undefined, "Says hello");
        },
      },
      "Démarrer"
    )
  );
}
