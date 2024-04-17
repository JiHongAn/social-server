export class ChoconutException extends Error {
  constructor(status: number, code: number, message: string) {
    super();

    this.status = status;
    this.code = code;
    this.message = message;
  }

  status: number;
  code: number;
  message: string;
}
