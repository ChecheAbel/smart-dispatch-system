export interface User {
  id: string;
  name: string;
  role: 'admin' | 'dispatcher' | 'driver';
}
