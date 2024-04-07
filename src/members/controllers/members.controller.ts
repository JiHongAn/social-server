import { Controller } from '@nestjs/common';
import { MembersService } from '../services/members.service';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}
}
