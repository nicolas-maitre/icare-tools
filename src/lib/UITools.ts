export type BindRef<T> = { current?: T };
type ElemStyle = Partial<HTMLElement["style"] & Record<`--${string}`, string>>;
type ElemProps<T> = Partial<Omit<T, "style">> &
  Record<string, any> & {
    bindTo?: BindRef<HTMLElement>;
    style?: ElemStyle;
  };

type ElemType = keyof HTMLElementTagNameMap;
type ChildElem = Element | string;

export function createElem<T extends ElemType>(
  type: T,
  props?: ElemProps<HTMLElementTagNameMap[T]> | null,
  ...children: ChildElem[]
): HTMLElementTagNameMap[T] {
  const el = document.createElement(type);
  Object.entries(props ?? {}).forEach(([name, val]) => {
    if (name === "dataset") {
      Object.assign(el[name], val);
    } else if (name === "style") {
      Object.entries(val).forEach(([k, v]) => {
        //@ts-ignore ts doesn't understand what's going on (and I don't want to search how to to it for 2 hours)
        if (el.style[k] !== undefined) el.style[k] = v;
        else el.style.setProperty(k, v as string);
      });
    } else if (name === "bindTo") {
      val.current = el;
    } else {
      (el as Record<string, any>)[name] = val;
    }
  });

  el.append(...children);

  return el;
}

export function addElement<T extends ElemType>(
  parent: Element,
  type: T,
  props: ElemProps<HTMLElementTagNameMap[T]> | null,
  ...children: ChildElem[]
) {
  const el = createElem(type, props, ...children);
  parent.appendChild(el);
  return el;
}

export function e(elem: Element) {
  function addElem<T extends ElemType>(
    type: T,
    props: ElemProps<HTMLElementTagNameMap[T]> | null,
    ...children: ChildElem[]
  ) {
    return addElement<T>(elem, type, props, ...children);
  }
  return { elem, addElem };
}

export function promptIndex(text: string, choices: string[], defaultIndex = 0, allowNull = false) {
  let chosenIndex = 0;
  do {
    const promptRes = window.prompt(
      text + "\n" + choices.map((t, i) => `[${i + 1}] ${t}`).join("\n"),
      `${defaultIndex + 1}`
    );

    if (promptRes === null && allowNull) return null;

    chosenIndex = parseInt(promptRes ?? "") - 1;
  } while (isNaN(chosenIndex) || chosenIndex < 0 || chosenIndex >= choices.length);
  return chosenIndex;
}
