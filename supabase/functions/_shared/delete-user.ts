type DeleteUserClient = {
  auth: {
    admin: {
      deleteUser: (userId: string) => Promise<{ error: unknown }>;
    };
  };
  rpc: (
    name: "delete_auth_user",
    args: { target_user_id: string },
  ) => Promise<{ error: unknown }>;
};

/** Delete through GoTrue, with a service-role SQL fallback for GoTrue failures. */
export async function deleteAuthUser(client: DeleteUserClient, userId: string): Promise<unknown> {
  const { error } = await client.auth.admin.deleteUser(userId);
  if (!error) return null;

  const { error: fallbackError } = await client.rpc("delete_auth_user", {
    target_user_id: userId,
  });
  return fallbackError;
}
