import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { ChoconutException } from '../exceptions/choconut.exception';
import { errors } from '../errors';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Choconut Exception
    const choconutException: ChoconutException =
      exception instanceof ChoconutException
        ? exception
        : this.errorToChoconutException(exception);

    // exception 값 가져오기
    const status = choconutException.status;
    const code = choconutException.code;
    const message = choconutException.message;

    // 응답하기
    response.status(status).json({ code, message });
  }

  // Choconut Exception으로 변환
  errorToChoconutException(exception: unknown) {
    // Http Exception인 경우
    if (exception instanceof HttpException) {
      switch (exception.getStatus()) {
        case 400:
          return errors.InvalidRequest();
        case 401:
          return errors.InvalidAccessToken();
        case 404:
          return errors.ApiNotFound();
      }
    }
    // 서버 내부 오류
    console.log(exception);
    return errors.InternalError();
  }
}
