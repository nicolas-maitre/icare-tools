export class Warning {
  message: any;

  constructor(message: any) {
    this.message = message;
  }

  toString() {
    return `Warning: ${this.message ?? "(no message)"}`;
  }
}
