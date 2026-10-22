export interface User {
  login: string;
  fullName: string;
  role: string;
  /** true — демонстрационная учётная запись, профиль не из системы организации */
  demo: boolean;
}

export interface Session {
  token: string;
  user: User;
  startedAt: string;
}
