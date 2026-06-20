import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";

function getPrivateKey(): string {
  return process.env.GITHUB_APP_PRIVATE_KEY!.replace(/\\n/g, "\n");
}

export async function getInstallationOctokit(
  installationId: string
): Promise<Octokit> {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: getPrivateKey(),
  });

  const { token } = await auth({
    type: "installation",
    installationId: parseInt(installationId),
  });

  return new Octokit({ auth: token });
}

export async function getInstallationToken(
  installationId: string
): Promise<string> {
  const auth = createAppAuth({
    appId: process.env.GITHUB_APP_ID!,
    privateKey: getPrivateKey(),
  });

  const { token } = await auth({
    type: "installation",
    installationId: parseInt(installationId),
  });

  return token;
}