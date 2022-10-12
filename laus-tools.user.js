// @ts-check
// ==UserScript==
// @name        iCare Helpers
// @namespace   Violentmonkey Scripts
// @match       https://icare-vali.lausanne.ch/icare/*
// @grant       none
// @version     1.0
// @author      Nicolas Maitre
// @description 07/10/2022 14:54:13 
// @require     https://unpkg.com/xlsx/dist/xlsx.full.min.js
// ==/UserScript==

//use violentmonkey for custom editor
/** @type {import("xlsx")} */
// @ts-ignore
const XLSX = window.XLSX;

(() => {
    //BUILD UI
    const mainMenuUlElement = document.querySelector("#mainmenu > ul");
    /** @type {HTMLDivElement} */
    // @ts-ignore
    const overDiv = document.querySelector("#overDiv");
    if (!(mainMenuUlElement && overDiv)) return;

    e(mainMenuUlElement).addElem("li", null,
        createElem("a", {
            onclick: showWindow,
            dataset: {
                toggle: "tooltip",
                placement: "top",
                originalTitle: "Les outils pratiques"
            }
        },
            createElem("i", { className: "fa fa-solid fa-toolbox" })
        )
    );

    Object.assign(overDiv.style, {
        position: "fixed",
        top: "0",
        left: "0",
        minWidth: "100vw",
        minHeight: "100vh",
        backgroundColor: "#000a"
    });

    const toolWindow = e(overDiv).addElem("div",
        {
            style: {
                display: "inline-block",
                position: "relative",
                top: "50px",
                left: "50px",
                width: "calc(100vw - 100px)",
                minHeight: "200px",
                backgroundColor: "white",
                border: "1px solid gray",
                boxShadow: "5px 5px 10px #000a",
                padding: "0 10px"
            }
        },
        createElem("div",
            {
                style: {
                    display: "flex",
                    flexFlow: "row nowrap",
                    justifyContent: "space-between",
                    borderBottom: "1px solid lightgray",
                    fontSize: "1.5em",
                }
            },
            createElem("h2", null, "Outils"),
            createElem("button", { onclick: hideWindow }, "X")
        ),
        WindowFillContractsClassesSection(),
        WindowTestSection(),
    );

    function WindowFillContractsClassesSection() {
        const elems = {
            /** @type {BindRef<HTMLInputElement>} */
            inputWrongContracts: {},
            /** @type {BindRef<HTMLInputElement>} */
            inputAllStudents: {},
        }

        return createElem("p", null,
            createElem("h3", null, "Remplissage des contrats sans classes"),
            createElem("form",
                {
                    onsubmit(evt) {
                        evt.preventDefault();
                        console.log(XLSX);
                        // if (!confirm("Êtes vous sûr de vouloir continuer?"))
                        //     return;
                        // alert("go");
                    },
                    style: {
                        borderLeft: "3px solid gray",
                        paddingLeft: "10px",
                        display: "flex",
                        flexFlow: "column",
                        alignItems: "flex-start",
                        gap: "10px"
                    }
                },
                createElem("label", { htmlFor: "inputAllStudents" }, "Feuille Excel avec tous les élèves (Nom, DateNaissance, ClasseCourante)"),
                createElem("input", { type: "file", required: true, bindTo: elems.inputAllStudents, id: "inputAllStudents" }),
                createElem("label", { htmlFor: "inputWrongContracts" }, "Feuille Excel avec les contrats incomplèts (e id)"),
                createElem("input", { type: "file", required: true, bindTo: elems.inputWrongContracts, id: "inputWrongContracts" }),
                createElem("button", { type: "submit" }, "Démarrer")
            )
        )
    }

    function WindowTestSection() {
        return createElem("p", null,
            createElem("h3", null, "Test task"),
            createElem("button", {
                onclick() {
                    setNewTask("test", "Hello there", "Says hello");
                },
            },
                "Démarrer"
            ));
    }

    const taskWindow = e(document.body).addElem("div", {
        onclick() {
            if (confirm("Êtes vous sûr de vouloir arrêter l'execution de la tâche courante?")) {
                removeCurrentTask();
                alert("La tâche a été annulée en cours d'éxecution. Veuillez vérifier l'état des données.")
            }
        },
        style: {
            position: "fixed",
            top: "0",
            right: "0",
            backgroundColor: "pink",
            minHeight: "150px",
            minWidth: "200px",
            cursor: "pointer"
        }
    },
        "TÂCHE EN COURS, CLIQUEZ ICI POUR ANNULER");

    /**
     * @param {Task | null} [task]
     */
    function refreshTaskWindow(task) {
        if (!task && task !== null)
            task = getCurrentTask();

        if (!task) {
            taskWindow.style.visibility = "hidden";
            return;
        }

        taskWindow.style.visibility = "visible";
    }

    function hideWindow() {
        overDiv.style.visibility = "hidden";
        toolWindow.style.visibility = "hidden";
    }
    function showWindow() {
        overDiv.style.visibility = "visible";
        toolWindow.style.visibility = "visible";
    }

    //
    // TASKS manager
    //

    /**
     * @typedef {{
     *  name: string,
     *  description?: string,
     *  isPaused: boolean,
     *  stepName: string,
     *  startedAt: number,
     *  stepStartedAt: number,
     *  lastMessage?: string,
     *  sharedData: any
     * }} Task
     */

    const taskMap = {
        "test": testTask
    };

    function handleTasks() {
        const task = getCurrentTask();
        refreshTaskWindow(task);
        if (!task) {
            console.info("no task");
            return;
        }


        if (task.isPaused) {
            console.info(`task ${task.name} is paused`, task);
            return;
        }

        console.info(`handling task ${task.name}, step ${task.stepName}`, task);

        try {
            taskMap[task.name](task);
        } catch (e) {
            const brokenTask = getCurrentTask();
            console.error(`An error occured in the task ${task.name} at step ${task.stepName}. Pausing the task.`, e, task, brokenTask);
            if (brokenTask)
                setCurrentTask({ ...brokenTask, isPaused: true });
        }
    }

    /**
     * @param {Task} task
     */
    function testTask(task) {
        switch (task.stepName) {
            case "start":
                window.location.href = "/icare/Be/Overview.do";
                nextTaskStep("sayHello", task)
                break;
            case "sayHello":
                if (window.location.href.includes("/icare/Be/Overview.do")) {
                    alert(task.sharedData);
                    nextTaskStep("success", task);
                }
                break;
            case "success":
                alert("Task success!");
                removeCurrentTask();
                break;
        }
    }

    //exec on page load
    handleTasks();

    /**
     * @param {Task} task
     */
    function setCurrentTask(task) {
        const taskJSON = JSON.stringify(task);
        localStorage.setItem("LTCurrentTask", taskJSON);
        refreshTaskWindow(task);
    }
    /**
     * @return {Task | null} 
     */
    function getCurrentTask() {
        const taskJSON = localStorage.getItem("LTCurrentTask");
        if (!taskJSON) return null;
        return JSON.parse(taskJSON);
    }

    function removeCurrentTask() {
        localStorage.removeItem("LTCurrentTask");
        refreshTaskWindow(null);
    }


    /**
     * @param {keyof typeof taskMap} name
     * @param {any} sharedData
     * @param {string} [description]
     */
    function setNewTask(name, sharedData, description) {
        if (getCurrentTask()) {
            alert("Impossible de démarrer une nouvelle tâche. Une tâche est déjà en cours.");
            throw new Error("a task is already running");
        }

        /** @type {Task} */
        const task = {
            name,
            description,
            stepName: "start",
            startedAt: Date.now(),
            stepStartedAt: Date.now(),
            isPaused: false,
            sharedData
        }
        setCurrentTask(task);
        handleTasks();
        return task;
    }

    /**
     * @param {string} stepName
     * @param {Task} task
     */
    function nextTaskStep(stepName, task) {
        // if (!task) {
        //     task = getCurrentTask() ?? undefined;
        //     if (!task)
        //         throw new Error("no task provided");
        // }
        task = { ...task, stepName, stepStartedAt: Date.now() };
        setCurrentTask(task);
        handleTasks();
    }

    //
    //LIB
    //

    /**
     * @template T
     * @typedef {{current?:T}} BindRef
     */

    /**
     * @template T
     * @typedef {Partial<Omit<T, "style">> & Record<string, any> & {
     *  bindTo?: BindRef<HTMLElement>,
     *  style?: Partial<HTMLElement["style"]>
     * } } ElemProps 
     * //[evt: `on${string}`]:()=>any,
     */

    /**
     * @typedef {keyof HTMLElementTagNameMap} ElemType
     * @typedef {Element | string} ChildElem
     * 
     * @param {ElemType} type 
     * @param {ElemProps<HTMLElementTagNameMap[ElemType]> | null} [props] 
     * @param {ChildElem[]} children
     * 
     * @return {HTMLElementTagNameMap[ElemType]}
     */
    function createElem(type, props, ...children) {
        const DEEP_PROPS = ["dataset", "style"];
        const el = document.createElement(type);
        Object.entries(props ?? {}).forEach(([name, val]) => {
            if (DEEP_PROPS.includes(name))
                Object.assign(el[name], val);
            // else if (name.substring(0, 2) === "on" && name[2].toUpperCase() === name[2])
            //     // @ts-ignore
            //     el.addEventListener(name.substring(2).toLowerCase(), val);
            else if (name === "bindTo")
                // @ts-ignore
                val.current = el;
            else
                el[name] = val
        });
        children.forEach(child =>
            el.appendChild(
                (child instanceof Element) ? child : document.createTextNode(child)));

        return el;
    }

    /**
     * @param {Element} parent
     * @param {ElemType} type 
     * @param {ElemProps<HTMLElementTagNameMap[ElemType]> | null} [props] 
     * @param {ChildElem[]} children
     */
    function addElement(parent, type, props, ...children) {
        const el = createElem(type, props, ...children);
        parent.appendChild(el);
        return el;
    }

    /**
     * @param {Element} elem
     */
    function e(elem) {
        /**
         * @param {ElemType} type 
         * @param {ElemProps<HTMLElementTagNameMap[ElemType]> | null} [props] 
         * @param {ChildElem[]} children
         */
        function addElem(type, props, ...children) {
            return addElement(elem, type, props, ...children);
        }
        return { elem, addElem }
    }
})();
