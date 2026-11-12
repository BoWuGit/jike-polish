import { safeHttpUrl, stringValue } from "../shared/values.js";

export function getProfileTags(user) {
  // These are the same display labels and icons used by Jike's native profile card.
  // An explicit empty list respects profiles that do not publish any tags.
  if (Array.isArray(user.profileTags)) {
    return user.profileTags.map((tag) => ({
      text: stringValue(tag?.text),
      imageUrl: safeHttpUrl(tag?.picUrl),
      gender: tag?.type === "MALE_RELATIONSHIP_STATE" ? "m"
        : tag?.type === "FEMALE_RELATIONSHIP_STATE" ? "f" : "",
    })).filter((tag) => tag.text || tag.imageUrl);
  }

  const tags = [];
  if (user.gender === "MALE") tags.push({ text: "♂", gender: "m" });
  else if (user.gender === "FEMALE") tags.push({ text: "♀", gender: "f" });
  const province = stringValue(user.province);
  for (const text of [province && !/^\d+$/.test(province) ? province : "", stringValue(user.industry)]) {
    if (text) tags.push({ text });
  }
  return tags;
}

export function getProfileSponsorIcons(user) {
  const sponsor = user.decorations?.sponsor;
  const light = safeHttpUrl(sponsor?.picUrl);
  const dark = safeHttpUrl(sponsor?.themes?.dark?.picUrl) || light;
  return { light, dark };
}
