import { ChoconutException } from './exceptions/choconut.exception';

export const errors = {
  /**
   * 서버 공통 에러
   * */
  InternalError: (message = '서버에서 오류가 발생했습니다') => {
    return new ChoconutException(500, -1, message);
  },
  InvalidRequest: (message = '요청을 확인해주세요') => {
    return new ChoconutException(400, -2, message);
  },
  InvalidAccessToken: (message = '다시 로그인 해주세요') => {
    return new ChoconutException(401, -3, message);
  },
  ApiNotFound: (message = '요청하신 API를 찾을 수 없습니다') => {
    return new ChoconutException(404, -4, message);
  },
  NoPermission: (message = '권한이 없습니다') => {
    return new ChoconutException(400, -5, message);
  },
  DBError: (message = '서버에서 오류가 발생했습니다') => {
    return new ChoconutException(400, -6, message);
  },
};
