import assert from "node:assert/strict";
import test from "node:test";
import { getProfileSponsorIcons, getProfileTags } from "../src/content/profile-presentation.js";

test("profile cards use Jike's display tags instead of raw geographic codes", () => {
  const tags = getProfileTags({
    province: "001033", city: "001033001", gender: "MALE",
    profileTags: [
      { type: "MALE_RELATIONSHIP_STATE", picUrl: "https://cdn.example/male.png" },
      { text: "杭州", type: "NORMAL" },
      { text: "互联网产品", type: "NORMAL" },
      { text: "江南大学", type: "NORMAL" },
      { text: "射手座", type: "NORMAL" },
    ],
  });
  assert.deepEqual(tags.map((tag) => tag.text), ["", "杭州", "互联网产品", "江南大学", "射手座"]);
  assert.equal(tags[0].gender, "m");
  assert.equal(tags[0].imageUrl, "https://cdn.example/male.png");
});

test("explicit hidden tags stay hidden and legacy profiles do not expose location codes", () => {
  assert.deepEqual(getProfileTags({ gender: "MALE", industry: "Private", profileTags: [] }), []);
  assert.deepEqual(getProfileTags({ province: "001033", industry: "互联网产品" }), [{ text: "互联网产品" }]);
  assert.deepEqual(getProfileTags({ province: "上海" }), [{ text: "上海" }]);
});

test("unusable tag images are omitted while safe text remains", () => {
  const tags = getProfileTags({ profileTags: [
    null, {}, { picUrl: "javascript:alert(1)" }, { text: " label ", picUrl: "javascript:alert(1)" },
  ] });
  assert.deepEqual(tags, [{ text: "label", imageUrl: "", gender: "" }]);
});

test("native sponsor decorations follow the theme with a safe light fallback", () => {
  assert.deepEqual(getProfileSponsorIcons({ decorations: { sponsor: {
    picUrl: "https://cdn.example/light.png", themes: { dark: { picUrl: "https://cdn.example/dark.png" } },
  } } }), { light: "https://cdn.example/light.png", dark: "https://cdn.example/dark.png" });
  assert.deepEqual(getProfileSponsorIcons({ decorations: { sponsor: {
    picUrl: "https://cdn.example/light.png", themes: { dark: { picUrl: "javascript:alert(1)" } },
  } } }), { light: "https://cdn.example/light.png", dark: "https://cdn.example/light.png" });
  assert.deepEqual(getProfileSponsorIcons({}), { light: "", dark: "" });
});
