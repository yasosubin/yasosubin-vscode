import * as vscode from 'vscode';
import { PROVIDER_ID } from './YasosuAuthProvider';

export { PROVIDER_ID, PROVIDER_LABEL, YasosuAuthProvider } from './YasosuAuthProvider';

export async function getYasosuSession(): Promise<vscode.AuthenticationSession | undefined> {
    return vscode.authentication.getSession(PROVIDER_ID, [], { createIfNone: false, silent: true });
}

export async function requireYasosuSession(): Promise<vscode.AuthenticationSession> {
    return vscode.authentication.getSession(PROVIDER_ID, [], { createIfNone: true });
}
