/** @babel */
/* global atom */

import { CompositeDisposable } from 'atom'

import SharedPanel from './shared-panel'

const CONFIG_URI = 'atom://config'

export default
{
    subscriptions: null,

    activate () {
        this.subscriptions = new CompositeDisposable()

        this.subscriptions.add(atom.workspace.observePaneItems((item) => {
            if (typeof item.getURI === 'function' && item.getURI().startsWith(CONFIG_URI)) {
                this.injectSharedPanel(item)
            }
        }))
    },

    deactivate () {
        this.subscriptions.dispose()
    },

    injectSharedPanel (settingsView) {
        if ((null == settingsView.panelCreateCallbacks || !('Shared' in settingsView.panelCreateCallbacks)) &&
            (null == settingsView.panelsByName || !('Shared' in settingsView.panelsByName))) {
            // We hook this method for two reasons
            // 1. Calling addCorePanel directly, results in the menu item being unclickable
            //    when the seetings view is restored from a serialized state.
            //    initializePanels resets the panelsByName property.
            // 2. We have finer control over where the item is added.
            const hook = settingsView.addCorePanel
            settingsView.addCorePanel = (name, icon, cb) => {
                hook.call(settingsView, name, icon, cb)
                if ('Core' === name) {
                    hook.call(settingsView, 'Shared', 'gear', () => new SharedPanel())
                }
            }
        }
    }
};
