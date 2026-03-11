import type { ApiResult } from '../apiWrapper';
import type { CreatePasteResponse } from '../client';
import * as vscode from 'vscode';
import { api } from '../apiWrapper';
import { requireYasosuSession } from '../auth';
import { createPaste, deletePaste } from '../client';
import { getExpirationTime, getFullPasteUrl, getPostCreateAction } from '../config';

async function handleDeletePaste(url: string) {
    const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to delete this paste?',
        { modal: true },
        'Delete'
    );

    if (confirm !== 'Delete') {
        return;
    }

    const result = await api(deletePaste({ url }));

    if (!result.success) {
        vscode.window.showErrorMessage(`Failed to delete paste: ${result.message}`);
    }
}

async function createPasteFromSelection(editor: vscode.TextEditor) {
    const selectedParts = editor.selections.map(selection => editor.document.getText(selection));
    const joinedSelectedParts = selectedParts.join('\n');

    if (selectedParts.length === 0 || joinedSelectedParts.trim() === '') {
        vscode.window.showWarningMessage('Select some text first!');
        return;
    }

    try {
        await requireYasosuSession();
    }
    catch (error) {
        console.error(error);
        vscode.window.showInformationMessage('Sign in cancelled');
        return;
    }

    let result!: ApiResult<CreatePasteResponse>;
    let codeLanguage = editor.document.languageId;
    for (let i = 0; i < 2; i++) {
        result = await api(createPaste({
            createPasteRequest: {
                content: joinedSelectedParts,
                codeLanguage,
                expirationTime: getExpirationTime()
            }
        }));

        if (!result.success && result.errorFields?.includes('codeLanguage') === true) {
            codeLanguage = 'auto';
            continue;
        }

        break;
    }

    if (!result.success) {
        vscode.window.showErrorMessage(`Failed to create Yasosu paste: ${result.message}`);
        return;
    }

    const pasteUrl = getFullPasteUrl(result.data.url);

    const postCreateAction = getPostCreateAction();

    if (postCreateAction === 'open') {
        await vscode.env.openExternal(vscode.Uri.parse(pasteUrl, true));
        return;
    }

    const openAction = 'Open';
    const deleteAction = 'Delete';

    let pickedAction: typeof openAction | typeof deleteAction | undefined;
    switch (postCreateAction) {
        case 'copy':
            await vscode.env.clipboard.writeText(pasteUrl);
            pickedAction = await vscode.window.showInformationMessage(
                'URL is now in your clipboard!',
                openAction,
                deleteAction
            );
            break;
        case 'none':
            pickedAction = await vscode.window.showInformationMessage(
                'The paste is ready!\nYou can find it in your profile',
                openAction,
                deleteAction
            );
            break;
    }

    switch (pickedAction) {
        case openAction:
            await vscode.env.openExternal(vscode.Uri.parse(pasteUrl, true));
            break;
        case deleteAction:
            await handleDeletePaste(result.data.url);
            break;
        case undefined:
        default:
    }
}

export function createPasteFromSelectionCommand(editor: vscode.TextEditor): void {
    void createPasteFromSelection(editor);
}
