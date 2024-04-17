import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { errors } from '../../libs/errors';
import { UserDto } from '../../libs/dtos/user.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.ACCESS_TOKEN_SECRET,
      ignoreExpiration: false,
    });
  }

  validate(payload: any): UserDto {
    if (!payload.id || !payload.nickname) {
      throw errors.InvalidAccessToken();
    }
    return {
      id: payload.id,
      nickname: payload.nickname,
      profileUrl: payload?.profileUrl,
    };
  }
}
