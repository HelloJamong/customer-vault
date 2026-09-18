export function getInitialAdminPassword(): string {
  const password = process.env.INITIAL_ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      'INITIAL_ADMIN_PASSWORD is required when bootstrapping the first administrator or system settings.',
    );
  }

  return password;
}
