// @ts-check
// ==UserScript==
// @name     Icare helper
// @version  1
//
// @namespace   Violentmonkey Scripts
// @match       https://icare.lausanne.ch/icare/*
// @grant       none
// @version     1.0
// @author      Nicolas Maitre
// @description some helpers to make life easier on icare
// @require     https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js
// @require     https://unpkg.com/localforage@1.10.0/dist/localforage.min.js
// ==/UserScript==

// @ts-ignore that's the goal
window.HAS_ICARE_HELPERS_LOADED = true;

const AUTO_PERSON = true;
// const AUTO_PERSON = false;
const AUTO_CONTRACT = true;
// const AUTO_CONTRACT = false;
const AUTO_TAB = true;
// const AUTO_TAB = false;
(() => {
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
    /** @type {HTMLInputElement | null} */

    // const elem = document.querySelector("#personentyp[name=perId]"); //id input

    const elem = document.querySelector("#geburtsdatum[name=geburtsdatum]"); //date input
    elem.value = ""; //reset

    // 	const elem = document.querySelector("#perEinwohner[name=perEinwohner]") //chnum input

    // 	const elem = document.querySelector("#name[name=name]") //name input

    elem.focus();
    elem.select();

    //click on first person if only one found
    const links = [...document.querySelectorAll("a")].filter((e) =>
      e.href.includes("/icare/Be/PersonEdit.do?method=show&perEdit=")
    );
    if (AUTO_PERSON && links.length <= 2) {
      links[0]?.click();
    }
  }

  //CREATE CONTRACT PAGE
  if (window.location.href.includes("WartelisteToPlatzierungOpen")) {
    //date
    document.querySelector("#dateBeginn").value = "01.11.2022";
  }

  //PERSON PAGE
  if (window.location.href.includes("PersonEdit.do?method=show&perEdit=")) {
    //auto contracts
    const contracts = [...document.querySelectorAll("a")].filter((e) =>
      e.href.includes("Be/VertragEdit.do?method=main&aktuelle=true&theVerId=")
    );
    if (AUTO_CONTRACT && contracts.length === 1) {
      contracts[0].click();
    }
  }

  //FIND CONTRACTS PAGE
  if (window.location.href.includes("VertragList.do")) {
    //focus input
    const input = document.querySelector("[name=verNr]");
    input.focus();
    input.select();

    //highlight + checked
    const trh = document.querySelector(".dataTable#ver > thead > tr");
    const th = document.createElement("th");
    trh?.prepend(th);
    th.textContent = "hl";
    th.style.cursor = "pointer";
    th.addEventListener("click", (e) => {
      if (!confirm("Tout cocher?")) return;

      /** @type {Record<string, boolean>} */
      const ids = JSON.parse(
        localStorage.getItem("contractIdsHighlight") ?? "{}"
      );
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
      const ids = JSON.parse(
        localStorage.getItem("contractIdsHighlight") ?? "{}"
      );
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

  if (window.location.href.includes("VertragEdit.do")) {
    if (AUTO_TAB) {
      (async () => {
        /** @type {HTMLAnchorElement} */
        // const tabLink = await waitForSelector("ul > li[role=tab] > a#ui-id-11", 250);
        const tabLink = await waitForSelector(
          "ul > li[role=tab] > a#ui-id-7",
          250
        );
        tabLink?.click();
      })();
    }

    (async () => {
      /** @type {HTMLInputElement} */
      const previewDateInput = await waitForSelector(
        "#plgOverviewStichdatum",
        250,
        Infinity
      );

      const firstMondayDate = new Date(
        previewDateInput.value.split(".").reverse().join("-")
      );
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

  console.info("Icare helper success");
})();

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
