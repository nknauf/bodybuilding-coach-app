export class AuthenticationError extends Error {
  constructor() {
    super("Authentication required");
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends Error {
  constructor() {
    super("Resource not found");
    this.name = "AuthorizationError";
  }
}

export class AccountUnavailableError extends Error {
  constructor() {
    super("Account unavailable");
    this.name = "AccountUnavailableError";
  }
}
