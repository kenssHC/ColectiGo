import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  firebaseUid: string;

  @IsString()
  @IsNotEmpty()
  displayName: string;

  @IsEmail()
  email: string;
}
