(function (Scratch) {
    'use strict';

    const vm = Scratch.vm;
    const Cast = Scratch.Cast;

    if (!Scratch || !Scratch.extensions || typeof Scratch.extensions.register !== 'function') {
        throw new Error('This extension requires the Scratch extension API.');
    }

    Scratch.vm.runtimeVariables = Scratch.vm.runtimeVariables || {};
    const GLOBAL_VARIABLES_KEY = '__runtimeVariablesGlobals';
    const SPRITE_VARIABLES_KEY = '__runtimeVariablesSprites';
    const runtimeVariablesRoot = Scratch.vm.runtimeVariables;

    if (!runtimeVariablesRoot[GLOBAL_VARIABLES_KEY]) {
        runtimeVariablesRoot[GLOBAL_VARIABLES_KEY] = {};
    }
    if (!runtimeVariablesRoot[SPRITE_VARIABLES_KEY]) {
        runtimeVariablesRoot[SPRITE_VARIABLES_KEY] = {};
    }

    for (const [key, value] of Object.entries(runtimeVariablesRoot)) {
        if (key === GLOBAL_VARIABLES_KEY || key === SPRITE_VARIABLES_KEY || key === 'runtimeVariablesObjectsExtensionLoaded') {
            continue;
        }
        if (key === 'globalVariables' || key === 'spriteVariables') {
            continue;
        }
        if (key.startsWith('__runtimeVariables')) {
            continue;
        }
        if (typeof value === 'object' && value !== null) {
            runtimeVariablesRoot[SPRITE_VARIABLES_KEY][key] = value;
        } else {
            runtimeVariablesRoot[GLOBAL_VARIABLES_KEY][key] = value;
        }
        delete runtimeVariablesRoot[key];
    }

    const threadVariables = new WeakMap();

    const getGlobalVariableStore = () => runtimeVariablesRoot[GLOBAL_VARIABLES_KEY];
    const getSpriteVariableStore = spriteId => {
        const sprites = runtimeVariablesRoot[SPRITE_VARIABLES_KEY];
        if (!sprites[spriteId]) {
            sprites[spriteId] = {};
        }
        return sprites[spriteId];
    };

    const objectsExtensionUrl = 'https://raw.githubusercontent.com/PenguinMod/PenguinMod-ExtensionsGallery/18f0daf7b5d1f74e9a0b5f77182956ddfb8f204f/static/extensions/DogeisCut/dogeiscutObject.js';
    const objectsExtensionLoaded = 'runtimeVariablesObjectsExtensionLoaded';

    const loadObjectsExtension = () => {
        if (window[objectsExtensionLoaded]) {
            return;
        }

        window[objectsExtensionLoaded] = true;

        if (typeof XMLHttpRequest !== 'undefined') {
            try {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', objectsExtensionUrl, false);
                xhr.send(null);
                if (xhr.status === 200 || xhr.status === 0) {
                    new Function(xhr.responseText)();
                    return;
                }
                throw new Error(`HTTP ${xhr.status} ${xhr.statusText}`);
            } catch (error) {
                console.error('Failed to load Objects extension synchronously from', objectsExtensionUrl, error);
            }
        }

        if (typeof document !== 'undefined') {
            const script = document.createElement('script');
            script.src = objectsExtensionUrl;
            script.async = false;
            script.onerror = () => {
                console.error('Failed to load Objects extension from', objectsExtensionUrl);
            };
            document.head.appendChild(script);
        } else {
            console.error('Cannot load Objects extension: no document or XMLHttpRequest available.');
        }
    };

    loadObjectsExtension();

    const getFallbackDogeiscutObject = () => {
        const fallback = {
            Type: class {
                static toObject(x) {
                    if (x === null || x === undefined || x === '') {
                        return {};
                    }
                    if (typeof x === 'object') {
                        if (x instanceof Map) {
                            return Object.fromEntries(x.entries());
                        }
                        if (typeof x.toJSON === 'function') {
                            try {
                                return fallback.Type.toObject(x.toJSON());
                            } catch (error) {
                                return x;
                            }
                        }
                        return x;
                    }
                    return { value: x };
                }
            },
            Block: {},
            Argument: {}
        };
        try { fallback.Type.blank = {}; } catch (e) {}
        return fallback;
    };

    const getFallbackJwArray = () => ({
        Type: class {
            static toArray(x) {
                return Array.isArray(x) ? x : [];
            }
        },
        Block: {},
        Argument: {}
    });

    const ensureDogeiscutObjectExtension = () => {
        if (vm && vm.dogeiscutObject && vm.dogeiscutObject.Type && typeof vm.dogeiscutObject.Type.toObject === 'function') {
            return;
        }
        if (!vm) return;
        if (!vm.dogeiscutObject) {
            vm.dogeiscutObject = getFallbackDogeiscutObject();
        }
        if (!vm.jwArray) {
            vm.jwArray = getFallbackJwArray();
        }
    };

    const toObj = value => {
        ensureDogeiscutObjectExtension();
        if (vm.dogeiscutObject && vm.dogeiscutObject.Type && typeof vm.dogeiscutObject.Type.toObject === 'function') {
            return vm.dogeiscutObject.Type.toObject(value);
        }
        if (value === null || value === undefined || value === '') {
            return {};
        }
        if (typeof value === 'object') {
            if (value instanceof Map) {
                return Object.fromEntries(value.entries());
            }
            if (typeof value.toJSON === 'function') {
                try {
                    return toObj(value.toJSON());
                } catch (e) {
                    return value;
                }
            }
            return value;
        }
        return { value };
    };

    class RuntimeVariables {
        getInfo() {
            return {
                id: 'runtimeVariables',
                name: 'Runtime Variables',
                color1: '#0083ff',
                menuIconURI: 'data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHdpZHRoPSIxMjgiIGhlaWdodD0iMTI4IiB2aWV3Qm94PSIwLDAsMTI4LDEyOCI+PGcgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTE3NiwtMTE2KSI+PGcgc3Ryb2tlPSJub25lIiBzdHJva2UtbWl0ZXJsaW1pdD0iMTAiPjxwYXRoIGQ9Ik0xNzYsMTgwYzAsLTM1LjM0NjIyIDI4LjY1Mzc4LC02NCA2NCwtNjRjMzUuMzQ2MjIsMCA2NCwyOC42NTM3OCA2NCw2NGMwLDM1LjM0NjIyIC0yOC42NTM3OCw2NCAtNjQsNjRjLTM1LjM0NjIyLDAgLTY0LC0yOC42NTM3OCAtNjQsLTY0eiIgZmlsbD0iIzAwNTZlNiIgc3Ryb2tlLXdpZHRoPSJOYU4iLz48cGF0aCBkPSJNMTg0LjIzODEsMTgwYzAsLTMwLjc5NjQ1IDI0Ljk2NTQ2LC01NS43NjE5IDU1Ljc2MTksLTU1Ljc2MTljMzAuNzk2NDUsMCA1NS43NjE5LDI0Ljk2NTQ2IDU1Ljc2MTksNTUuNzYxOWMwLDMwLjc5NjQ1IC0yNC45NjU0Niw1NS43NjE5IC01NS43NjE5LDU1Ljc2MTljLTMwLjc5NjQ1LDAgLTU1Ljc2MTksLTI0Ljk2NTQ2IC01NS43NjE5LC01NS43NjE5eiIgZmlsbD0iIzAwODNmZiIgc3Ryb2tlLXdpZHRoPSIwIi8+PHBhdGggZD0iTTIwNi4wNjQ0MSwyMDEuOTEyOTFjLTguNjUwMiwwIC0xNS42NjI1OCwtNy4wMTIzNyAtMTUuNjYyNTgsLTE1LjY2MjU4YzAsLTguNjUwMiA3LjAxMjM4LC0xNS42NjI1OCAxNS42NjI1OCwtMTUuNjYyNThjMCwtMTEuNTMzNiA5LjM0OTgzLC0yMC44ODM0NCAyMC44ODM0NCwtMjAuODgzNDRjMTEuNTMzNiwwIDIwLjg4MzQ0LDkuMzQ5ODQgMjAuODgzNDQsMjAuODgzNDRjMCwtNS40MDYzOCA1Ljg0MzY1LC05Ljc4OTEyIDEzLjA1MjE1LC05Ljc4OTEyYzcuMjA4NTEsMCAxMy4wNTIxNSw0LjM4MjczIDEzLjA1MjE1LDkuNzg5MTJjOC42NTAyLDAgMTUuNjYyNTgsNy4wMTIzNyAxNS42NjI1OCwxNS42NjI1OGMwLDguNjUwMjEgLTcuMDEyMzgsMTUuNjYyNTggLTE1LjY2MjU4LDE1LjY2MjU4ek0yNDEuNzg1NDksMTk5LjM1OTFjNi45NTY0NywtMS4wMDkzNiAxMS44MjEyMywtNi44NDE3MyAxMS45MTc3OSwtMTMuNjcyMmMtMC43NDc5OSwwLjI2OTczIC0xLjczOTgxLDAuNTUyMjEgLTIuNzk5ODcsMC44MDUyMWMtMC40OTY5OCw1LjEyMzQ1IC00LjMxMTczLDkuMzY2MjMgLTkuNjMxNzksMTAuMTM4MTVjLTYuNDYzOTUsMC45Mzc5IC0xMi43MDIzNSwtMy42MDMyOCAtMTMuOTMzODUsLTEwLjE0Mjk5Yy0xLjIzMTUsLTYuNTM5NzEgMy4wMTAyNCwtMTIuNjAxNTIgOS40NzQxOSwtMTMuNTM5NDJjMS41ODUyOSwtMC4yMzAwMiAzLjE1NzAxLC0wLjEzMDQ4IDQuNjQ0NjQsMC4yNDcyN2wtMS4zNjI3NiwxLjk3MjI3bDkuNDM4NzIsMS4xNjM1OWwtNC4yNDM0LC04LjY4MjU5bC0yLjIwNDA5LDMuMTg5OWMtMi4xMzkwMywtMC43MTU2MyAtNC40NTEwMywtMC45NTgyMiAtNi43ODY5OCwtMC42MTkyOGMtNy45NTM1OSwxLjE1NDA0IC0xMy4xNzI4NCw4LjYxMjc5IC0xMS42NTc1NCwxNi42NTk2MWMxLjUxNTMxLDguMDQ2ODEgOS4xOTEzNiwxMy42MzQ1MSAxNy4xNDQ5NCwxMi40ODA0N3oiIGZpbGw9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMCIvPjwvZz48L2c+PC9zdmc+PCEtLXJvdGF0aW9uQ2VudGVyOjY0OjY0LS0+',
                blocks: [
                    {
                        opcode: 'setGlobalVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set global variable [VARIABLE] to [VALUE]',
                        arguments: {
                            VARIABLE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '0'
                            }
                        }
                    },
                    {
                        opcode: 'getGlobalVariable',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        text: 'get global variable [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            }
                        }
                    },
                    {
                        opcode: 'deleteGlobalVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'delete global variable [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            }
                        }
                    },
                    {
                        opcode: 'getAllGlobalVariablesAsObjects',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        allowDropAnywhere: true,
                        text: 'get all global variables as objects'
                    },
                    {
                        opcode: 'setSpriteVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set sprite variable [VARIABLE] to [VALUE]',
                        arguments: {
                            VARIABLE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '0'
                            }
                        }
                    },
                    {
                        opcode: 'getSpriteVariable',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        text: 'get sprite variable [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            }
                        }
                    },
                    {
                        opcode: 'deleteSpriteVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'delete sprite variable [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            }
                        }
                    },
                    {
                        opcode: 'getSpriteVariablesAsObjects',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        allowDropAnywhere: true,
                        text: 'get sprite variables as objects'
                    },
                    {
                        opcode: 'setThreadVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set thread variable [NAME] to [VALUE]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            },
                            VALUE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: '0'
                            }
                        }
                    },
                    {
                        opcode: 'getThreadVariable',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.OCTAGONAL,
                        text: 'get thread variable [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            }
                        }
                    },
                    {
                        opcode: 'deleteThreadVariable',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'delete thread variable [NAME]',
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'myVariable'
                            }
                        }
                    },
                    {
                        opcode: 'getThreadVariablesAsObjects',
                        blockType: Scratch.BlockType.REPORTER,
                        blockShape: Scratch.BlockShape.SQUARE,
                        allowDropAnywhere: true,
                        text: 'get thread variables as objects'
                    },
                    {
                        opcode: 'deleteAllVariables',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'delete all variables'
                    }
                ]
            };
        }

        setGlobalVariable(args) {
            const variableName = args.VARIABLE;
            const value = args.VALUE;
            getGlobalVariableStore()[variableName] = value;
        }

        getGlobalVariable(args) {
            const variableName = args.NAME;
            return getGlobalVariableStore()[variableName] || '';
        }

        deleteGlobalVariable(args) {
            const variableName = args.NAME;
            delete getGlobalVariableStore()[variableName];
        }

        getAllGlobalVariablesAsObjects() {
            return toObj(getGlobalVariableStore());
        }
        
        setSpriteVariable(args) {
            const variableName = args.VARIABLE;
            const value = args.VALUE;
            const spriteId = Scratch.vm.runtime.getEditingTarget().id;
            const variables = getSpriteVariableStore(spriteId);
            variables[variableName] = value;
        }

        getSpriteVariable(args) {
            const variableName = args.NAME;
            const spriteId = Scratch.vm.runtime.getEditingTarget().id;
            const sprites = runtimeVariablesRoot[SPRITE_VARIABLES_KEY];
            if (sprites[spriteId]) {
                return sprites[spriteId][variableName] || '';
            }
            return '';
        }

        deleteSpriteVariable(args) {
            const variableName = args.NAME;
            const spriteId = Scratch.vm.runtime.getEditingTarget().id;
            const sprites = runtimeVariablesRoot[SPRITE_VARIABLES_KEY];
            if (sprites[spriteId]) {
                delete sprites[spriteId][variableName];
            }
        }

        getSpriteVariablesAsObjects() {
            const spriteId = Scratch.vm.runtime.getEditingTarget().id;
            const sprites = runtimeVariablesRoot[SPRITE_VARIABLES_KEY];
            return toObj(sprites[spriteId] || {});
        }

        setThreadVariable(args, util) {
            const variableName = args.NAME;
            const value = args.VALUE;
            const thread = util?.thread;
            if (!thread) return;

            let variables = threadVariables.get(thread);
            if (!variables) {
                variables = {};
                threadVariables.set(thread, variables);
            }
            variables[variableName] = value;
        }

        getThreadVariable(args, util) {
            const variableName = args.NAME;
            const thread = util?.thread;
            if (!thread) return '';

            const variables = threadVariables.get(thread);
            return variables ? variables[variableName] || '' : '';
        }

        deleteThreadVariable(args, util) {
            const variableName = args.NAME;
            const thread = util?.thread;
            if (!thread) return;

            const variables = threadVariables.get(thread);
            if (variables) {
                delete variables[variableName];
            }
        }

        getThreadVariablesAsObjects(args, util) {
            const thread = util?.thread;
            if (!thread) return {};

            const variables = threadVariables.get(thread) || {};
            return toObj(variables);
        }

        deleteAllVariables() {
            Scratch.vm.runtimeVariables = {};
        }
    }

    Scratch.extensions.register(new RuntimeVariables());
})(Scratch);