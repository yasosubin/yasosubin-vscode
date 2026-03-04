import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
    input: './openapi.yaml',
    output: 'src/client',
    plugins: [
        {
            name: '@hey-api/sdk',
            validator: 'valibot',
            examples: true,
            paramsStructure: 'flat',
        },
        {
            dates: true,
            name: '@hey-api/transformers',
        },
    ]
});