export interface FirebaseAuthPayload {
  uid: string;
  email: string;
  name: string;
  isAdmin: boolean;
  signInProvider: string;
  authTime: number;
}
