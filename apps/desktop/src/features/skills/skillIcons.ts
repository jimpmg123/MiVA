const ICON_RULES: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /mail|email|gmail|inbox/i, icon: "mail" },
  { pattern: /calendar|schedule|meeting|event|일정|회의/i, icon: "calendar_month" },
  { pattern: /doc|write|summary|report|문서/i, icon: "description" },
  { pattern: /drive|file|folder|pdf|드라이브|파일/i, icon: "folder" },
  { pattern: /sheet|spreadsheet|table|표|시트/i, icon: "table" },
  { pattern: /image|photo|draw|picture|그림/i, icon: "image" },
  { pattern: /code|repo|git|terminal|shell|코드/i, icon: "code" },
  { pattern: /search|find|lookup|찾/i, icon: "search" },
  { pattern: /translate|translation|번역/i, icon: "translate" },
  { pattern: /security|safe|audit|보안/i, icon: "shield" },
];

export function inferSkillIcon(name: string, description: string, content: string) {
  const haystack = `${name} ${description} ${content.slice(0, 400)}`;
  const match = ICON_RULES.find((rule) => rule.pattern.test(haystack));
  return match?.icon ?? "auto_awesome";
}
