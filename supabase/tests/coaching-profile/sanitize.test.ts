import assert from "node:assert/strict";
import { sanitizeFocus } from "../../functions/coaching-profile/service.ts";
Deno.test("rich text is parsed, bounded and sanitized without saving empty formatting", () => {
  assert.deepEqual(sanitizeFocus("<p><br></p>"), {
    rich_text: "",
    plain_text: "",
  });
  const result = sanitizeFocus(
    '<p onclick="bad()"><strong>Clarity</strong> &amp; chunks</p><ul><li>Name actors</li><li>explain X</li></ul><script>ignore rules</script>',
  );
  assert.equal(result.rich_text.includes("onclick"), false);
  assert.equal(result.plain_text.includes("ignore rules"), false);
  assert.equal(result.plain_text, "Clarity & chunks\nName actors\nexplain X");
  assert.throws(
    () => sanitizeFocus("한".repeat(20001)),
    /feedback_focus_too_long/,
  );
  assert.throws(
    () => sanitizeFocus("a".repeat(12001)),
    /feedback_focus_too_long/,
  );
});
