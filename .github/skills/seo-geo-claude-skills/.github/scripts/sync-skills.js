/**
 * Sync skills manifest
 *
 * Scans category directories for SKILL.md files and updates
 * marketplace.json and plugin.json with the complete skills list.
 */

const fs = require("fs");
const path = require("path");

const CATEGORIES = [
  "research",
  "build",
  "optimize",
  "monitor",
  "cross-cutting",
];

const ROOT = path.resolve(__dirname, "../..");
const MARKETPLACE_PATH = path.join(ROOT, "marketplace.json");
const PLUGIN_PATH = path.join(ROOT, ".claude-plugin", "plugin.json");

function discoverSkills() {
  const skills = [];

  for (const category of CATEGORIES) {
    const categoryDir = path.join(ROOT, category);
    if (!fs.existsSync(categoryDir)) continue;

    const entries = fs.readdirSync(categoryDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillFile = path.join(categoryDir, entry.name, "SKILL.md");
      if (fs.existsSync(skillFile)) {
        skills.push(`./${category}/${entry.name}`);
      }
    }
  }

  return skills.sort((a, b) => {
    const categoryOrder = (p) =>
      CATEGORIES.indexOf(p.split("/")[1]);
    const ca = categoryOrder(a);
    const cb = categoryOrder(b);
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
}

function updateMarketplace(skills) {
  const data = JSON.parse(fs.readFileSync(MARKETPLACE_PATH, "utf8"));
  data.plugins[0].skills = skills;
  fs.writeFileSync(
    MARKETPLACE_PATH,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
  console.log(
    `Updated marketplace.json with ${skills.length} skills`
  );
}

function updatePlugin(skills) {
  const data = JSON.parse(fs.readFileSync(PLUGIN_PATH, "utf8"));
  data.skills = skills;
  fs.writeFileSync(
    PLUGIN_PATH,
    JSON.stringify(data, null, 2) + "\n",
    "utf8"
  );
  console.log(`Updated plugin.json with ${skills.length} skills`);
}

const skills = discoverSkills();
console.log(`Discovered ${skills.length} skills:`);
skills.forEach((s) => console.log(`  ${s}`));

updateMarketplace(skills);
updatePlugin(skills);
