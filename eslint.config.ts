import antfu from '@antfu/eslint-config';

export default antfu({
    ignores: ['src/client', 'package-lock.json', '**/package-lock.json/**'],
    formatters: true,
    stylistic: {
        indent: 4,
        quotes: 'single',
        semi: true,
        overrides: {
            'style/comma-dangle': ['error', 'never']
        }
    },
    yaml: {
        overrides: {
            'yaml/indent': ['error', 2]
        }
    },
    typescript: {
        tsconfigPath: 'tsconfig.json',
        overrides: {
            'ts/consistent-type-definitions': ['warn', 'type']
        }
    }
}, {
    rules: {
        'eslint-comments/no-unlimited-disable': 'off',
        'ts/strict-boolean-expressions': 'off'
    }
});
