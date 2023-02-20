import { IcareWindow } from "./icareTypes";

/**
 * @throws {Error} prompt for disabling icare helpers
 */
export function errorIfIcareTools() {
  if ((window as IcareWindow).HAS_ICARE_HELPERS_LOADED) {
    alert(
      "Cette tâche ne peut pas fonctionner quand le script 'icare-helpers' est chargé. Désactivez le d'abord."
    );
    throw new Error("Cette tâche ne supporte pas le script 'icare-helpers'");
  }
}
