import { taskMap } from "../lib/task";
import { BindRef, createElem } from "../lib/UITools";
import { WindowAddOtherPrestSection } from "./WindowAddOtherPrestSection";
import { WindowApplyPercentFacturation } from "./WindowApplyPercentFacturation";
import { WindowFillContractsClassesSection } from "./WindowFillContractsClassesSection";

let _frontDivRef: BindRef<HTMLDivElement> = {};
let _toolWindowRef: BindRef<HTMLDivElement> = {};

export function ToolWindow(ref: BindRef<HTMLDivElement>, frontDivRef: BindRef<HTMLDivElement>) {
  _frontDivRef = frontDivRef;
  _toolWindowRef = ref;
  return createElem(
    "div",
    {
      bindTo: ref,
      style: {
        "--width": "min(90vw, 600px)",
        display: "inline-block",
        visibility: "hidden",
        position: "relative",
        margin: "50px",
        left: "calc(50vw - calc(var(--width) / 2))",
        width: "var(--width)",
        minHeight: "200px",
        backgroundColor: "white",
        border: "1px solid gray",
        boxShadow: "5px 5px 10px #000a",
        padding: "0 10px",
      },
    },
    createElem(
      "div",
      {
        style: {
          display: "flex",
          flexFlow: "row nowrap",
          justifyContent: "space-between",
          borderBottom: "1px solid lightgray",
          fontSize: "1.5em",
        },
      },
      createElem("h2", null, "Outils"),
      createElem("button", { onclick: hideWindow }, "X")
    ),
    ...Object.values(taskMap).flatMap(({ windowSectionComponent }) =>
      windowSectionComponent ? [windowSectionComponent()] : []
    )
  );
}

export function hideWindow() {
  if (!_frontDivRef.current || !_toolWindowRef.current) return;
  _frontDivRef.current.style.visibility = "hidden";
  _toolWindowRef.current.style.visibility = "hidden";
}
export function showWindow() {
  if (!_frontDivRef.current || !_toolWindowRef.current) return;
  _frontDivRef.current.style.visibility = "visible";
  _toolWindowRef.current.style.visibility = "visible";
}
