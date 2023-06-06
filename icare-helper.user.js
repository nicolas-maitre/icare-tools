// @ts-check
// ==UserScript==
// @name     Icare helper
// @version  1
//
// @namespace   Violentmonkey Scripts
// @match       https://icare-vali.lausanne.ch/icare/*
// @match       https://icare.lausanne.ch/icare/*
// @grant       none
// @version     1.0
// @author      Nicolas Maitre
// @description some helpers to make life easier on icare
// ==/UserScript==

// @ts-ignore that's the goal
window.HAS_ICARE_HELPERS_LOADED = true;

///-----------
///CONFIG
///-----------

const AUTO_PERSON = true;
// const AUTO_PERSON = false;

// const AUTO_CONTRACT = true;
const AUTO_CONTRACT = false;

const AUTO_TAB = false;
// const AUTO_TAB = "prestations";
// const AUTO_TAB = "imprimer";

/** @type {string | undefined} */
// const AUTO_FOCUS_PERSON_SEARCH = false;
// const AUTO_FOCUS_PERSON_SEARCH = "id";
// const AUTO_FOCUS_PERSON_SEARCH = "name";
const AUTO_FOCUS_PERSON_SEARCH = "birthday";
// const AUTO_FOCUS_PERSON_SEARCH = "chnum";

