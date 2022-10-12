// @ts-check
// ==UserScript==
// @name        New script - lausanne.ch
// @namespace   Violentmonkey Scripts
// @match       https://icare-vali.lausanne.ch/icare/*
// @grant       none
// @version     1.0
// @author      Nicolas Maitre
// @description 07/10/2022 14:54:13 
// ==/UserScript==

//use violentmonkey for custom editor

(() => {
    const mainMenuUlElement = document.querySelector("#mainmenu > ul");
    const overDiv = document.querySelector("#overDiv");
    if (!(mainMenuUlElement && overDiv)) return;
    console.log("allo4", mainMenuUlElement);
    console.log(mainMenuUlElement);

    addElement(mainMenuUlElement, "li", null,
        createElem("a", {
            onClick() {
                console.log("click");
            },
            dataSet: {
                toggle: "tooltip",
                placement: "top",
                originalTitle: "Les outils pratiques"
            }
        },
            createElem("i", { className: "fa fa-solid fa-toolbox" })
        )
    );




    //
    //LIB
    //

    /**
     * @param {keyof HTMLElementTagNameMap} type 
     * @param {{[name:string]:any} | null} [props] 
     * @param {Element[]} children
     */
    function createElem(type, props, ...children) {
        const el = document.createElement(type);
        Object.entries(props ?? {}).forEach(([name, val]) => {
            if (name === "dataSet")
                Object.entries(val).forEach(([dn, dv]) => el.dataset[dn] = dv);
            else if (name.substring(0, 2) === "on" && name[2].toUpperCase() === name[2])
                el.addEventListener(name.substring(2).toLowerCase(), val);
            else
                el[name] = val
        });
        children.forEach(child => el.appendChild(child));
        return el;
    }

    /**
     * @param {Element} parent
     * @param {keyof HTMLElementTagNameMap} type 
     * @param {{[name:string]:any} | null} [props] 
     * @param {Element[]} children
     */
    function addElement(parent, type, props, ...children) {
        const el = createElem(type, props, ...children);
        parent.appendChild(el);
        return el;
    }

    /**
     * @param {Element} el
     */
    function e(el) {
        /**
         * @param {keyof HTMLElementTagNameMap} type 
         * @param {{[name:string]:any} | null} [props] 
         * @param {Element[]} children
         */
        function addElem(type, props, ...children) {
            return addElement(el, type, props, ...children);
        }
        return { ...el, addElem }
    }
})();
