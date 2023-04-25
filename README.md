# Icare Tools

Automation task scheduler for cse.kibe iCare.  
The repo also contains the `icare-helper` userscript used to improve the usage of iCare.

## Usage

1. First off, you need a userscript browser extension. Popular ones are GreaseMonkey (Firefox) and TamperMonkey (Chrome).  
   I recommend using [ViolentMonkey](https://violentmonkey.github.io/).

2. Install the userscript found under `dist/icare-tools.user.js`.  
   (If it's not there you may need to build it).

## Developpment

- **Setup**

  1.  In this directory run `pnpm i`
  2.  Run `pnpm webpack` to build the userscript.

- **Browser sync**  
   To sync the script with the version in the browser while developping, you need to serve the script using http.

  1. Be sure to use [ViolentMonkey](https://violentmonkey.github.io/) as it supports this feature.
  2. Run `pnpm wepback` in one terminal window, the config should force it to watch for changes.
  3. Run `pnpm serve dist/` in another terminal window. Then open the displayed url in the browser, and open the script.
  4. A ViolentMonkey Window should now be open prompting you to install the script. Be sure to check both checkboxes before confirming the install.
  5. The script should now be synced on save after a browser reload.
