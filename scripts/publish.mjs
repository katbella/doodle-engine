import { execSync } from "child_process";
import { readFileSync, rmSync } from "fs";
import { join } from "path";

function run(command, options = {}) {
  return execSync(command, { encoding: "utf8", ...options });
}

function runInherit(command, options = {}) {
  execSync(command, { stdio: "inherit", ...options });
}

function tagExists(tag) {
  try {
    execSync(`git rev-parse -q --verify "refs/tags/${tag}"`, {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

async function createGitHubRelease(tag) {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !token) {
    return;
  }

  const response = await fetch(
    `https://api.github.com/repos/${repo}/releases`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "doodle-engine-release-script",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        tag_name: tag,
        name: tag,
        generate_release_notes: true,
      }),
    },
  );

  if (response.status === 201) {
    console.log(`Created GitHub release for ${tag}`);
    return;
  }

  if (response.status === 422) {
    console.log(`GitHub release already exists for ${tag}`);
    return;
  }

  const body = await response.text();
  throw new Error(
    `Failed to create GitHub release for ${tag}: ${response.status} ${body}`,
  );
}

const workspaceLines = run(
  "yarn workspaces list --recursive --no-private --json",
)
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);

const workspaces = workspaceLines.map((line) => JSON.parse(line));
const tagsForRelease = [];

runInherit("git fetch --tags --force");

for (const workspace of workspaces) {
  const dir = workspace.location;
  const manifestPath = join(dir, "package.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const tag = `${manifest.name}@${manifest.version}`;
  const tarballName = "package.tgz";

  runInherit(`yarn pack -o ${tarballName}`, { cwd: dir });

  try {
    const packedManifest = run(`tar -xOf ${tarballName} package/package.json`, {
      cwd: dir,
    });

    if (packedManifest.includes('"workspace:')) {
      throw new Error(
        `${manifest.name}: packed manifest still contains workspace:`,
      );
    }

    runInherit("yarn npm publish --access public --tolerate-republish", {
      cwd: dir,
    });
  } finally {
    rmSync(join(dir, tarballName), { force: true });
  }

  if (!tagExists(tag)) {
    runInherit(`git tag "${tag}"`);
    runInherit(`git push origin "${tag}"`);
  }

  tagsForRelease.push(tag);
}

for (const tag of tagsForRelease) {
  await createGitHubRelease(tag);
}
