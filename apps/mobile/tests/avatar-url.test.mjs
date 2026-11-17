import test from "node:test";
import assert from "node:assert/strict";
import { resolveAvatarUrl } from "../src/lib/avatar-url.ts";

const BASE = "https://proj.supabase.co/storage/v1/object/public/avatars/";
const publicUrlFor = (path) => BASE + path;
const GOOGLE = "https://lh3.googleusercontent.com/a/abc=s96-c";

// Regression: an email account with an uploaded photo signed in with Google
// (same email). Supabase rewrote avatar_url/picture to the Google photo on
// that sign-in, and the avatar switched to it. avatar_path survived.
test("an uploaded photo wins after a Google sign-in overwrote avatar_url", () => {
  const meta = { avatar_path: "u1/avatar.jpg", avatar_url: GOOGLE, picture: GOOGLE };
  assert.equal(resolveAvatarUrl(meta, publicUrlFor), BASE + "u1/avatar.jpg");
});

test("the upload's version keeps the image cache fresh", () => {
  const meta = { avatar_path: "u1/avatar.jpg", avatar_version: "1700", avatar_url: GOOGLE };
  assert.equal(resolveAvatarUrl(meta, publicUrlFor), BASE + "u1/avatar.jpg?t=1700");
});

test("an older upload's ?t= is reused while avatar_url still points at it", () => {
  const meta = { avatar_path: "u1/avatar.jpg", avatar_url: BASE + "u1/avatar.jpg?t=42" };
  assert.equal(resolveAvatarUrl(meta, publicUrlFor), BASE + "u1/avatar.jpg?t=42");
});

test("with no uploaded photo, the provider photo is used", () => {
  assert.equal(resolveAvatarUrl({ avatar_url: GOOGLE }, publicUrlFor), GOOGLE);
  assert.equal(resolveAvatarUrl({ picture: GOOGLE }, publicUrlFor), GOOGLE);
  assert.equal(resolveAvatarUrl({ avatar_path: "", avatar_url: "", picture: GOOGLE }, publicUrlFor), GOOGLE);
});

test("no photo at all gives null", () => {
  assert.equal(resolveAvatarUrl(null, publicUrlFor), null);
  assert.equal(resolveAvatarUrl({}, publicUrlFor), null);
});
