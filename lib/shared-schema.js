/** @babel */
/** @jsx etch.dom */
/* global atom Set */

import { CompositeDisposable, Emitter } from 'atom'
import deepEqual from 'deep-equal'
import deepClone from 'deep-clone'

export default class SharedSchema
{
    constructor () {
        this.disposables = new CompositeDisposable()
        this.emitter = new Emitter()
        this.mergedSchema = {}

        this.disposables.add(atom.packages.onDidActivatePackage(this.loadSchemaFromPackage.bind(this)))
        this.disposables.add(atom.packages.onDidDeactivatePackage(this.loadSchemasFromPackages.bind(this)))

        this.loadSchemasFromPackages()
    }

    destroy () {
        this.disposables.dispose()
    }

    onDidSchemaChange (cb) {
        return this.emitter.on('schema-change', cb)
    }

    applySchema () {
        atom.config.setSchema('shared', {
            type: 'object',
            properties: this.mergedSchema
        })

        this.emitter.emit('schema-change')
    }

    loadSchemasFromPackages () {
        this.mergedSchema = {}

        for (const pkg of atom.packages.getActivePackages()) {
            this.loadSchemaFromPackage(pkg, false)
        }

        this.applySchema()
    }

    loadSchemaFromPackage (pkg, applyToConfig = true) {
        let schema

        if (pkg.metadata && pkg.metadata.sharedConfigSchema) {
            schema = pkg.metadata.sharedConfigSchema
        } else if (pkg.mainModule && typeof pkg.mainModule.sharedConfig === 'object') {
            schema = pkg.mainModule.sharedConfig
        }

        if (schema) {
            this.mergeSchemaObjects(pkg.name, this.mergedSchema, schema, 'shared')

            if (applyToConfig) {
                this.applySchema()
            }
        }
    }

    mergeSchemaItem = (pkgName, target, source) => {
        let packages, clone

        if (!target) {
            clone = deepClone(source)
        } else {
            packages = target.packages
            clone = deepClone(target)

            delete clone.packages

            if (source && !deepEqual(clone, source)) {
                return null
            }
        }

        clone.packages = [...(new Set(packages ? packages.concat(pkgName) : [pkgName]))]

        return clone
    }

    mergeSchemaObjects = (pkgName, target, source, path) => {
        // const merged = {}

        for (const key in source) {
            const srcItem = source[key]

            let clonedItem = null
            let packages = null

            if ('object' === srcItem.type) {
                let targetItem = null

                if (key in target) {
                    packages = target[key].packages
                    if ('object' === target[key].type && 'object' === typeof target[key].properties) {
                        targetItem = target[key]
                    }
                } else {
                    targetItem = {
                        type: 'object',
                        properties: {},
                        packages: [pkgName]
                    }
                }

                if (targetItem) {
                    this.mergeSchemaObjects(pkgName, targetItem.properties, srcItem.properties, path + '.' + key)
                    clonedItem = targetItem
                }
            } else {
                packages = target[key] && target[key].packages
                clonedItem = this.mergeSchemaItem(pkgName, target[key], srcItem)
            }

            if (!clonedItem) {
                atom.notifications.addWarning('Failed to merge shared schema', {
                    detail: `Schema "${path}" in package "${pkgName}" conflicts with packages (${packages ? packages.join(", ") : null})`,
                    dismissable: true
                })
            } else {
                target[key] = clonedItem
            }
        }

        // for (const key in target) {
        //     if (!(key in source)) {
        //         merged[key] = target[key]
        //     }
        // }
        //
        // return merged
    }
}
