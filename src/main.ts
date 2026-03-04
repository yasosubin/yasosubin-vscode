import * as vscode from 'vscode';
import { PROVIDER_ID, PROVIDER_LABEL, YasosuAuthProvider } from './auth';
import { client } from './client/client.gen';
import { createPasteFromSelectionCommand } from './commands/createPasteFromSelection';
import { getApiBaseUrl, getProfilePastesUrl, getTokenPromptUrl } from './config';

async function updateSignedInContext() {
    const session = await vscode.authentication.getSession(PROVIDER_ID, [], { createIfNone: false, silent: true });
    await vscode.commands.executeCommand('setContext', 'yasosu.signedIn', !!session);
}

export function activate(context: vscode.ExtensionContext) {
    client.setConfig({
        async auth() {
            const result = await vscode.authentication.getSession(PROVIDER_ID, [], { createIfNone: false, silent: true });
            return result?.accessToken;
        },
        baseUrl: getApiBaseUrl(),
        headers: {
            'Api-Version': '1'
        },
        throwOnError: true
    });

    const provider = new YasosuAuthProvider(context.secrets);

    void updateSignedInContext();

    context.subscriptions.push(
        vscode.authentication.onDidChangeSessions((e) => {
            if (e.provider.id === PROVIDER_ID) {
                void updateSignedInContext();
            }
        }),
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (!event.affectsConfiguration('yasosu')) {
                return;
            }

            client.setConfig({
                baseUrl: getApiBaseUrl()
            });
        }),
        vscode.authentication.registerAuthenticationProvider(
            PROVIDER_ID,
            PROVIDER_LABEL,
            provider,
            { supportsMultipleAccounts: false }
        ),
        vscode.commands.registerCommand('yasosu.signIn', async () => {
            const existing = await vscode.authentication.getSession(PROVIDER_ID, [], { silent: true });
            if (existing) {
                vscode.window.showInformationMessage(`You're already signed-in!`);
                return;
            }

            try {
                await vscode.authentication.getSession(PROVIDER_ID, [], { createIfNone: true });
            }
            catch (e) {
                console.error(e);
            }
        }),
        vscode.commands.registerCommand('yasosu.openTokenPage', () => {
            vscode.env.openExternal(vscode.Uri.parse(getTokenPromptUrl(), true));
        }),
        vscode.commands.registerCommand('yasosu.openWalkthrough', () => {
            vscode.commands.executeCommand(
                'workbench.action.openWalkthrough',
                'yasosubin.yasosubin-vscode#getStarted',
                false
            );
        }),
        vscode.commands.registerCommand('yasosu.viewMyPastes', () => {
            vscode.env.openExternal(vscode.Uri.parse(getProfilePastesUrl(), true));
        }),
        vscode.commands.registerTextEditorCommand('yasosu.createPasteFromSelection', createPasteFromSelectionCommand),
        provider
    );
}

export function deactivate() {}
