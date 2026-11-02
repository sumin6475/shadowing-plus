import test from "node:test";
import assert from "node:assert/strict";

import { deleteAuthUser } from "../functions/_shared/delete-user.ts";

test("account deletion falls back to the direct database function when GoTrue rejects deletion", async () => {
  const calls = [];
  const client = {
    auth: {
      admin: {
        async deleteUser(userId) {
          calls.push(["admin", userId]);
          return { error: new Error("GoTrue deletion failed") };
        },
      },
    },
    async rpc(name, args) {
      calls.push(["rpc", name, args]);
      return { error: null };
    },
  };

  assert.equal(await deleteAuthUser(client, "user-1"), null);
  assert.deepEqual(calls, [
    ["admin", "user-1"],
    ["rpc", "delete_auth_user", { target_user_id: "user-1" }],
  ]);
});
