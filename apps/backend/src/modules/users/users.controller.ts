import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { FirebaseAuthPayload } from '../auth/interfaces/firebase-auth-payload.interface';
import type { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  sync(
    @CurrentUser() currentUser: FirebaseAuthPayload,
    @Body() _body: CreateUserDto,
  ) {
    return this.usersService.createOrFind({
      firebaseUid: currentUser.uid,
      email: currentUser.email,
      displayName: currentUser.name,
    });
  }

  @Get('me')
  @UseGuards(FirebaseAuthGuard)
  getMe(@CurrentUser() currentUser: FirebaseAuthPayload) {
    return this.usersService.findByFirebaseUid(currentUser.uid);
  }
}
