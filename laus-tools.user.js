// @ts-check
// ==UserScript==
// @name        iCare Helpers
// @namespace   Violentmonkey Scripts
// @noframes
// @match       https://icare-vali.lausanne.ch/icare/*
// @grant       none
// @version     1.0
// @author      Nicolas Maitre
// @description 07/10/2022 14:54:13
// @require     https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js
// @require     https://unpkg.com/localforage@1.10.0/dist/localforage.min.js
// ==/UserScript==

//use violentmonkey for custom editor

/** @type {import("xlsx")} */
// @ts-ignore
const XLSX = window.XLSX;
/** @type {import("localforage")} */
// @ts-ignore
const localforage = window.localforage;

(() => {
  //BUILD UI
  const mainMenuUlElement = document.querySelector("#mainmenu > ul");
  /** @type {HTMLDivElement | null} */
  const overDiv = document.querySelector("#overDiv");
  if (mainMenuUlElement && overDiv) {
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

    Object.assign(overDiv.style, {
      position: "fixed",
      top: "0",
      left: "0",
      minWidth: "100vw",
      minHeight: "100vh",
      backgroundColor: "#000a",
    });
  }

  const toolWindow = overDiv?.appendChild(ToolWindow());

  function ToolWindow() {
    return createElem(
      "div",
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
      WindowFillContractsClassesSection()
      // WindowTestSection(),
    );
  }

  function WindowFillContractsClassesSection() {
    /** @type {BindRef<HTMLInputElement>} */
    const inputAllStudents = {};
    /** @type {BindRef<HTMLInputElement>} */
    const inputWrongContracts = {};
    /** @type {BindRef<HTMLButtonElement>} */
    const submitButtonRef = {};

    return createElem(
      "p",
      null,
      createElem("h3", null, "Remplissage des contrats sans classes"),
      createElem(
        "form",
        {
          async onsubmit(evt) {
            evt.preventDefault();
            //type checking
            if (
              !(
                inputAllStudents.current &&
                inputWrongContracts.current &&
                submitButtonRef.current
              )
            ) {
              alert("erreur d'initialisation");
              return;
            }

            const allPeopleFile = inputAllStudents.current.files?.item(0);
            const wrongContractsFile =
              inputWrongContracts.current.files?.item(0);
            if (!allPeopleFile || !wrongContractsFile) {
              alert("Merci de déposer tous les fichiers");
              return;
            }

            // if (!confirm("Êtes vous sûr de vouloir continuer?"))
            //     return;
            submitButtonRef.current.disabled = true;

            const [allPeopleBuffer, wrongContractsBuffer] = await Promise.all([
              allPeopleFile.arrayBuffer(),
              wrongContractsFile.arrayBuffer(),
            ]);

            //TODO: check columns of the two file to make sur they are correct

            const allPeopleWorkbook = XLSX.read(allPeopleBuffer);
            const allPeopleSheet =
              allPeopleWorkbook.Sheets[allPeopleWorkbook.SheetNames[0]];
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
              alert(
                "Le fichier d'élèves est vide ou corrompu. Veuillez réessayer."
              );
              console.error(allPeopleJSON[0]);
              return;
            }
            console.log({ allStudentsJSON: allPeopleJSON });

            const wrongContractsWorkbook = XLSX.read(wrongContractsBuffer);
            const wrongContractsSheet =
              wrongContractsWorkbook.Sheets[
                wrongContractsWorkbook.SheetNames[0]
              ];
            /** @type {FillContractsClasseContract[]} */
            const wrongContractsJSON =
              XLSX.utils.sheet_to_json(wrongContractsSheet);
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
            console.log({ wrongContractsJSON });

            const contractsById = Object.fromEntries(
              wrongContractsJSON.map((wc) => [wc["e id"], wc])
            );

            const contractsIdsToHandle = [Object.keys(contractsById)[0]];

            /** @type {FillContractClassesSharedData} */
            const taskData = {
              contracts: contractsById,
              contractsIds: contractsIdsToHandle,
              allPeople: allPeopleJSON,
            };

            setNewTask(
              "fillContractClasses",
              taskData,
              "Remplissage des contrats sans classe."
            );

            hideWindow();
            submitButtonRef.current.disabled = false;
          },
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
          type: "file",
          accept: ".xlsx, .xls",
          required: true,
          bindTo: inputAllStudents,
          id: "inputAllStudents",
        }),
        createElem(
          "label",
          { htmlFor: "inputWrongContracts" },
          "Feuille Excel avec les contrats incomplèts (e id, e nom, e prenom, institution, institution id)"
        ),
        createElem("input", {
          type: "file",
          accept: ".xlsx, .xls",
          required: true,
          bindTo: inputWrongContracts,
          id: "inputWrongContracts",
        }),
        createElem(
          "button",
          { type: "submit", bindTo: submitButtonRef },
          "Démarrer"
        )
      )
    );
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
            await setNewTask("test", "Hello there", "Says hello");
          },
        },
        "Démarrer"
      )
    );
  }

  /** @type {BindRef<HTMLParagraphElement>} */
  const taskWindowInfos = {};
  /** @type {BindRef<HTMLButtonElement>} */
  const taskWindowResumeButton = {};
  const taskWindow = e(document.body).addElem(
    "div",
    {
      async onclick() {
        if (
          confirm(
            "Êtes vous sûr de vouloir arrêter l'execution de la tâche courante?"
          )
        ) {
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
        minWidth: "200px",
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
        bindTo: taskWindowResumeButton,
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

    if (taskWindowResumeButton.current)
      taskWindowResumeButton.current.style.display = task.isPaused
        ? "block"
        : "none";

    if (taskWindowInfos.current)
      taskWindowInfos.current.textContent =
        "Nom: " +
        task.name +
        "\n" +
        "Description: " +
        task.description +
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
    if (!overDiv || !toolWindow) return;
    overDiv.style.visibility = "hidden";
    toolWindow.style.visibility = "hidden";
  }
  function showWindow() {
    if (!overDiv || !toolWindow) return;
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
   *  stepName: "start" | "success" | string,
   *  startedAt: number,
   *  stepStartedAt: number,
   *  lastMessage?: string,
   *  sharedData: any,
   * }} Task
   */

  const taskMap = {
    test: testTask,
    fillContractClasses: fillContractClassesTask,
  };

  async function handleTasks() {
    const task = await getCurrentTask();
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
      await taskMap[task.name](task);
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
   *      schoolClass?: string,
   *      schoolName?: string,
   *      birthday?: string,
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
   * @typedef {{
   *      contracts: {
   *          [id: string]: FillContractsClasseContract
   *      };
   *      contractsIds: string[];
   *      allPeople: FillContractsClassePerson[];
   * }} FillContractClassesSharedData
   *
   * @typedef {Omit<Task, "sharedData"> & {
   *      sharedData: FillContractClassesSharedData
   * }} FillContractClasseTask
   *
   * @param {FillContractClasseTask} task
   */
  async function fillContractClassesTask(task) {
    const personId = task.sharedData.contractsIds[0];
    const person = task.sharedData.contracts[personId];
    switch (task.stepName) {
      case "start":
        if (task.sharedData.contractsIds.length === 0) {
          nextTaskStep("success", task);
          return;
        }
        nextTaskStep("searchPerson", task);

        return;

      case "searchPerson":
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

        /** @type {HTMLFormElement | null} */
        const personForm = document.querySelector(
          "form#filterForm[name=PersonenListeForm]"
        );
        personForm?.submit();

        nextTaskStep("findPerson", task);

        return;

      case "findPerson":
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

        //find person in people list
        let foundPeople = task.sharedData.allPeople.filter(
          (p) => p.Nom === person["e nom"] && p.DateNaissance === foundBirthday
        );

        let foundPerson = foundPeople[0];
        if (foundPeople.length === 0)
          throw new Warning(
            `${person["e nom"]} ${person["e prenom"]} introuvable dans le fichier`
          );

        if (foundPeople.length > 1) {
          let ind = NaN;
          do {
            const res = prompt(
              "Personne exacte introuvable.\n" +
                `Recherche: ${person["e prenom"]} ${person["e nom"]} [${personId}]` +
                "Veuillez sélectionner la bonne personne:\n" +
                foundPeople
                  .map(
                    (p, i) =>
                      `[${i + 1}] ${p.Prenom} ${p.Nom} ${p.DateNaissance}`
                  )
                  .join("\n"),
              "1"
            );
            ind = parseInt(res ?? "");
          } while (isNaN(ind) || ind < 1 || ind > foundPeople.length);

          foundPerson = foundPeople[ind - 1];
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
                schoolClass: foundPerson.ClasseCourante,
                schoolName: foundPerson.BatimentNomOfficiel,
                birthday: foundBirthday,
              },
            },
          },
        };
        task = await setCurrentTask(newTask);

        nextTaskStep("searchContract", task);

        return;

      case "searchContract":
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
        institutionIdSelect.value = person["institution id"].toString();

        /** @type {HTMLFormElement | null} */
        const contractForm = document.querySelector(
          "form[name=VertragListeForm]"
        );
        if (!contractForm) throw new Error("contract form not found");
        contractForm.submit();

        nextTaskStep("findContract", task);

        return;

      case "findContract":
        if (!urlCheck("/icare/Be/VertragList.do", "?reset=true")) return;

        /** @type {NodeListOf<HTMLTableRowElement>} */
        const contractLines = document.querySelectorAll(
          "#ver.dataTable > tbody > tr"
        );
        if (contractLines.length !== 1) {
          alert(
            "Contrat introuvable.\n" +
              "Naviguez sur le contrat concerné et continuez la tâche.\n" +
              `Institution: [${person["institution id"]}] ${person.institution} \n` +
              `Pour: ${person["e prenom"]} ${person["e nom"]} [${personId}]`
          );
          throw new Warning(
            `Contrat précis introuvable. p-id:${personId}. ${contractLines.length} résultat(s)`
          );
        }

        const contractInfosTD = contractLines[0].getElementsByTagName("td");

        const foundContractId = contractInfosTD[0]?.textContent?.trim();
        if (!foundContractId?.includes(personId))
          throw new Error(
            `Contrat de la personne ${personId} introuvable. Contrat faux ${foundContractId} trouvé.`
          );

        const contractLink = contractInfosTD[0].querySelector("a");
        if (!contractLink) throw new Error("contract link not found");
        contractLink.click();

        nextTaskStep("openContractEditPage", task);

        return;

      case "openContractEditPage":
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

        /** @type {HTMLIFrameElement | null} */
        const iframe = document.querySelector(
          "iframe[name=klassifizierungframe]"
        );
        if (!iframe) throw new Error("iframe de contrat introuvable");
        console.log(iframe.src);
        window.location.href = iframe.src;

        nextTaskStep("fillContractCollege", task);

        return;

      case "fillContractCollege":
        if (
          !urlCheck(
            "/icare/PrepareKlassifizierung.do?table=TVertrag&showTables=&col=ver_id&showCols=&addTables=&addCols=&value="
          )
        )
          return;

        await fillContractData(
          task,
          "Collège",
          person.schoolName,
          "fillContractClass"
        );

        nextTaskStep("fillContractClass", task, false);

        return;

      case "fillContractClass":
        if (
          !urlCheck(
            "/icare/PrepareKlassifizierung.do?table=TVertrag&showTables=&col=ver_id&showCols=&addTables=&addCols=&value="
          )
        )
          return;

        await fillContractData(
          task,
          "Classe et enseignant",
          person.schoolClass,
          "fillContractClass"
        );

        nextTaskStep("fillContractClass", task, false);

        return;
    }
  }

  /**
   * @param {FillContractClasseTask} task
   * @param {string} name
   * @param {string | undefined} value
   * @param {string} nextStep
   */
  async function fillContractData(task, name, value, nextStep) {
    const person = task.sharedData.contracts[task.sharedData.contractsIds[0]];
    /** @type {NodeListOf<HTMLTableElement>} */
    const tables = document.querySelectorAll("#theKlForm > table.sortable");
    /** @type {HTMLSelectElement | undefined} */
    let select;
    /** @type {HTMLButtonElement | undefined} */
    let saveButton;

    for (const table of tables) {
      /** @type {NodeListOf<HTMLTableRowElement>} */
      const TRList = table.querySelectorAll(
        "table > thead > tr, table > tbody > tr"
      );
      const TRs = [...TRList];

      const nameTR = TRs.at(-2);
      const nameFromTR = nameTR?.textContent?.trim();
      if (!nameFromTR?.includes(name)) continue;

      //TODO: Selector doesn't work
      const dataTR = TRs.at(-1);
      select =
        dataTR?.querySelector("td > span > select.inputNoWidth") ?? undefined;
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

    if (
      select.value !== "0" &&
      !confirm(`${name} déjé renseigné.\n Souhaitez vous l'écraser?`)
    ) {
      alert(
        `Vérifiez/renseignez le collège, enregistrez puis continuez la tâche.`
      );
      nextTaskStep(nextStep, task, false);
      throw new Warning(`Vérifier/Renseigner manuellement ${name}`);
    }

    //find matching name
    const optionsToSelect = value
      ? [...select.options].filter((op) =>
          op.textContent?.trim().includes(value.trim())
        )
      : [];

    let resIndexChosen = 1;
    if (optionsToSelect.length > 1) {
      do {
        const txtRes = prompt(
          `Veuillez choisir la bonne valeur pour '${name}.\n'` +
            `Personne: ${person["e prenom"]} ${person["e nom"]} [${person["e id"]}]\n` +
            optionsToSelect
              .map((o, i) => `[${i + 1}] ${o.textContent?.trim()}`)
              .join("\n"),
          "1"
        );
        resIndexChosen = parseInt(txtRes ?? "");
      } while (
        isNaN(resIndexChosen) ||
        resIndexChosen < 1 ||
        resIndexChosen > optionsToSelect.length
      );
    }

    const optionToSelect = optionsToSelect[resIndexChosen - 1];

    if (!optionToSelect?.value) {
      alert(
        `${name} introuvable dans les listes. Renseignez le manuellement puis enregistrez. Ensuite continuez la tâche.`
      );
      nextTaskStep(nextStep, task, false);
      throw new Warning(`${name} introuvable. Renseigner manuellement.`);
    }

    select.value = optionToSelect.value;

    saveButton.click();
  }

  //exec on page load
  handleTasks();

  /**
   * @param {Task} task
   */
  async function setCurrentTask(task) {
    localforage.setItem("LTCurrentTask", task);
    refreshTaskWindow(task);
    return task;
  }
  /**
   * @return {Promise<Task | null>}
   */
  async function getCurrentTask() {
    return await localforage.getItem("LTCurrentTask");
  }

  async function removeCurrentTask() {
    await localforage.removeItem("LTCurrentTask");
    refreshTaskWindow(null);
  }

  /**
   * @param {keyof typeof taskMap} name
   * @param {any} sharedData
   * @param {string} [description]
   */
  async function setNewTask(name, sharedData, description) {
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
    await setCurrentTask(task);
    handleTasks();
    return task;
  }

  /**
   * @param {string} stepName
   * @param {Task} task
   */
  async function nextTaskStep(stepName, task, autoStart = true) {
    // if (!task) {
    //     task = await getCurrentTask() ?? undefined;
    //     if (!task)
    //         throw new Error("no task provided");
    // }
    task = { ...task, stepName, stepStartedAt: Date.now() };
    await setCurrentTask(task);
    if (autoStart) handleTasks();
  }

  //
  //LIB
  //

  /**
   * @param {string | (()=>(HTMLElement|null))} selector
   * @return {Promise<Element>}
   */
  function waitForSelector(selector, checkInterval = 100, maxChecks = 50) {
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
   * @template T
   * @param {T} obj
   * @param {(keyof T)[]} keys
   */
  function objectContainsKeys(obj, keys) {
    // @ts-ignore
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
   * @param {string} url
   * @param {string} [exclude]
   */
  function urlCheck(url, exclude) {
    if (exclude && window.location.href.includes(exclude)) return false;
    return window.location.href.includes(url);
  }

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
      if (DEEP_PROPS.includes(name)) Object.assign(el[name], val);
      // else if (name.substring(0, 2) === "on" && name[2].toUpperCase() === name[2])
      //     // @ts-ignore
      //     el.addEventListener(name.substring(2).toLowerCase(), val);
      else if (name === "bindTo")
        // @ts-ignore
        val.current = el;
      else el[name] = val;
    });
    children.forEach((child) =>
      el.appendChild(
        child instanceof Element ? child : document.createTextNode(child)
      )
    );

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
