import * as vscode from 'vscode';
import { api } from '../apiWrapper';
import { getProfile } from '../client';

export const PROVIDER_ID = 'yasosu';
export const PROVIDER_LABEL = 'Yasosu';

const SESSION_KEY = 'yasosu.session';

type StoredSession = {
    id: string;
    accessToken: string;
    accountId: string;
    accountLabel: string;
};

async function stableIdFromToken(token: string): Promise<string> {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    return Array.from(new Uint8Array(buf)).slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
}

export class YasosuAuthProvider implements vscode.AuthenticationProvider, vscode.Disposable {
    private readonly _onDidChangeSessions
        = new vscode.EventEmitter<vscode.AuthenticationProviderAuthenticationSessionsChangeEvent>();

    readonly onDidChangeSessions = this._onDidChangeSessions.event;

    private readonly _secretStorage: vscode.SecretStorage;
    private readonly _disposables: vscode.Disposable[] = [];

    // Tracks the last observed session for cross-window change detection
    private _lastSession: vscode.AuthenticationSession | undefined;

    constructor(secretStorage: vscode.SecretStorage) {
        this._secretStorage = secretStorage;

        this._disposables.push(
            secretStorage.onDidChange(async (e) => {
                if (e.key === SESSION_KEY) {
                    await this.checkForUpdates();
                }
            })
        );
    }

    async getSessions(
        _scopes: readonly string[] | undefined,
        options: vscode.AuthenticationProviderSessionOptions
    ): Promise<vscode.AuthenticationSession[]> {
        const session = await this.readAndParseSession();
        this._lastSession = session;

        if (!session)
            return [];

        if (options.account && session.account.id !== options.account.id)
            return [];

        return [session];
    }

    async createSession(
        scopes: readonly string[],
        _options: vscode.AuthenticationProviderSessionOptions
    ): Promise<vscode.AuthenticationSession> {
        const token = await vscode.window.showInputBox({
            title: 'Sign in to Yasosu',
            prompt: `Paste your Yasosu API token. [Create a token](command:yasosu.openTokenPage)`,
            placeHolder: 'ys-pub-✲✲✲',
            password: true,
            ignoreFocusOut: true,
            validateInput: v =>
                v && v.startsWith('ys-pub-') ? undefined : 'Token must start with ys-pub-'
        });

        if (token == null || token === '') {
            throw new Error('Sign-in cancelled');
        }

        return vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'Signing in to Yasosu…', cancellable: false },
            async () => {
                const result = await api(getProfile({ auth: token }));

                if (!result.success) {
                    vscode.window.showErrorMessage(`Yasosu sign-in failed: ${result.message}`);
                    throw new Error('Yasosu sign-in response failed');
                }

                const data = result.data;

                const displayName = data.displayName ?? 'Authorized';
                const accountId = await stableIdFromToken(token);

                const newSession: vscode.AuthenticationSession = {
                    id: `yasosu-${accountId}`,
                    accessToken: token,
                    account: { id: accountId, label: displayName },
                    scopes: [...scopes]
                };

                await this.store(newSession);

                return newSession;
            }
        );
    }

    async removeSession(sessionId: string): Promise<void> {
        const session = this._lastSession ?? await this.readAndParseSession();
        if (!session || session.id !== sessionId) {
            return;
        }

        await this.store(undefined);
        this._lastSession = undefined;
        this._onDidChangeSessions.fire({
            added: [],
            removed: [session],
            changed: []
        });
    }

    dispose(): void {
        this._onDidChangeSessions.dispose();
        for (const d of this._disposables)
            d.dispose();
    }

    private async readAndParseSession(): Promise<vscode.AuthenticationSession | undefined> {
        const raw = await this._secretStorage.get(SESSION_KEY);
        if (raw === undefined) {
            return undefined;
        }
        try {
            // eslint-disable-next-line ts/no-unsafe-assignment
            const stored: StoredSession = JSON.parse(raw);
            return {
                id: stored.id,
                accessToken: stored.accessToken,
                account: { id: stored.accountId, label: stored.accountLabel },
                scopes: []
            };
        }
        catch {
            return undefined;
        }
    }

    private async store(session: vscode.AuthenticationSession | undefined) {
        if (!session) {
            await this._secretStorage.delete(SESSION_KEY);
            return;
        }

        const stored: StoredSession = {
            id: session.id,
            accessToken: session.accessToken,
            accountId: session.account.id,
            accountLabel: session.account.label
        };

        await this._secretStorage.store(SESSION_KEY, JSON.stringify(stored));
    }

    public async checkForUpdates(): Promise<void> {
        const current = await this.readAndParseSession();

        if (this._lastSession?.id === current?.id)
            return;

        const added = current ? [current] : [];
        const removed = this._lastSession ? [this._lastSession] : [];

        this._lastSession = current;
        this._onDidChangeSessions.fire({ added, removed, changed: [] });
    }
}
