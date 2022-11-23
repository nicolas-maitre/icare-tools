// @ts-check
// ==UserScript==
// @name        iCare Task Tools
// @namespace   Violentmonkey Scripts
// @noframes
// @match       https://icare-vali.lausanne.ch/icare/*
// @match       https://icare.lausanne.ch/icare/*
// @grant       none
// @version     1.0
// @author      Nicolas Maitre
// @description Task scheduler for icare
// @require     https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js
// @require     https://unpkg.com/localforage@1.10.0/dist/localforage.min.js
// ==/UserScript==

//use violentmonkey for custom editor

// const STEP_BY_STEP = true;
const STEP_BY_STEP = false;

/** @type {import("xlsx")} */
// @ts-ignore ts doesn't know it exists
const XLSX = window.XLSX;
/** @type {import("localforage")} */
// @ts-ignore ts doesn't know it exists
const localforage = window.localforage;
/** @type {string} */
// @ts-ignore
const locale = window.locale;

(() => {
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

  /** @type {BindRef<HTMLDivElement>} */
  const frontDivRef = {};
  /** @type {BindRef<HTMLDivElement>} */
  const toolWindowRef = {};

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
    ToolWindow(toolWindowRef)
  );

  /**
   * @param {BindRef<HTMLDivElement>} [ref]
   */
  function ToolWindow(ref) {
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
      WindowFillContractsClassesSection(),
      WindowApplyPercentFacturation()
      // WindowTestSection(),
    );
  }

  function WindowFillContractsClassesSection() {
    /** @type {BindRef<HTMLButtonElement>} */
    const submitButtonRef = {};
    /** @type {BindRef<HTMLFormElement>} */
    const formRef = {};

    return createElem(
      "p",
      null,
      createElem("h3", null, "Remplissage des contrats sans classes"),
      createElem(
        "form",
        {
          onsubmit: onSubmit,
          bindTo: formRef,
          style: {
            borderLeft: "3px solid gray",
            paddingLeft: "10px",
            display: "flex",
            flexFlow: "column",
            alignItems: "flex-start",
            gap: "10px",
          },
        },
        createElem(
          "label",
          { htmlFor: "inputAllStudents" },
          "Feuille Excel avec tous les élèves (Nom, Prenom, DateNaissance, ClasseCourante)"
        ),
        createElem("input", {
          name: "allStudents",
          type: "file",
          accept: ".xlsx, .xlsm, .xls",
          required: true,
          id: "inputAllStudents",
        }),
        createElem(
          "label",
          { htmlFor: "inputWrongContracts" },
          "Feuille Excel avec les contrats incomplèts (e id, e nom, e prenom, institution, institution id)"
        ),
        createElem("input", {
          name: "wrongContracts",
          type: "file",
          accept: ".xlsx, .xlsm, .xls",
          required: true,
          id: "inputWrongContracts",
        }),
        createElem(
          "div",
          null,
          createElem("input", {
            type: "checkbox",
            id: "checkboxAutoUseFirstDuplicateData",
            name: "autoUseFirstDuplicateData",
          }),
          createElem(
            "label",
            {
              htmlFor: "checkboxAutoUseFirstDuplicateData",
              style: { margin: "0 0 0 .5em" },
            },
            "Toujours sélectionner la première école/classe en cas de résultats similaires."
          )
        ),
        createElem(
          "div",
          null,
          createElem("input", {
            type: "checkbox",
            id: "checkboxAutoSkipNotFound",
            name: "autoSkipNotFound",
          }),
          createElem(
            "label",
            {
              htmlFor: "checkboxAutoSkipNotFound",
              style: { margin: "0 0 0 .5em" },
            },
            "Toujours ignorer les contrats introuvable. (Une liste sera affichée à la fin de l'éxecution)"
          )
        ),
        createElem(
          "div",
          null,
          createElem("input", {
            type: "checkbox",
            id: "checkboxAutoSelectLastContract",
            name: "autoSelectLastContract",
          }),
          createElem(
            "label",
            {
              htmlFor: "checkboxAutoSelectLastContract",
              style: { margin: "0 0 0 .5em" },
            },
            "Toujours sélectionner le dernier contrat lorsque plusieurs sont disponibles. (Une liste sera affichée à la fin de l'éxecution)"
          )
        ),
        createElem(
          "fieldset",
          null,
          createElem(
            "legend",
            { style: { fontSize: "1em", marginInlineEnd: "1em" } },
            "Si une donnée est déjà enregistrée"
          ),
          createElem("input", {
            name: "existingDataStrat",
            type: "radio",
            id: "radioExistingDataStratAsk",
            value: "ask",
            style: { margin: "0 .5em" },
            checked: true,
          }),
          createElem(
            "label",
            { htmlFor: "radioExistingDataStratAsk" },
            "Toujours demander"
          ),
          createElem("br"),
          createElem("input", {
            name: "existingDataStrat",
            type: "radio",
            id: "radioExistingDataStratSkip",
            value: "skip",
            style: { margin: "0 .5em" },
          }),
          createElem(
            "label",
            { htmlFor: "radioExistingDataStratSkip" },
            "Toujours ignorer"
          ),
          createElem("br"),
          createElem("input", {
            name: "existingDataStrat",
            type: "radio",
            id: "radioExistingDataStratForce",
            value: "force",
            style: { margin: "0 .5em" },
          }),
          createElem(
            "label",
            { htmlFor: "radioExistingDataStratForce" },
            "Toujours remplacer"
          )
        ),
        createElem(
          "button",
          { type: "submit", bindTo: submitButtonRef },
          "Démarrer"
        )
      )
    );

    /**
     * @param {SubmitEvent} evt
     */
    async function onSubmit(evt) {
      evt.preventDefault();
      //type checking
      if (!submitButtonRef.current || !formRef.current) {
        alert("erreur d'initialisation");
        return;
      }

      /**
       * @typedef {{
       *    allStudents: File,
       *    wrongContracts: File,
       *    autoUseFirstDuplicateData?: "on",
       *    autoSkipNotFound?: "on",
       *    autoSelectLastContract?: "on",
       *    existingDataStrat: ExistingDataStrategy,
       * }} FormEntries
       * @type {FormEntries} */
      // @ts-ignore We know what's in the form
      const formData = Object.fromEntries(
        new FormData(formRef.current).entries()
      );

      if (!formData.allStudents || !formData.wrongContracts) {
        alert("Merci de déposer tous les fichiers");
        return;
      }

      submitButtonRef.current.disabled = true;

      const [allPeopleBuffer, wrongContractsBuffer] = await Promise.all([
        formData.allStudents.arrayBuffer(),
        formData.wrongContracts.arrayBuffer(),
      ]);

      const allPeopleWorkbook = XLSX.read(allPeopleBuffer);
      let selectedAllPeopleSheet = 0;
      if (allPeopleWorkbook.SheetNames.length > 1) {
        const promptRes = promptIndex(
          "Tableur agapeo: Sélectionnez la feuille de données",
          allPeopleWorkbook.SheetNames,
          0,
          true
        );
        if (promptRes === null) {
          submitButtonRef.current.disabled = false;
          return;
        }
        selectedAllPeopleSheet = promptRes;
      }
      const allPeopleSheet =
        allPeopleWorkbook.Sheets[
          allPeopleWorkbook.SheetNames[selectedAllPeopleSheet]
        ];
      /** @type {FillContractsClassePerson[]} */
      const allPeopleJSON = XLSX.utils.sheet_to_json(allPeopleSheet);
      if (
        !Array.isArray(allPeopleJSON) ||
        !objectContainsKeys(allPeopleJSON[0], [
          "Nom",
          "Prenom",
          "DateNaissance",
        ])
      ) {
        submitButtonRef.current.disabled = false;
        alert("Le fichier d'élèves est vide ou corrompu. Veuillez réessayer.");
        console.error(allPeopleJSON[0]);
        return;
      }
      namedLog({ allPeopleJSON });

      const wrongContractsWorkbook = XLSX.read(wrongContractsBuffer);

      let selectedWrongContractsSheet = 0;
      if (wrongContractsWorkbook.SheetNames.length > 1) {
        const promptRes = promptIndex(
          "Tableur des contrats incomplêts: Sélectionnez la feuille de données",
          wrongContractsWorkbook.SheetNames,
          0,
          true
        );
        if (promptRes === null) {
          submitButtonRef.current.disabled = false;
          return;
        }
        selectedWrongContractsSheet = promptRes;
      }
      const wrongContractsSheet =
        wrongContractsWorkbook.Sheets[
          wrongContractsWorkbook.SheetNames[selectedWrongContractsSheet]
        ];

      /** @type {FillContractsClasseContract[]} */
      const wrongContractsJSON = XLSX.utils.sheet_to_json(wrongContractsSheet);
      if (
        !Array.isArray(wrongContractsJSON) ||
        !objectContainsKeys(wrongContractsJSON[0], [
          "e id",
          "e nom",
          "e prenom",
          "institution",
          "institution id",
        ])
      ) {
        submitButtonRef.current.disabled = false;
        alert(
          "Le fichier de contrats est vide ou corrompu. Veuillez réessayer."
        );
        return;
      }

      namedLog({ wrongContractsJSON });

      const contractsById = Object.fromEntries(
        wrongContractsJSON.map((wc) => [wc["e id"], wc])
      );

      const contractsIdsToHandle = Object.keys(contractsById).sort(
        (a, b) => parseInt(a) - parseInt(b)
      );
      // .slice(127); //TODO: debug

      // const contractsIdsToHandle = [];

      /** @type {FillContractClassesSharedData} */
      const taskData = {
        contracts: contractsById,
        contractsIds: contractsIdsToHandle,
        existingDataStrategy: formData.existingDataStrat,
        shouldSelectFirstData: formData.autoUseFirstDuplicateData === "on",
        shouldSkipContractNotFound: formData.autoSkipNotFound === "on",
        shouldSelectLastContractNotFound:
          formData.autoSelectLastContract === "on",
        contractsNotFound: {},
        contractsDuplicates: {},
        contractByContractMode: false,
      };

      setNewTask(
        "fillContractClasses",
        taskData,
        allPeopleJSON,
        "Remplissage des contrats sans classe."
      );

      hideWindow();
      submitButtonRef.current.disabled = false;
    }
  }

  function WindowApplyPercentFacturation() {
    return createElem(
      "p",
      null,
      createElem("h3", null, "Deduction FAJE 20%"),
      createElem(
        "form",
        {
          onsubmit: onSubmit,
          style: {
            borderLeft: "3px solid gray",
            paddingLeft: "10px",
            display: "flex",
            flexFlow: "column",
            alignItems: "flex-start",
            gap: "10px",
          },
        },
        "Lancez la procédure depuis la liste des journaux de facturation",
        createElem("button", { type: "submit" }, "Démarrer")
      )
    );

    /**
     * @param {SubmitEvent} evt
     */
    function onSubmit(evt) {
      evt.preventDefault();
      hideWindow();
      /** @type {ApplyPercentFacturationSharedData} */
      const newTask = {
        factures: {},
        idsToHandle: [],
        text: "Déduction FAJE 20%",
      };
      setNewTask(
        "applyPercentFacturation",
        newTask,
        undefined,
        "Ajoute un entrée de rabais à une liste de factures."
      );
    }
  }

  function WindowTestSection() {
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

  /** @type {BindRef<HTMLParagraphElement>} */
  const taskWindowInfos = {};
  /** @type {BindRef<HTMLButtonElement>} */
  const taskWindowResumeButtonRef = {};
  const taskWindow = e(document.body).addElem(
    "div",
    {
      async onclick() {
        if (
          confirm(
            "Êtes vous sûr de vouloir arrêter l'execution de la tâche courante?"
          )
        ) {
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
          taskWindow.style.height = taskWindow.style.height ? "" : "5em";
        },
      },
      "__"
    ),
    createElem(
      "h4",
      null,
      "TÂCHE EN COURS,",
      createElem("br"),
      "CLIQUEZ ICI POUR ANNULER"
    ),
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

  /** @type {TaskParams | undefined} */
  let _lastTaskParams;
  /**
   * @param {Task | null} [task]
   */
  async function refreshTaskWindow(task) {
    if (!task && task !== null) task = await getCurrentTask();

    if (!task) {
      taskWindow.style.visibility = "hidden";
      return;
    }

    taskWindow.style.visibility = "visible";

    const taskParams = taskMap[task.name];
    if (_lastTaskParams !== taskParams) {
      _lastTaskParams?.actionsElems?.forEach((e) => e.remove());
      taskParams.actionsElems?.forEach((e) => taskWindow.appendChild(e));
      _lastTaskParams = taskParams;
    }

    if (taskWindowResumeButtonRef.current)
      taskWindowResumeButtonRef.current.style.display = task.isPaused
        ? "block"
        : "none";

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

  function hideWindow() {
    if (!frontDivRef.current || !toolWindowRef.current) return;
    frontDivRef.current.style.visibility = "hidden";
    toolWindowRef.current.style.visibility = "hidden";
  }
  function showWindow() {
    if (!frontDivRef.current || !toolWindowRef.current) return;
    frontDivRef.current.style.visibility = "visible";
    toolWindowRef.current.style.visibility = "visible";
  }

  //
  // TASKS manager
  //

  /**
   * @typedef {{
   *  name: keyof typeof taskMap,
   *  description?: string,
   *  isPaused: boolean,
   *  stepName: "start" | "success" | string,
   *  startedAt: number,
   *  endedAt?: number,
   *  stepStartedAt: number,
   *  lastMessage?: string,
   *  sharedData: any,
   * }} Task
   */

  /**
   * @typedef {{
   *    taskFn: ((task: Task)=> Promise<void>);
   *    actionsElems?: Element[];
   * }} TaskParams
   */

  /** @type {TaskParams} */
  const fillContractClassesTaskParams = {
    taskFn: fillContractClassesTaskFn,
    actionsElems: [
      createElem(
        "button",
        {
          async onclick(e) {
            e.stopPropagation();
            if (!confirm("Êtes vous sûr de vouloir passer au contrat suivant?"))
              return;
            const task = await getCurrentTask();
            if (!task) return;
            nextTaskStep("endOfLoop", { ...task, isPaused: false });
          },
        },
        "Passer au contrat suivant"
      ),
    ],
  };

  /** @type {TaskParams} */
  const applyPercentFacturationTaskParams = {
    taskFn: applyPercentFacturationTaskFn,
  };

  const taskMap = {
    /** @type {TaskParams} */
    test: { taskFn: testTask },
    fillContractClasses: fillContractClassesTaskParams,
    applyPercentFacturation: applyPercentFacturationTaskParams,
  };

  async function handleTasks() {
    const [task, shouldKillTask] = await Promise.all([
      getCurrentTask(),
      localforage.getItem("LTShouldStopTask"),
    ]);

    //kill task
    if (shouldKillTask) {
      await removeCurrentTask();
      await localforage.removeItem("LTShouldStopTask");
      return;
    }

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
      await taskMap[task.name].taskFn(task);
    } catch (e) {
      const brokenTask = await getCurrentTask();
      console.error(
        `An error occured in the task ${task.name} at step ${task.stepName}. Pausing the task.`,
        e,
        task,
        brokenTask
      );
      if (brokenTask)
        await setCurrentTask({
          ...brokenTask,
          isPaused: true,
          lastMessage: e.toString(),
        });
    }
  }

  /**
   * @param {Task} task
   */
  async function testTask(task) {
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

  /**
   * @typedef {{
   *      "e id":number,
   *      "institution id":number,
   *      "institution":string,
   *      "e nom": string,
   *      "e prenom": string,
   *      "e naissance"?: string
   *      schoolClass?: string,
   *      schoolName?: string,
   *  }} FillContractsClasseContract
   *
   * @typedef {{
   *      "Nom":string,
   *      "Prenom":string,
   *      "DateNaissance":string,
   *      "ClasseCourante":string,
   *      "BatimentNomOfficiel":string
   *  }} FillContractsClassePerson
   *
   * @typedef {"ask" | "skip" | "force"} ExistingDataStrategy
   *
   * @typedef {FillContractsClassePerson[]} FillContractClassesHeavyData
   *
   * @typedef {{
   *      contracts: {
   *          [id: string]: FillContractsClasseContract
   *      };
   *      contractsIds: string[];
   *      shouldSelectFirstData: boolean;
   *      shouldSkipContractNotFound: boolean;
   *      shouldSelectLastContractNotFound: boolean;
   *      existingDataStrategy: ExistingDataStrategy,
   *      contractsNotFound: {[id:string]: {fname:string, lname:string, count: number}};
   *      contractsDuplicates:{[id:string]: {fname:string, lname:string, count: number}}
   *      contractByContractMode: boolean;
   * }} FillContractClassesSharedData
   *
   * @typedef {Omit<Task, "sharedData"> & {
   *      sharedData: FillContractClassesSharedData
   * }} FillContractClasseTask
   *
   * @param {FillContractClasseTask} task
   */
  async function fillContractClassesTaskFn(task) {
    if (locale && locale.substring(0, 2) !== "fr") {
      alert(
        "Cette tâche supporte uniquement le site en français.\n" +
          "Changez la langue et continuez la tâche"
      );
      throw new Error("Cette tâche supporte uniquement le site en français.");
    }
    // @ts-ignore check for icare-helpers existence
    if (window.HAS_ICARE_HELPERS_LOADED) {
      alert(
        "Cette tâche ne peut pas fonctionner quand le script 'icare-helpers' est chargé. Désactivez le d'abord."
      );
      throw new Error("Cette tâche ne supporte pas le script 'icare-helpers'");
    }

    // @ts-ignore that's the goal dammit
    if (!window.cbc)
      // @ts-ignore
      window.cbc = async (mode = true) => {
        const lateTask = await getCurrentTask();
        if (!lateTask) return;
        /** @type {FillContractClasseTask} */
        const newTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
            contractByContractMode: mode,
          },
          lastMessage: "Mode CBC activé!",
        };
        task = await setCurrentTask(newTask);
      };

    const personId = task.sharedData.contractsIds[0];
    const person = task.sharedData.contracts[personId];
    switch (task.stepName) {
      case "start": {
        if (task.sharedData.contractsIds.length === 0) {
          nextTaskStep("success", task);
          return;
        }

        const contractsCount = Object.keys(task.sharedData.contracts).length;
        const currentContractIndex =
          contractsCount - task.sharedData.contractsIds.length + 1;
        /** @type {FillContractClasseTask} */
        const taskWithMessage = {
          ...task,
          lastMessage: `Info: Personne courante: ${personId} (${currentContractIndex}/${contractsCount})`,
        };

        //skip to step if person already known
        if (person["e naissance"])
          nextTaskStep("useDataFromAllPeople", taskWithMessage);
        else nextTaskStep("searchPerson", taskWithMessage);

        return;
      }

      case "searchPerson": {
        if (!urlCheckOrGo("/icare/Be/PersonenList.do?suchen=firstSearch"))
          return;

        /** @type {HTMLElement | null} */
        const resetFilterBtn = document.querySelector(
          "button.btn-danger.float-left"
        );
        resetFilterBtn?.click();

        /** @type {HTMLInputElement | null} */
        const personIdInput = document.querySelector(
          "#personentyp[name=perId]"
        );
        if (!personIdInput) throw new Error("person input not found");
        personIdInput.value = personId;

        /** @type {HTMLButtonElement | null} */
        const submitButton = document.querySelector(
          "form#filterForm .float-right button[type=submit]"
        );

        task = await nextTaskStep("findPerson", task, true);

        submitButton?.click();

        return;
      }

      case "findPerson": {
        if (!urlCheck("/icare/Be/PersonenList.do", "?suchen=firstSearch"))
          return;

        /** @type {NodeListOf<HTMLTableRowElement>} */
        const personLines = document.querySelectorAll(
          ".dataTable.jqResultList > tbody > tr"
        );
        if (personLines.length !== 1)
          throw new Warning(
            `Personne précise introuvable. id:${personId}. ${personLines.length} résultat(s)`
          );

        const personInfosTDs = personLines[0].getElementsByTagName("td");

        const foundId = personInfosTDs[2].textContent?.trim();
        const foundBirthday = personInfosTDs[9].textContent?.trim();

        if (foundId !== personId) {
          console.info({ foundId });
          throw new Warning(`Personne avec id ${personId} introuvable`);
        }

        /** @type {FillContractClasseTask} */
        const newTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
            contracts: {
              ...task.sharedData.contracts,
              [personId]: {
                ...task.sharedData.contracts[personId],
                "e naissance": foundBirthday,
              },
            },
          },
        };

        await nextTaskStep("useDataFromAllPeople", newTask);

        return;
      }

      case "useDataFromAllPeople": {
        /** @type {FillContractClassesHeavyData} */
        const allPeople = await getHeavyData();
        //find person in people list
        let foundPeople = allPeople.filter(
          (p) =>
            person["e nom"]
              .toLowerCase()
              .includes(p.Nom.trim().toLowerCase()) &&
            person["e naissance"] === p.DateNaissance
        );

        if (foundPeople.length === 0)
          throw new Warning(
            `${person["e nom"]} ${person["e prenom"]} introuvable dans le fichier`
          );

        let personIndex = 0;
        if (foundPeople.length > 1) {
          //search by first name
          const foundByFirstName = foundPeople.filter((p) =>
            person["e prenom"]
              .toLowerCase()
              .includes(p.Prenom.trim().toLowerCase())
          );
          if (foundByFirstName.length > 0) foundPeople = foundByFirstName;

          //prompt if still not found
          if (foundPeople.length > 1) {
            personIndex =
              promptIndex(
                "Personne exacte introuvable.\n" +
                  `Recherche: ${person["e prenom"]} ${person["e nom"]} [${personId}]` +
                  "Veuillez sélectionner la bonne personne:",
                foundPeople.map(
                  (p) => `${p.Prenom} ${p.Nom} ${p.DateNaissance}`
                )
              ) ?? 0;
          }
        }

        const foundPerson = foundPeople[personIndex];

        /** @type {FillContractClasseTask} */
        const newTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
            contracts: {
              ...task.sharedData.contracts,
              [personId]: {
                ...task.sharedData.contracts[personId],
                schoolClass: foundPerson.ClasseCourante,
                schoolName: foundPerson.BatimentNomOfficiel,
              },
            },
          },
        };
        task = await setCurrentTask(newTask);

        nextTaskStep("searchContract", task);
        return;
      }

      case "searchContract": {
        if (!urlCheckOrGo("/icare/Be/VertragList.do?reset=true")) return;

        /** @type {HTMLInputElement | null} */
        const contractIdInput = document.querySelector("input[name=verNr]");
        if (!contractIdInput) throw new Error("contract input not found");
        contractIdInput.value = personId;

        /** @type {HTMLSelectElement | null} */
        const institutionIdSelect = document.querySelector(
          "select[name=mandantgruppe].select2-offscreen"
        );
        if (!institutionIdSelect)
          throw new Error("institution input not found");

        const institutionId = person["institution id"].toString();

        institutionIdSelect.value = institutionId;
        if (institutionIdSelect.value !== institutionId) {
          //store contract not found
          task = await setCurrentTask({
            ...task,
            sharedData: {
              ...task.sharedData,
              contractsNotFound: {
                ...task.sharedData.contractsNotFound,
                [personId]: {
                  fname: person["e prenom"],
                  lname: person["e nom"],
                },
              },
            },
          });

          if (task.sharedData.shouldSkipContractNotFound) {
            console.info(
              "skipping contract because the institution was not found"
            );
            nextTaskStep("endOfLoop", task);
            return;
          }
          alert(
            "La recherche ne peut pas être effectuée car l'institution n'est pas disponible.\n" +
              "Trouvez et naviguez manuellement sur le contrat puis continuez la tâche.\n" +
              `Institution: [${person["institution id"]}] ${person.institution} \n` +
              `Pour: ${person["e prenom"]} ${person["e nom"]} [${personId}]`
          );
          task = await nextTaskStep("openContractEditPage", task, true);
          throw new Warning(
            `Institution introuvable:[${institutionId}] "${person.institution}", p-id:${personId}.`
          );
        }

        /** @type {HTMLFormElement | null} */
        const contractForm = document.querySelector(
          "form[name=VertragListeForm]"
        );
        if (!contractForm) throw new Error("contract form not found");

        task = await nextTaskStep("findContract", task, true);

        contractForm.submit();

        return;
      }

      case "findContract": {
        if (!urlCheck("/icare/Be/VertragList.do", "?reset=true")) return;

        /** @type {NodeListOf<HTMLTableRowElement>} */
        const contractLines = document.querySelectorAll(
          "#ver.dataTable > tbody > tr"
        );

        /**
         * @param {HTMLTableRowElement} tr
         */
        function getContractLineCells(tr) {
          const tds = tr.getElementsByTagName("td");
          const [
            id,
            name,
            institution,
            group,
            dates,
            clientGroup,
            internalMessage,
            deleteDate,
          ] = tds;

          const [startDate, endDate] =
            dates.textContent?.trim()?.split(" - ") ?? [];

          return {
            id,
            name,
            institution,
            group,
            dates,
            startDate,
            endDate,
            clientGroup,
            internalMessage,
            deleteDate,
          };
        }

        /** @type {ReturnType<typeof getContractLineCells> | undefined} */
        let contractCells = undefined;

        //Precise contract not found
        if (contractLines.length !== 1) {
          //Store contract that wasn't found
          /** @type {FillContractClasseTask} */
          const newTask = {
            ...task,
            sharedData: {
              ...task.sharedData,
            },
          };
          if (contractLines.length === 0)
            newTask.sharedData.contractsNotFound = {
              ...task.sharedData.contractsNotFound,
              [personId]: {
                fname: person["e prenom"],
                lname: person["e nom"],
                count: contractLines.length,
              },
            };
          else
            newTask.sharedData.contractsDuplicates = {
              ...task.sharedData.contractsDuplicates,
              [personId]: {
                fname: person["e prenom"],
                lname: person["e nom"],
                count: contractLines.length,
              },
            };

          task = await setCurrentTask(newTask);

          //auto skip if no contract found
          if (
            task.sharedData.shouldSkipContractNotFound &&
            contractLines.length === 0
          ) {
            console.info("skipping contract because it wasn't found.");
            nextTaskStep("endOfLoop", task);
            return;
          }

          //select last if multiple results
          if (task.sharedData.shouldSelectLastContractNotFound) {
            contractCells = [...contractLines]
              .map(getContractLineCells)
              .reduce((prev, curr) => {
                const currDate = new Date(
                  curr.startDate.split(".").reverse().join("-")
                );
                const prevDate = new Date(
                  prev.startDate.split(".").reverse().join("-")
                );
                return currDate > prevDate ? curr : prev;
              });
          } else {
            //prompt user to choose correct contract
            alert(
              "Contrat précis introuvable.\n" +
                "Naviguez sur le contrat concerné et/ou continuez la tâche.\n" +
                `Institution: [${person["institution id"]}] ${person.institution} \n` +
                `Pour: ${person["e prenom"]} ${person["e nom"]} [${personId}]`
            );
            task = await nextTaskStep("openContractEditPage", task, true);

            throw new Warning(
              `Contrat précis introuvable. p-id:${personId}. ${contractLines.length} résultat(s)`
            );
          }
        } else {
          contractCells = getContractLineCells(contractLines[0]);
        }

        const foundContractId = contractCells.id.textContent?.trim();
        if (!foundContractId?.includes(personId))
          throw new Error(
            `Contrat de la personne ${personId} introuvable. Contrat faux ${foundContractId} trouvé.`
          );

        const contractLink = contractCells.id.querySelector("a");
        if (!contractLink) throw new Error("contract link not found");

        task = await nextTaskStep("openContractEditPage", task, true);
        contractLink.click();
        return;
      }

      case "openContractEditPage": {
        if (
          !urlCheck(
            "/icare/Be/VertragEdit.do?method=main&aktuelle=true&theVerId="
          )
        )
          return;

        //check if id is still the same
        const nameAndIdH2 = document.querySelector("#data h2");
        if (!nameAndIdH2?.textContent?.includes(personId))
          throw new Error("L'id du contrat ne correspond pas.");

        /** @type {HTMLIFrameElement} */
        const iframe = await waitForSelector(
          "iframe[name=klassifizierungframe]"
        );
        if (!iframe) throw new Error("iframe de contrat introuvable");
        const iframeSrc = await waitForValue(() => iframe.src || undefined);
        if (!iframeSrc) {
          console.log("iframe src", iframe.src, iframe);
          alert(
            "Impossible d'accéder aux modifications. Essayez de recharger la page puis continuez la tâche"
          );
          throw new Error("url de l'iframe introuvable. id:" + personId);
        }

        task = await nextTaskStep("fillContractCollege", task, true);

        window.location.href = iframe.src;

        return;
      }

      case "fillContractCollege": {
        if (
          !urlCheck([
            "/icare/KlassifizierungSave.do",
            "/icare/PrepareKlassifizierung.do",
          ])
        )
          return;

        await fillContractData(
          task,
          "Collège",
          person.schoolName,
          "fillContractClass"
        );

        // nextTaskStep("fillContractClass", task, true);

        return;
      }

      case "fillContractClass": {
        if (
          !urlCheck([
            "/icare/KlassifizierungSave.do",
            "/icare/PrepareKlassifizierung.do",
          ])
        )
          return;

        await fillContractData(
          task,
          "Classe et enseignant",
          person.schoolClass,
          "endOfLoop"
        );

        // nextTaskStep("endOfLoop", task, true);

        return;
      }

      case "endOfLoop": {
        /** @type {FillContractClasseTask} */
        const newTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
            contractsIds: task.sharedData.contractsIds.slice(1),
          },
        };

        //step by step check
        if (newTask.sharedData.contractByContractMode) {
          task = await nextTaskStep("start", newTask, true);
          throw new Warning("Mode pas à pas");
        }

        nextTaskStep("start", newTask);

        return;
      }
      case "success": {
        console.info("CONTRATS INTROUVABLES:");
        console.table(task.sharedData.contractsNotFound);
        console.info("CONTRATS MULTIPLES:");
        console.table(task.sharedData.contractsDuplicates);

        //store end time
        const endedAt = Date.now();
        task = await setCurrentTask({ ...task, endedAt });

        //store finished task
        (async () => {
          const finishedTasks =
            (await localforage.getItem("LTFinishedTasks")) ?? [];
          /** @type {FillContractClasseTask} */
          const cleanTask = {
            ...task,
            sharedData: {
              ...task.sharedData,
              contracts: {},
            },
          };
          await localforage.setItem("LTFinishedTasks", [
            ...finishedTasks,
            cleanTask,
          ]);
        })();

        const elapsedTimeString = new Date(endedAt - task.startedAt)
          .toISOString()
          .substring(11, 19);

        const contractsNotFoundEntries = Object.entries(
          task.sharedData.contractsNotFound
        );
        const contractDuplicatesEntries = Object.entries(
          task.sharedData.contractsDuplicates
        );
        //display end of task infos
        alert(
          `Tâche terminée! (en ${elapsedTimeString}) \n` +
            `[F12] Listes complêtes affichées dans la console\n` +
            `${contractsNotFoundEntries.length} contrats pas trouvés sur ${
              Object.keys(task.sharedData.contracts).length
            }.\n` +
            contractsNotFoundEntries
              .map(
                ([id, { fname, lname }], i) => `${i}. [${id}] ${fname} ${lname}`
              )
              .join("\n") +
            `${contractDuplicatesEntries.length} contrats multiples sur ${
              Object.keys(task.sharedData.contracts).length
            }.\n` +
            contractDuplicatesEntries
              .map(
                ([id, { fname, lname }], i) => `${i}. [${id}] ${fname} ${lname}`
              )
              .join("\n")
        );

        await removeCurrentTask();
        return;
      }
      default: {
        throw new Error("Étape introuvable");
      }
    }
  }

  /**
   * @typedef {{
   *    number: number;
   *    text: string;
   *    compteDeb: string;
   *    ctrCostDeb: string;
   *    compteCred: string;
   *    ctrCostCred: string;
   *    priceAsCents: number;
   * }} Order
   *
   * @typedef {{
   *    id: string,
   *    href: string,
   *    orders?: Order[],
   *    newOrders?: Order[],
   *    newOrderIndex?: number,
   * }} Facture
   *
   * @typedef {{
   *    factures: {
   *      [id:string]: Facture,
   *    };
   *    idsToHandle:string[];
   *    text: string;
   * }} ApplyPercentFacturationSharedData
   *
   * @typedef {Omit<Task, "sharedData"> & {
   *      sharedData: ApplyPercentFacturationSharedData
   * }} ApplyPercentFacturationTask
   *
   * @param {ApplyPercentFacturationTask} task
   */
  async function applyPercentFacturationTaskFn(task) {
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
        /** @type {HTMLTableRowElement[]} */
        // @ts-ignore
        const TRs = [
          ...document.querySelectorAll("#jqFjDisplayTable > tbody > tr"),
        ];

        const factures = Object.fromEntries(
          TRs.map((tr) => {
            const cells = tr.querySelectorAll("td");
            /** @type {HTMLAnchorElement | null} */
            const numberLink = cells[1].querySelector("a");
            if (!numberLink) throw new Error("Imposteur de lien...");
            const id = numberLink.textContent?.trim() ?? "";
            const href = numberLink.href;
            /** @type {Facture} */
            const facture = { id, href };
            return [id, facture];
          })
        );

        const idsToHandle = Object.keys(factures);

        /** @type {ApplyPercentFacturationTask} */
        const newTask = {
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
        const currentIndex =
          facturesCount - task.sharedData.idsToHandle.length + 1;

        /** @type {ApplyPercentFacturationTask} */
        const taskWithMessage = {
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
        const rows = [
          ...(tbody?.querySelectorAll("tr[class=even], tr[class=odd]") ?? []),
        ];
        const orders = rows.map((row) => {
          const inputs = getFacInputs(row);

          const priceAsCents = Math.round(parseFloat(inputs.price.value) * 100);
          if (isNaN(priceAsCents)) throw new Error("invalid price");

          const orderNumber = parseInt(inputs.orderId.value);
          if (isNaN(orderNumber))
            throw new Error(
              "order number is not a number " + inputs.orderId.value
            );

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

          /** @type {Order} */
          const order = {
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

        /** @type {ApplyPercentFacturationTask} */
        const newTask = {
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
        if (
          (currentFacture.newOrderIndex ?? Infinity) >=
          (currentFacture.newOrders?.length ?? 0)
        ) {
          nextTaskStep("dummyStep", task);
          return;
        }
        nextTaskStep("newOrder_fillOrder", task);
        return;
      }

      case "newOrder_fillOrder": {
        const orderToFill =
          currentFacture.newOrders?.[currentFacture.newOrderIndex ?? Infinity];
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

        /** @type {HTMLButtonElement | null} */
        const submitButton = document.querySelector(
          "div.col > div > button[type=button][onclick].btn-success"
        );
        if (!submitButton) throw new Error("no submit button");
        submitButton.click();

        //TODO: instant execution may cause problems with saving.
        nextTaskStep("newOrder_endOfLoop", task);
        return;
      }

      case "newOrder_endOfLoop": {
        /** @type {ApplyPercentFacturationTask} */
        const newTask = {
          ...task,
          sharedData: {
            ...task.sharedData,
            factures: {
              ...task.sharedData.factures,
              [factureId]: {
                ...task.sharedData.factures[factureId],
                newOrderIndex:
                  (task.sharedData.factures[factureId].newOrderIndex ?? 0) + 1,
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
        /** @type {ApplyPercentFacturationTask} */
        const newTask = {
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

  /**
   * @param {Element} parent
   */
  function getFacInputs(parent) {
    const TDs = parent.querySelectorAll("td[valign]");
    /** @type {HTMLInputElement | null} */
    const orderId = TDs[0].querySelector(
      "form[name=FakturaPositionEditForm] > input.input[name=fpReihenfolge]"
    );
    /** @type {HTMLTextAreaElement | null} */
    const text = TDs[1].querySelector("textarea[name=fpText]");
    /** @type {HTMLTextAreaElement | null} */
    const compteDeb = TDs[2].querySelector("textarea[name=fpKonto]");
    /** @type {HTMLTextAreaElement | null} */
    const ctrCostDeb = TDs[3].querySelector("textarea[name=fpKostSt]");
    /** @type {HTMLTextAreaElement | null} */
    const compteCred = TDs[4].querySelector("textarea[name=fpKontoHaben]");
    /** @type {HTMLTextAreaElement | null} */
    const ctrCostCred = TDs[5].querySelector("textarea[name=fpKostStHaben]");
    /** @type {HTMLInputElement | null} */
    const price = TDs[9].querySelector("input[name=fpPreis]");

    if (
      !orderId ||
      !text ||
      !compteDeb ||
      !ctrCostDeb ||
      !compteCred ||
      !ctrCostCred ||
      !price
    ) {
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

  /**
   * @param {FillContractClasseTask} task
   * @param {string} name
   * @param {string | undefined} value
   * @param {string} nextStep
   */
  async function fillContractData(task, name, value, nextStep) {
    const person = task.sharedData.contracts[task.sharedData.contractsIds[0]];

    if (value === undefined) {
      alert(
        `Aucune valeur fournie pour ${name}.\n` +
          `
      Entrez la donnée manuellement et continuez la tâche\n` +
          `Personne: [${person["e id"]}] ${person["e prenom"]} ${person["e nom"]}`
      );
      task = await nextTaskStep(nextStep, task, true);
      throw new Error(
        `Aucune valeur fournie pour ${name}. p.id: ${person["e id"]}`
      );
    }

    /** @type {NodeListOf<HTMLTableElement>} */
    const tables = document.querySelectorAll("#theKlForm > table.sortable");
    /** @type {HTMLSelectElement | undefined} */
    let select;
    /** @type {HTMLButtonElement | undefined} */
    let saveButton;

    for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
      const table = tables[tableIndex];

      /** @type {NodeListOf<HTMLTableRowElement>} */
      const TRList = table.querySelectorAll(
        "table > thead > tr, table > tbody > tr"
      );
      const TRs = [...TRList];

      const nameTR = tableIndex === 0 ? TRs[1] : TRs[0];
      const nameFromTR = nameTR?.textContent?.trim();
      if (!nameFromTR?.includes(name)) continue;

      const dataTR = tableIndex === 0 ? TRs[2] : TRs[1];

      // @ts-ignore element type specified in the query
      select =
        dataTR?.querySelector("td > span > select.inputNoWidth") ?? undefined;
      // @ts-ignore element type specified in the query
      saveButton = dataTR?.querySelector("td > button.link") ?? undefined;
      if (
        !saveButton
          ?.getAttribute("onclick")
          ?.includes("javascript:saveEntry('KlassifizierungForm'")
      )
        throw new Error("Imposteur de bouton de sauvegarde (btn pas trouvé)");

      break;
    }

    console.log({ name, select, saveButton });

    if (!select || !saveButton) {
      alert(
        `L'entrée ${name} est introuvable. Vérifiez et créez la si besoin.\nEnsuite relancez la tâche`
      );
      throw new Warning(`Ligne ${name} introuvable.`);
    }

    //Already a value inside the select
    if (select.value !== "0") {
      //Ask to overwrite
      if (
        task.sharedData.existingDataStrategy === "ask" &&
        !confirm(
          `${name} déjà renseigné.\nSouhaitez vous l'écraser?\n` +
            `Valeur: '${value}'`
        )
      ) {
        alert(
          `Vérifiez/renseignez le collège, enregistrez puis continuez la tâche.`
        );
        task = await nextTaskStep(nextStep, task, true);
        throw new Warning(`Vérifier/Renseigner manuellement ${name}`);
      }
      //Skip to next step
      else if (task.sharedData.existingDataStrategy === "skip") {
        console.info(
          "skipping to next step according to existingData strategy"
        );
        task = await nextTaskStep(nextStep, task, true);
        return;
      }
    }

    //find matching name
    const optionsToSelect = [...select.options].filter((op) =>
      op.textContent
        ?.trim()
        .split("''")
        .join("'")
        .includes(value.trim().split("''").join("'"))
    );

    let resIndexChosen = 1;
    if (!task.sharedData.shouldSelectFirstData && optionsToSelect.length > 1) {
      do {
        const txtRes = prompt(
          `Veuillez choisir la bonne valeur pour '${name}'.\n\n` +
            `Valeur cherchée: '${value}'\n` +
            `Personne: ${person["e prenom"]} ${person["e nom"]} [${person["e id"]}]\n\n` +
            optionsToSelect
              .map((o, i) => `[${i + 1}] ${o.textContent?.trim()}`)
              .join("\n"),
          resIndexChosen.toString()
        );
        if (txtRes === null) {
          alert(
            `Entrez manuellement la valeur de ${name}.\nValeur du fichier: ${value}\n` +
              `Personne: [${person["e id"]}] ${person["e prenom"]} ${person["e nom"]}`
          );
          task = await nextTaskStep(nextStep, task, true);
          throw new Warning(
            `Entrer manuellement: ${name}: "${value}". p.id: ${person["e id"]}`
          );
        }
        resIndexChosen = parseInt(txtRes);
      } while (
        isNaN(resIndexChosen) ||
        resIndexChosen < 1 ||
        resIndexChosen > optionsToSelect.length
      );
    }

    const optionToSelect = optionsToSelect[resIndexChosen - 1];

    if (!optionToSelect?.value) {
      alert(
        `${name}: '${value}': introuvable dans les listes. Renseignez le manuellement puis enregistrez. Ensuite continuez la tâche.\n` +
          `Personne: [${person["e id"]}] ${person["e prenom"]} ${person["e nom"]}`
      );
      task = await nextTaskStep(nextStep, task, true);
      throw new Warning(
        `${name}: '${value}' introuvable. Renseigner manuellement. p.id: ${person["e id"]}`
      );
    }

    //skip if already right value
    if (select.value === optionToSelect.value) {
      nextTaskStep(nextStep, task);
      return;
    }

    task = await nextTaskStep(nextStep, task, true);
    select.value = optionToSelect.value;
    saveButton.click();
  }

  //exec on page load
  handleTasks();

  /**
   * @param {Task} task
   */
  async function setCurrentTask(task) {
    await localforage.setItem("LTCurrentTask", task);
    refreshTaskWindow(task);
    return task;
  }
  /**
   * @return {Promise<Task | null>}
   */
  async function getCurrentTask() {
    return await localforage.getItem("LTCurrentTask");
  }
  // @ts-ignore we want to make it accessible
  window.getCurrentTask = getCurrentTask;

  async function removeCurrentTask() {
    await Promise.all([
      localforage.removeItem("LTCurrentTask"),
      removeHeavyData(),
    ]);
    refreshTaskWindow(null);
  }

  async function setHeavyData(value) {
    await localforage.setItem("LTHeavyData", value);
  }
  async function getHeavyData(value) {
    return await localforage.getItem("LTHeavyData");
  }
  async function removeHeavyData() {
    await localforage.removeItem("LTHeavyData");
  }

  /**
   * @param {keyof typeof taskMap} name
   * @param {any} sharedData
   * @param {any} [heavyData]
   * @param {string} [description]
   */
  async function setNewTask(name, sharedData, heavyData, description) {
    if (await getCurrentTask()) {
      alert(
        "Impossible de démarrer une nouvelle tâche. Une tâche est déjà en cours."
      );
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
      sharedData,
    };
    await Promise.all([setCurrentTask(task), setHeavyData(heavyData)]);
    handleTasks();
    return task;
  }

  /**
   * @param {string} stepName
   * @param {Task} task
   */
  async function nextTaskStep(stepName, task, willReloadPage = false) {
    // if (!task) {
    //     task = await getCurrentTask() ?? undefined;
    //     if (!task)
    //         throw new Error("no task provided");
    // }
    task = { ...task, stepName, stepStartedAt: Date.now() };

    if (STEP_BY_STEP)
      task = { ...task, isPaused: true, lastMessage: "Step by step..." };

    task = await setCurrentTask(task);

    if (!willReloadPage) handleTasks();

    return task;
  }

  /** @type {(stepName:string)=>Promise<Task>} */
  // @ts-ignore
  window.setStep = async (stepName) => {
    const task = await getCurrentTask();
    if (!task) throw new Error("No current task");
    return await nextTaskStep(stepName, task);
  };

  //
  //LIB
  //

  /**
   * @param {{
   *  [name:string]: any
   * }} values
   */
  function namedLog(values) {
    Object.entries(values).forEach(([n, v]) => console.log(n, v));
  }

  /**
   * @param {string} text
   * @param {string[]} choices
   * @param {number} [defaultIndex=0]
   * @param {boolean} [allowNull=false]
   */
  function promptIndex(text, choices, defaultIndex = 0, allowNull = false) {
    let chosenIndex = 0;
    do {
      const promptRes = window.prompt(
        text + "\n" + choices.map((t, i) => `[${i + 1}] ${t}`).join("\n"),
        `${defaultIndex + 1}`
      );

      if (promptRes === null && allowNull) return null;

      chosenIndex = parseInt(promptRes ?? "") - 1;
    } while (
      isNaN(chosenIndex) ||
      chosenIndex < 0 ||
      chosenIndex >= choices.length
    );
    return chosenIndex;
  }

  /**
   * @template {HTMLElement} T
   * @param {string | (()=>(HTMLElement|null))} selector
   * @return {Promise<T>}
   */
  function waitForSelector(selector, checkInterval = 100, maxChecks = 50) {
    /** @type {T | null} */
    // @ts-ignore because all html elements inherit from HTMLElement anyways
    const res =
      typeof selector === "function"
        ? selector()
        : document.querySelector(selector);

    return new Promise((resolve, reject) => {
      if (res === null) {
        if (maxChecks <= 0) {
          reject(new Error(`can't find element ${selector.toString()}`));
          return;
        }
        setTimeout(
          () =>
            waitForSelector(selector, checkInterval, maxChecks - 1)
              // @ts-ignore because all html elements inherit from HTMLElement anyways
              .then(resolve)
              .catch(reject),
          checkInterval
        );
      } else {
        resolve(res);
      }
    });
  }

  /**
   * @template T
   * @param {()=>((T | undefined) | Promise<T | undefined>)} getter
   * @return {Promise<T | undefined>}
   */
  async function waitForValue(getter, checkInterval = 100, maxChecks = 50) {
    const res = await getter();
    return new Promise((resolve) => {
      if (res === undefined) {
        if (maxChecks <= 0) {
          resolve(undefined);
          return;
        }
        setTimeout(
          () =>
            waitForValue(getter, checkInterval, maxChecks - 1).then(resolve),
          checkInterval
        );
      } else {
        resolve(res);
      }
    });
  }
  /**
   * @param {string | (()=>(NodeListOf<Element>))} selector
   * @param minCount minimum count of returned elements
   * @return {Promise<NodeListOf<Element>>}
   */
  function waitForSelectorAll(
    selector,
    minCount = 1,
    checkInterval = 100,
    maxChecks = 50
  ) {
    console.log("waitForSelectorAll", maxChecks);
    const res =
      typeof selector === "function"
        ? selector()
        : document.querySelectorAll(selector);

    return new Promise((resolve, reject) => {
      if (res.length < minCount) {
        if (maxChecks <= 0) {
          reject(new Error(`can't find elements ${selector.toString()}`));
          return;
        }
        setTimeout(
          () =>
            waitForSelectorAll(selector, minCount, checkInterval, maxChecks - 1)
              .then(resolve)
              .catch(reject),
          checkInterval
        );
      } else {
        resolve(res);
      }
    });
  }

  /**
   * @template {Record<string, any>} T
   * @param {T} obj
   * @param {(keyof T)[]} keys
   */
  function objectContainsKeys(obj, keys) {
    const objKeys = Object.keys(obj);
    return keys.every((k) => objKeys.includes(k.toString()));
  }

  class Warning {
    /**
     * @param {any} [message]
     */
    constructor(message) {
      this.message = message;
    }

    toString() {
      return `Warning: ${this.message ?? "(no message)"}`;
    }
  }

  /**
   * checks for correct url or goes there
   * @param {string} url
   * @param {string} [exclude]
   */
  function urlCheckOrGo(url, exclude) {
    if (urlCheck(url, exclude)) return true;
    window.location.href = url;
    return false;
  }

  /**
   * @param {string | string[]} url
   * @param {string} [exclude]
   */
  function urlCheck(url, exclude) {
    if (typeof url === "string") url = [url];
    if (exclude && window.location.href.includes(exclude)) return false;
    return url.some((u) => window.location.href.includes(u));
  }

  /**
   * @template T
   * @typedef {{current?:T}} BindRef
   */

  /**
   * @template T
   * @typedef {Partial<Omit<T, "style">> & Record<string, any> & {
   *  bindTo?: BindRef<HTMLElement>,
   *  style?: Partial<HTMLElement["style"] & Record<`--${string}`, string>>
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
    const el = document.createElement(type);
    Object.entries(props ?? {}).forEach(([name, val]) => {
      if (name === "dataset") {
        Object.assign(el[name], val);
      } else if (name === "style") {
        Object.entries(val).forEach(([k, v]) => {
          if (el.style[k] !== undefined) el.style[k] = v;
          else el.style.setProperty(k, v);
        });
      } else if (name === "bindTo") {
        val.current = el;
      } else {
        el[name] = val;
      }
    });

    el.append(...children);

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
    return { elem, addElem };
  }
})();
