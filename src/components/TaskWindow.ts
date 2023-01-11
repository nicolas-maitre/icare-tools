import localforage from "localforage";
import {
  getCurrentTask,
  handleTasks,
  removeCurrentTask,
  setCurrentTask,
  Task,
  taskMap,
  TaskParams,
} from "../lib/task";
import { BindRef, createElem, e } from "../lib/UITools";

const taskWindowInfos: BindRef<HTMLParagraphElement> = {};
const taskWindowResumeButtonRef: BindRef<HTMLButtonElement> = {};

const _taskWindowRef: BindRef<HTMLDivElement> = {};

export function buildTaskWindow() {
  _taskWindowRef.current = e(document.body).addElem(
    "div",
    {
      async onclick() {
        if (confirm("Êtes vous sûr de vouloir arrêter l'execution de la tâche courante?")) {
          await localforage.setItem("LTShouldStopTask", true);
          await removeCurrentTask();
          alert(
            "La tâche a été annulée en cours d'éxecution. Veuillez vérifier l'état des données."
          );
        }
      },
      style: {
        position: "fixed",
        top: "0",
        right: "0",
        visibility: "hidden",
        backgroundColor: "pink",
        minWidth: "350px",
        cursor: "pointer",
        padding: "10px",
        zIndex: "999",
        overflow: "hidden",
      },
    },
    createElem(
      "button",
      {
        style: { float: "right", fontWeight: "bold" },
        onclick(e) {
          e.stopPropagation();
          _taskWindowRef.current!.style.height = _taskWindowRef.current!.style.height ? "" : "5em";
        },
      },
      "__"
    ),
    createElem("h4", null, "TÂCHE EN COURS,", createElem("br"), "CLIQUEZ ICI POUR ANNULER"),
    createElem("p", { bindTo: taskWindowInfos, style: { whiteSpace: "pre" } }),
    createElem(
      "button",
      {
        bindTo: taskWindowResumeButtonRef,
        style: { display: "none" },
        async onclick(e) {
          e.stopPropagation();
          const task = await getCurrentTask();
          if (!task) return;

          await setCurrentTask({
            ...task,
            isPaused: false,
          });

          handleTasks();
        },
      },
      "Continuer la tâche"
    )
  );
}
let _lastTaskParams: TaskParams | undefined;
export async function refreshTaskWindow(task: Task | null) {
  if (!_taskWindowRef.current) return;
  if (!task && task !== null) task = await getCurrentTask();
  if (!task) {
    _taskWindowRef.current.style.visibility = "hidden";
    return;
  }

  _taskWindowRef.current.style.visibility = "visible";

  const taskParams: TaskParams = taskMap[task.name];

  if (_lastTaskParams !== taskParams) {
    _lastTaskParams?.actionsElems?.forEach((e) => e.remove());
    taskParams.actionsElems?.forEach((e) => _taskWindowRef.current!.appendChild(e));
    _lastTaskParams = taskParams;
  }

  if (taskWindowResumeButtonRef.current)
    taskWindowResumeButtonRef.current.style.display = task.isPaused ? "block" : "none";

  if (taskWindowInfos.current)
    taskWindowInfos.current.textContent =
      "Nom: " +
      task.name +
      "\n" +
      "Description: " +
      (task.description ?? "(no description)") +
      "\n" +
      "Démarré le: " +
      new Date(task.startedAt).toLocaleString() +
      "\n\n" +
      "Étape: " +
      task.stepName +
      "\n" +
      "Étape démarrée le: " +
      new Date(task.stepStartedAt).toLocaleString() +
      "\n" +
      (task.isPaused ? "\nEN PAUSE" : "") +
      (task.lastMessage ? "\nDernier message: " + task.lastMessage : "");
}
