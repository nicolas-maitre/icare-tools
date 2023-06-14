// ==UserScript==
// @name        iCare Tools
// @namespace   Violentmonkey Scripts
// @noframes
// @match       https://icare-vali.lausanne.ch/icare/*
// @match       https://icare.lausanne.ch/icare/*
// @grant       none
// @version     1.1
// @author      Nicolas Maitre
// @description Task scheduler for icare and helpers
// ==/UserScript==

import { buildTaskWindow } from "./components/TaskWindow";
import { handleTasks } from "./lib/task";
import {
  buildGoToContractButtonIntegration,
  buildRemoveEndDateButtonIntegration,
  buildToolsButtonIntegration,
} from "./lib/UIBuilder";
import { urlCheck } from "./lib/url";
//use violentmonkey for custom editor

//add tools button to top bar
buildToolsButtonIntegration();
//add contract button to person page
if (urlCheck(["/icare/Be/PersonEdit.do", "/icare/Be/KindEdit.do"])) {
  buildGoToContractButtonIntegration();
}
//add end date removal button on contract page
if (urlCheck("/icare/Be/VertragEdit.do")) {
  buildRemoveEndDateButtonIntegration();
}

buildTaskWindow();

//exec on page load
handleTasks();
