import test from "node:test";
import assert from "node:assert/strict";
import { appleDisplayName, appleSignInErrorMessage, isAppleSignInCancel } from "../src/lib/apple-sign-in.ts";

// Regression: Apple sign-in went through the web OAuth flow, which Apple
// rejected with "invalid_request — Invalid client id or web redirect url."
// because the Supabase Apple client id is the bundle id. iOS now signs in
// natively; these cover the two pieces of that path that hold logic.

test("Apple's first-time full name becomes the display name", () => {
  assert.equal(appleDisplayName({ givenName: "Sumin", familyName: "Kim" }), "Sumin Kim");
  assert.equal(appleDisplayName({ givenName: " Jade ", middleName: null, familyName: "" }), "Jade");
});

test("no name from Apple stores nothing", () => {
  assert.equal(appleDisplayName(null), null);
  assert.equal(appleDisplayName(undefined), null);
  assert.equal(appleDisplayName({ givenName: null, familyName: null }), null);
  assert.equal(appleDisplayName({ givenName: "  ", nickname: "" }), null);
});

test("a nickname is used only when there is no given or family name", () => {
  assert.equal(appleDisplayName({ nickname: "jj" }), "jj");
  assert.equal(appleDisplayName({ givenName: "Jade", nickname: "jj" }), "Jade");
});

test("dismissing the Apple sheet counts as a cancel, other errors do not", () => {
  assert.equal(isAppleSignInCancel({ code: "ERR_REQUEST_CANCELED" }), true);
  assert.equal(isAppleSignInCancel({ code: "ERR_REQUEST_FAILED" }), false);
  assert.equal(isAppleSignInCancel(new Error("boom")), false);
  assert.equal(isAppleSignInCancel(null), false);
});

// Regression: closing iOS's "Sign in to your Apple Account" prompt showed
// "RequestUnknownException: The authorization attempt failed for an unknown
// reason (at ExpoAppleAuthentication/AppleAuthenticationExceptions.swift:61)".
test("an Apple 'unknown' failure points to the Apple Account in Settings", () => {
  const text = appleSignInErrorMessage({ code: "ERR_REQUEST_UNKNOWN", message: "RequestUnknownException … .swift:61" });
  assert.match(text, /Apple Account in Settings/);
  assert.doesNotMatch(text, /swift|Exception/);
});

test("other Apple failures get a plain retry line; non-Apple errors pass through", () => {
  assert.equal(appleSignInErrorMessage({ code: "ERR_REQUEST_FAILED" }), "Couldn’t sign in with Apple. Please try again.");
  assert.equal(appleSignInErrorMessage({ code: "ERR_INVALID_RESPONSE" }), "Couldn’t sign in with Apple. Please try again.");
  assert.equal(appleSignInErrorMessage(new Error("Invalid login credentials")), null);
  assert.equal(appleSignInErrorMessage(null), null);
});
