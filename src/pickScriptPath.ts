import * as vscode from "vscode";
import * as path from "path";

/**
 * Lets the user pick a script path either by selecting a workspace file
 * from a Quick Pick list or by entering a custom path manually.
 *
 * @since 2.1.2 [02-03-2026]
 * @version 2.1.2
 */
export async function pickScriptPath(): Promise<string | undefined> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const workspaceFolder = workspaceFolders?.[0];

  if (!workspaceFolder) {
    const manual = await vscode.window.showInputBox({
      title: "BoltS: Add script",
      prompt: "Path: use ./ for workspace-relative, ~ for home, or absolute path",
      placeHolder: "./scripts/run.sh",
      value: "./",
      validateInput: (v) => (!v?.trim() ? "Enter a path" : undefined),
    });
    return manual?.trim() || undefined;
  }

  const include = new vscode.RelativePattern(workspaceFolder, "**/*");
  const exclude = new vscode.RelativePattern(
    workspaceFolder,
    "**/{.git,node_modules,dist,out,build,coverage}/**"
  );

  const uris = await vscode.workspace.findFiles(include, exclude, 2000);
  const items: (vscode.QuickPickItem & { uri?: vscode.Uri; isCustom?: boolean })[] = [
    {
      label: "$(edit) Enter custom path…",
      description: "Type a path manually (./, ~/ or absolute)",
      isCustom: true,
    },
  ];

  for (const uri of uris) {
    items.push({
      label: vscode.workspace.asRelativePath(uri),
      description: uri.fsPath,
      uri,
    });
  }

  const picked = await vscode.window.showQuickPick(items, {
    title: "BoltS: Pick script file",
    placeHolder: "Type to filter files, or choose custom path",
    matchOnDescription: true,
  });

  if (!picked) {
    return undefined;
  }

  if (picked.isCustom) {
    const manual = await vscode.window.showInputBox({
      title: "BoltS: Add script",
      prompt: "Path: use ./ for workspace-relative, ~ for home, or absolute path",
      placeHolder: "./scripts/run.sh",
      value: "./",
      validateInput: (v) => (!v?.trim() ? "Enter a path" : undefined),
    });
    return manual?.trim() || undefined;
  }

  if (!picked.uri) {
    return undefined;
  }

  const workspaceRoot = workspaceFolder.uri.fsPath;
  const absolutePath = picked.uri.fsPath;
  if (absolutePath.startsWith(workspaceRoot)) {
    const relative = path.relative(workspaceRoot, absolutePath).replace(/\\/g, "/");
    return `./${relative}`;
  }

  return absolutePath;
}

