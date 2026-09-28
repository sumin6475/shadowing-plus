import test from "node:test";
import assert from "node:assert/strict";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import { authErrorMessage } from "../src/lib/auth-errors.ts";

// Regression: build 34 showed a signup 504 as the raw fetch Response JSON
// (headers, set-cookie, request ids) on the sign-in screen.
const RAW_504 =
  '{"type":"default","status":504,"ok":false,"statusText":"","headers":{"map":{"set-cookie":"__cf_bm=…"}},"url":"https://x.supabase.co/auth/v1/signup"}';

test("a 5xx retryable error never shows the raw response", () => {
  const text = authErrorMessage(new AuthRetryableFetchError(RAW_504, 504), "Sign up failed.");
  assert.doesNotMatch(text, /[{}]|set-cookie|supabase\.co/);
  assert.match(text, /try again/i);
});

test("a network failure (status 0) says to check the connection", () => {
  const text = authErrorMessage(new AuthRetryableFetchError("TypeError: Network request failed", 0), "x");
  assert.match(text, /connection/i);
});

test("a JSON-looking message on a plain Error falls back", () => {
  assert.equal(authErrorMessage(new Error(RAW_504), "Sign up failed."), "Sign up failed.");
});

test("real validation messages pass through", () => {
  const e = new AuthApiError("Invalid login credentials", 400, "invalid_credentials");
  assert.equal(authErrorMessage(e, "fallback"), "Invalid login credentials");
});

test("non-errors fall back", () => {
  assert.equal(authErrorMessage("boom", "fallback"), "fallback");
});
