/**
 * Datos internos para crear un usuario a partir del token de Firebase.
 * No es entrada HTTP: el endpoint /users/sync deriva todo del token verificado.
 */
export interface CreateUserDto {
  firebaseUid: string;
  displayName: string;
  email: string;
}
