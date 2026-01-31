import { Page } from 'playwright';

/**
 * Applies stealth scripts to a Playwright page to evade bot detection.
 * Replaces the functionality of puppeteer-extra-plugin-stealth.
 */
export async function applyStealthScripts(page: Page): Promise<void> {
    const stealthScript = `
    (() => {
        // 1. Pass the Webdriver Test
        try {
            if (navigator.webdriver) {
                 if (Object.getPrototypeOf(navigator).hasOwnProperty('webdriver')) {
                     delete Object.getPrototypeOf(navigator).webdriver;
                 }
            }
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
        } catch (e) {}

        // 2. Mock Chrome Runtime
        try {
            if (!window.chrome) {
                const chrome = {
                    runtime: {
                        app: {
                            isInstalled: false,
                            InstallState: {
                                DISABLED: 'disabled',
                                INSTALLED: 'installed',
                                NOT_INSTALLED: 'not_installed',
                            },
                            RunningState: {
                                CANNOT_RUN: 'cannot_run',
                                READY_TO_RUN: 'ready_to_run',
                                RUNNING: 'running',
                            },
                        },
                    },
                    loadTimes: function() {},
                    csi: function() {},
                };
                
                Object.defineProperty(window, 'chrome', {
                    writable: true,
                    enumerable: true,
                    configurable: false,
                    value: chrome,
                });
            }
        } catch (e) {}

        // 3. Mock Plugins
        try {
            if (!navigator.plugins || navigator.plugins.length === 0) {
                const mkPlugin = (name: string) => {
                    const plugin: any = { 
                        name, 
                        description: name, 
                        filename: name + '.dll', 
                        length: 1 
                    };
                    plugin[0] = { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: plugin };
                    return plugin;
                };

                const plugins: any = [
                    mkPlugin('Chrome PDF Plugin'),
                    mkPlugin('Chrome PDF Viewer'),
                    mkPlugin('Native Client')
                ];
                
                plugins.item = function(index: number) { return this[index]; };
                plugins.namedItem = function(name: string) { return this.find((p: any) => p.name === name); };
                plugins.refresh = function() {};

                Object.defineProperty(Navigator.prototype, 'plugins', {
                    get: () => plugins,
                    configurable: true, 
                    enumerable: true
                });

                Object.defineProperty(Navigator.prototype, 'mimeTypes', {
                    get: () => {
                       const mimeTypes: any = [{
                           type: 'application/pdf',
                           suffixes: 'pdf',
                           description: 'Portable Document Format',
                           enabledPlugin: plugins[0]
                       }];
                       mimeTypes.item = function(index: number) { return this[index]; };
                       mimeTypes.namedItem = function(type: string) { return this.find((m: any) => m.type === type); };
                       return mimeTypes;
                    },
                    configurable: true, 
                    enumerable: true
                });
            }
        } catch (e) {}

        // 4. Permissions
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const originalQuery = navigator.permissions.query;
                navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: 'denied', onchange: null } as any) :
                        originalQuery(parameters)
                );
            }
        } catch (e) {}

        // 5. WebGL
        try {
            const getParameter = WebGLRenderingContext.prototype.getParameter;
            WebGLRenderingContext.prototype.getParameter = function (parameter) {
                // UNMASKED_VENDOR_WEBGL
                if (parameter === 37445) {
                    return 'Intel Inc.';
                }
                // UNMASKED_RENDERER_WEBGL
                if (parameter === 37446) {
                    return 'Intel Iris OpenGL Engine';
                }
                return getParameter.apply(this, [parameter]);
            };
        } catch (e) {}
    })();
    `;

    await page.addInitScript({ content: stealthScript });
}