const START_DATE = "21.08.2023";
try {
  console.info("Icare helper init");

  const style = document.createElement("style");
  style.classList.add("LESTYLE");
  style.setAttribute("type", "text/css");
  document.head.appendChild(style);
  style.textContent = `tr.highlightedRow { background-color: yellowgreen!important; }
      .ui-widget-overlay.ui-front {display: none;}
      [aria-describedby="ajaxErrorDialog"] {
        right: -186px;
        bottom: -72px;
        top: auto !important;
        left: auto !important;
        transform: scale(.5);
        opacity: .8;
      }
      `;

  //FIND PERSON PAGE
  if (window.location.href.includes("PersonenList.do")) {
    //reset
    if (new URLSearchParams(document.location.search).get("reset") === "true") {
      /** @type {HTMLButtonElement | null} */
      const resetBtn = document.querySelector("#filterForm button.btn-danger[onclick]");
      resetBtn?.click();
    }

    if (AUTO_FOCUS_PERSON_SEARCH) {
      const query =
        AUTO_FOCUS_PERSON_SEARCH === "id"
          ? "#personentyp[name=perId]"
          : AUTO_FOCUS_PERSON_SEARCH === "birthday"
          ? "#geburtsdatum[name=geburtsdatum]"
          : AUTO_FOCUS_PERSON_SEARCH === "chnum"
          ? "#perEinwohner[name=perEinwohner]"
          : AUTO_FOCUS_PERSON_SEARCH === "name"
          ? "#name[name=name]"
          : undefined;

      if (query) {
        /** @type {HTMLInputElement | null} */
        const elem = document.querySelector(query);
        elem?.focus();
        elem?.select?.();
      }
    }

    //click on first person if only one found
    const peopleRows = document.querySelectorAll("#per.dataTable.jqResultList > tbody > tr");
    console.log({ peopleRows });
    if (AUTO_PERSON && peopleRows.length === 1) {
      /** @type {HTMLAnchorElement | null} */
      const link = peopleRows[0].querySelector("td.link[style='width: 200px;'] a");
      link?.click();
    }
  }

  //CREATE CONTRACT PAGE
  if (window.location.href.includes("WartelisteToPlatzierungOpen")) {
    /** @type {HTMLInputElement | null} */
    const startDateInput = document.querySelector("#dateBeginn");
    if (startDateInput) {
      startDateInput.value = START_DATE;
    }

    /** @type {HTMLSelectElement | null} */
    const clientGroupSelect = document.querySelector("select#platzKundengruppe");
    clientGroupSelect?.focus();
  }

  //TRANSFER CONFIRM CONTRACT PAGE
  if (window.location.href.includes("WartelisteToPlatzierungPrepare.do")) {
    /** @type {HTMLInputElement | null} */
    const okButton = document.querySelector("#neuvertrag");
    okButton?.focus();
  }

  //COPY CONTRACT CONFIRM PAGE
  if (window.location.href.includes("PlatzierungVertragKopierenPrepare.do")) {
    /** @type {HTMLInputElement | null} */
    const okButton = document.querySelector("#kopierenConfirmJaButton");
    okButton?.focus();
  }

  //COPY CONTRACT PAGE
  if (window.location.href.includes("PlatzierungVertragKopierenPrepare.do?action=prepare&verId=")) {
    /** @type {HTMLInputElement | null} */
    const startDateInput = document.querySelector("#verBeginn");
    if (startDateInput) {
      startDateInput.value = START_DATE;
      startDateInput.focus();
    }
    // /** @type {HTMLSelectElement | null} */
    // const institutionSelect = document.querySelector("[name=newPergId]");
    // institutionSelect?.focus();
  }

  //PERSON PAGE
  if (window.location.href.includes("PersonEdit.do?method=show&perEdit=")) {
    //auto contracts
    const contracts = [...document.querySelectorAll("a")].filter((e) =>
      e.href.includes("Be/VertragEdit.do?method=main&aktuelle=true&theVerId=")
    );

    //focus first contract
    [...contracts].at(-1)?.focus();

    if (AUTO_CONTRACT && contracts.length === 1) {
      contracts[0].click();
    }
  }

  //REMOVE PREST POPUP CONFIRM
  if (window.location.href.includes("PlatzierungLoeschen.do")) {
    /** @type {HTMLButtonElement | null} */
    const confirmButton = document.querySelector("button.btn-success");
    confirmButton?.focus();
  }

  //SAVE CONTRACT POPUP CONFIRM
  if (window.location.href.includes("PlatzierungVertragPrepare.do")) {
    /** @type {HTMLInputElement | null} */
    const confirmButton = document.querySelector("input.btn.btn-primary");
    confirmButton?.focus();
  }

  //FIND CONTRACTS PAGE
  if (window.location.href.includes("VertragList.do")) {
    //focus input
    /** @type {HTMLInputElement | null} */
    const input = document.querySelector("[name=verNr]");
    input?.focus();
    input?.select();

    //highlight + checked
    const trh = document.querySelector(".dataTable#ver > thead > tr");
    const th = document.createElement("th");
    trh?.prepend(th);
    th.textContent = "hl";
    th.style.cursor = "pointer";
    th.addEventListener("click", (e) => {
      if (!confirm("Tout cocher?")) return;

      /** @type {Record<string, boolean>} */
      const ids = JSON.parse(localStorage.getItem("contractIdsHighlight") ?? "{}");
      TRs.forEach((tr) => (ids[getTrData(tr).name] = true));
      localStorage.setItem("contractIdsHighlight", JSON.stringify(ids));
      updateHighlight();
    });
    //     `
    // tr.highlightedRow {
    //     background-color: yellowgreen;
    // }`;

    /**
     * @param {string} [name]
     * @param {boolean} [val]
     */
    function updateHighlight(name, val) {
      /** @type {Record<string, boolean>} */
      const ids = JSON.parse(localStorage.getItem("contractIdsHighlight") ?? "{}");
      if (name && val !== undefined) {
        ids[name] = val;
        localStorage.setItem("contractIdsHighlight", JSON.stringify(ids));
      }

      TRs.forEach((tr) => {
        const { name, checkbox } = getTrData(tr);
        const checked = !!ids[name];
        if (checkbox) checkbox.checked = checked;
        if (checked) tr.classList.add("highlightedRow");
        else tr.classList.remove("highlightedRow");
      });
    }
    /**
     * @param {HTMLTableRowElement} tr
     */
    function getTrData(tr) {
      const name =
        tr.querySelector("tr > td > span > a")?.textContent?.trim() ??
        // ?.split("-")?.[0]
        "_";
      /** @type {HTMLInputElement | null} */
      const checkbox = tr.querySelector("tr > td > .highlight-checkbox");
      return { name, checkbox };
    }

    /** @type {NodeListOf<HTMLTableRowElement>} */
    const TRs = document.querySelectorAll(".dataTable#ver > tbody > tr");
    TRs.forEach((tr) => {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "highlight-checkbox";
      const td = document.createElement("td");
      tr.prepend(td);
      td.appendChild(checkbox);
      const { name } = getTrData(tr);

      checkbox.addEventListener("change", () => {
        updateHighlight(name, checkbox.checked);
        console.log("hey", name);
      });
    });
    updateHighlight();
  }

  //CONTRACT PAGE
  if (
    window.location.href.includes("VertragEdit.do") ||
    window.location.href.includes("PlatzierungVertragKopieren.do")
  ) {
    //skip confirmation
    (() => {
      /** @type {HTMLInputElement | null} */
      const confirmBox = document.querySelector("#trotzdem");
      if (confirmBox) {
        confirmBox.checked = true;
        confirmBox.form?.submit();
      }
    })();

    if (AUTO_TAB) {
      (async () => {
        const tab_id = AUTO_TAB === "prestations" ? 7 : AUTO_TAB === "imprimer" ? 11 : undefined;
        if (tab_id === undefined) return;
        /** @type {HTMLAnchorElement} */
        const tabLink = await waitForSelector(`ul > li[role=tab] > a#ui-id-${tab_id}`, 250);
        tabLink?.click();
      })();
    }

    //highlight wrong date
    (async () => {
      const startDateElem = await waitForSelector(
        "#jqContentTable > tbody > tr > td > div#data > table > tbody > tr > td > b"
      );
      if (startDateElem.textContent !== START_DATE) {
        startDateElem.style.backgroundColor = "yellow";
      }
    })();

    //focus copy contract button
    (async () => {
      const copyButtonElem = await waitForSelector(
        "#ui-id-6 > [name=VertragEditForm] > table > tbody > tr > td > table > tbody > tr > td > button.btn.btn-primary",
        250,
        Infinity
      );
      copyButtonElem.focus();
    })();
    //preview date
    (async () => {
      /** @type {HTMLInputElement} */
      const previewDateInput = await waitForSelector("#plgOverviewStichdatum", 250, Infinity);

      const firstMondayDate = new Date(previewDateInput.value.split(".").reverse().join("-"));
      while (firstMondayDate.getDay() !== 1) {
        firstMondayDate.setDate(firstMondayDate.getDate() + 1);
      }
      previewDateInput.value = firstMondayDate.toLocaleDateString("fr-ch");
    })();

    // (async () => {
    //     /** @type {HTMLInputElement} */
    //     const input = await waitForSelector("#ui-id-12 > form[name=VertragEditForm] > table > tbody > tr > td > #plgOverviewStichdatum", 250, Infinity)
    //     input.value = "22.08.2022";
    //     /** @type {HTMLInputElement | null} */
    //     const submitBtn = input.parentElement?.parentElement?.querySelector("input[type=submit]") ?? null;
    //     submitBtn?.click();
    //     setTimeout(() => {
    //         /** @type {HTMLElement | null} */
    //         const a = document.querySelector("#ui-id-12 > form[name=KitaVereinbarungDruckenForm]");
    //         if (a) a.style.display = "none"
    //         /** @type {HTMLElement | null} */
    //         const b = document.querySelector("#ui-id-12 > table");
    //         if (b) b.style.display = "none";
    //     }, 200);
    // })();
    // (async () => {
    //     /** @type {HTMLInputElement} */
    //     const allPrestsButton = await waitForSelector("#ui-id-10 > form[name=VertragEditForm] > table > tbody > tr > td > input[type=button][name=alle]", 250, Infinity);
    //     allPrestsButton.click();
    // })();
    //     /** @type {HTMLInputElement | null} */
    //     const allPrestBtn = document.querySelector("form[name=VertragEditForm] > table > tbody > tr > td > input[type=button][name=alle]");
    //     if (allPrestBtn && allPrestBtn.style.backgroundColor === "") {
    //         console.log("oui");
    //         allPrestBtn.click();
    //     }
  }

  //LOGIN PAGE
  if (
    window.location.href.includes("HandleError.do") ||
    window.location.href.includes("Initialize.do")
  ) {
    /** @type {HTMLButtonElement | null} */
    const logInButton = document.querySelector("[name=LoginForm] button[type=submit].btn-lg");
    logInButton?.focus();
  }

  console.info("Icare helper success");
} catch (e) {
  console.error("icare helper error", e);
}

/*const contrats = [...document.querySelectorAll("a")].filter((e)=>e.href.includes("Be/VertragEdit.do?method=main&aktuelle=true&theVerId="))

if(contrats.length == 1){
      contrats[0].click();
}
*/
//document.querySelectorAll("a").filter((e)=>e.href.includes("/icare/Be/PersonEdit.do?method=show&perEdit=66364"))

/**
 * @template {HTMLElement} T
 * @param {string | (()=>(HTMLElement|null))} selector
 * @return {Promise<T>}
 */
function waitForSelector(selector, checkInterval = 100, maxChecks = 50) {
  /** @type {T | null} */
  // @ts-ignore because all html elements inherit from HTMLElement anyways
  const res = typeof selector === "function" ? selector() : document.querySelector(selector);

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
