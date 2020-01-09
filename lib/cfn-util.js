'use babel';

import {
    CompositeDisposable
} from 'atom';

export default {

    subscriptions: null,
    domparser: null,

    activate(state) {

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // // Register command that toggles this view
        // this.subscriptions.add(atom.commands.add('atom-workspace', {
        //     'cfn-util:toggle': () => this.toggle()
        // }));

        this.domparser = new DOMParser();
    },

    deactivate() {
        this.subscriptions.dispose();
    },

    serialize() {
        return {};
    },

    consumeDatatip(service) {
        console.log("Consume Datatip")
        this.subscriptions.add(
            service.addProvider({
                providerName: "CFnUtil",
                priority: 2,
                grammarScopes: ["source.json"],
                datatip: this.getDatatip.bind(this)
            })
        )
    },

    async getDatatip(editor, point) {
        console.log("Get Datatip");
        try {
            const rowRange = editor.getBuffer().rangeForRow(point.row);

            // Search AWS resource type
            let awsTypeData = null;
            editor.scanInBufferRange(/AWS\:\:\w*\:\:\w*/g, rowRange, (data) => {
                if (point.isGreaterThanOrEqual(data.range.start) && point.isLessThan(data.range.end)) {
                    awsTypeData = data;
                    data.stop();
                }
            });
            if (awsTypeData != null) {
                return {
                    range: awsTypeData.range,
                    markedStrings: [{
                        type: 'markdown',
                        value: awsTypeData.matchText
                    }]
                };
            }
        } catch (err) {
            console.log(err);
        }
    }
};