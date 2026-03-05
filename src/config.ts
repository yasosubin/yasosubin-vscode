import * as v from 'valibot';
import { workspace } from 'vscode';

const getConfiguration = () => workspace.getConfiguration('yasosubin');

const DEFAULT_FRONTEND_BASE_URL = 'https://yaso.su/';

const BaseUrl = v.pipe(
    v.string(),
    v.url(),
    v.transform(value => value.endsWith('/') ? value : `${value}/`)
);

function normalizeUrl(value: string, fallback: string): string {
    const result = v.safeParse(BaseUrl, value);
    return result.success ? result.output : fallback;
}

function getFrontendBaseUrl() {
    const configured = getConfiguration().get<string | null>('overrideBasePath', DEFAULT_FRONTEND_BASE_URL) ?? DEFAULT_FRONTEND_BASE_URL;
    return normalizeUrl(configured, DEFAULT_FRONTEND_BASE_URL);
}

export function getFullPasteUrl(url: string) {
    return new URL(url, getFrontendBaseUrl()).toString();
}

export function getTokenPromptUrl() {
    return new URL('profile/tokens/new#name=VSCode%20Extension', getFrontendBaseUrl()).toString();
}

export function getProfilePastesUrl() {
    return new URL('profile', getFrontendBaseUrl()).toString();
}

export function getApiBaseUrl(): string {
    const configured = getConfiguration().get<string>('overrideApiBasePath', '');
    if (!configured) {
        return getFrontendBaseUrl();
    }
    return normalizeUrl(configured, getFrontendBaseUrl());
}

const PostCreateAction = v.fallback(v.picklist(['open', 'copy', 'none']), 'copy');
export function getPostCreateAction() {
    return v.parse(PostCreateAction, getConfiguration().get<string>('postCreateAction'));
}

const ExpirationTime = v.fallback(v.number(), 10080);
export function getExpirationTime() {
    return v.parse(ExpirationTime, getConfiguration().get<number>('expirationTime'));
}
