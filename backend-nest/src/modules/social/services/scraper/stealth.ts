import { Page } from 'playwright';

/**
 * Applies stealth scripts to a Playwright page to evade bot detection.
 * Replaces the functionality of puppeteer-extra-plugin-stealth.
 */
export async function applyStealthScripts(page: Page): Promise<void> {
  const stealthScript = `
    (() => {
        console.log('Stealth: Applying scripts...');

        // 1. Pass the Webdriver Test
        try {
            if (navigator.webdriver) {
                 // Try to delete property from prototype
                 if (Object.getPrototypeOf(navigator).hasOwnProperty('webdriver')) {
                     delete Object.getPrototypeOf(navigator).webdriver;
                 }
            }
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            console.log('Stealth: navigator.webdriver overridden');
        } catch (e) {
            console.error('Stealth: Failed to override navigator.webdriver', e);
        }

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
                console.log('Stealth: window.chrome overridden');
            }
        } catch (e) {
            console.error('Stealth: Failed to override window.chrome', e);
        }

        // 3. Mock Plugins
        try {
            if (!navigator.plugins || navigator.plugins.length === 0) {
                const mkPlugin = (name) => {
                    const plugin = { 
                        name, 
                        description: name, 
                        filename: name + '.dll', 
                        length: 1 
                    };
                    plugin[0] = { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format', enabledPlugin: plugin };
                    return plugin;
                };

                const plugins = [
                    mkPlugin('Chrome PDF Plugin'),
                    mkPlugin('Chrome PDF Viewer'),
                    mkPlugin('Native Client')
                ];
                
                plugins.item = function(index) { return this[index]; };
                plugins.namedItem = function(name) { return this.find(p => p.name === name); };
                plugins.refresh = function() {};

                // Correctly override on prototype to satisfy "navigator.plugins" check
                Object.defineProperty(Navigator.prototype, 'plugins', {
                    get: () => plugins,
                    configurable: true, 
                    enumerable: true
                });

                Object.defineProperty(Navigator.prototype, 'mimeTypes', {
                    get: () => {
                       const mimeTypes = [{
                           type: 'application/pdf',
                           suffixes: 'pdf',
                           description: 'Portable Document Format',
                           enabledPlugin: plugins[0]
                       }];
                       mimeTypes.item = function(index) { return this[index]; };
                       mimeTypes.namedItem = function(type) { return this.find(m => m.type === type); };
                       return mimeTypes;
                    },
                    configurable: true, 
                    enumerable: true
                });
                console.log('Stealth: navigator.plugins overridden');
            }
        } catch (e) {
             console.error('Stealth: Failed to override navigator.plugins', e);
        }

        // 4. Permissions
        try {
            if (navigator.permissions && navigator.permissions.query) {
                const originalQuery = navigator.permissions.query;
                navigator.permissions.query = (parameters) => (
                    parameters.name === 'notifications' ?
                        Promise.resolve({ state: 'denied', onchange: null }) :
                        originalQuery(parameters)
                );
            }
            console.log('Stealth: permissions overridden');
        } catch (e) {
             console.error('Stealth: Failed to override permissions', e);
        }

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
            console.log('Stealth: WebGL overridden');
        } catch (e) {
             console.error('Stealth: Failed to override WebGL', e);
        }
    })();
    `;

  await page.addInitScript({ content: stealthScript });
}
