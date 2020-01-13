'use babel';

import {
    CompositeDisposable
} from 'atom';

export default {

    subscriptions: null,
    domparser: null,
    datatipBuffer: null,

    activate(state) {

        // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
        this.subscriptions = new CompositeDisposable();

        // // Register command that toggles this view
        this.subscriptions.add(atom.commands.add('atom-text-editor', {
            'cfn-util:insert-template': () => this.insertTemplate()
        }));

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
                let [aws, service, type] = awsTypeData.matchText.split("::");
                const template = await this.getCFnTemplateRef(service, type);

                this.datatipBuffer = {
                    range: awsTypeData.range,
                    markedStrings: [{
                        type: 'markdown',
                        value: "```\n" + template + "\n```"
                    }],
                    pinnable: true
                }

                return this.datatipBuffer;
            }
        } catch (err) {
            console.log(err);
        }
    },

    insertTemplate() {
        let editor = atom.workspace.getActiveTextEditor();
        if (this.datatipBuffer != null) {
            let template = this.datatipBuffer.markedStrings[0].value;
            let rowRange = editor.getBuffer().rangeForRow(this.datatipBuffer.range.start.row);
            template = template.replace(/^.*\"Type\" : /s, '');
            template = template.replace("\n```", '');

            editor.scanInBufferRange(/\"?AWS\:\:\w*\:\:\w*\"?/g, rowRange, (data) => {
                console.log(data);
                editor.setTextInBufferRange(data.range, template);
                data.stop();
            });
        }
    },

    async handleURI(parsedUri) {
        // For debugging purpose
        console.log(parsedUri);
        if (parsedUri.pathname == "/insertTemplate") {
            // const ret = await this.getCFnTemplateRef(parsedUri.query.awsService, parsedUri.query.type, parsedUri.query.property);
            // console.log(ret);
            this.insertTemplate();
        } else if (parsedUri.pathname == "/getDecoration") {
            atom.workspace.observeTextEditors((editor) => {
                let dec = editor.getDecorations({
                    type: "highlight",
                    class: "datatip-highlight-region"
                });
                console.log(dec);
                console.log(dec[0].getMarker().getBufferRange());
            });
        } else {
            console.log("Invalid URI Handler.")
        }
    },

    async getCFnTemplateRef(awsService, type, property = null) {
        try {
            const docurl = "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-" +
                awsService.toLowerCase() +
                "-" + type.toLowerCase() + ".partial.html";
            let res = await fetch(docurl, {
                redirect: 'manual'
            });
            if (res.status != 200) {
                // try another url
                const docurl2 = "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-" +
                    awsService.toLowerCase() +
                    "-" + type.toLowerCase() + ".partial.html";
                res = await fetch(docurl2, {
                    redirect: 'manual'
                });
                if (res.status != 200) {
                    return null;
                }
            }

            const text = await res.text();
            const doc = this.domparser.parseFromString(text, "text/html");
            if (property == null) {
                return doc.querySelector("code.json").innerText;
            } else {
                const selector = "#cfn-" + awsService.toLowerCase() + "-" +
                    type.toLowerCase() + "-" +
                    property.toLowerCase();
                const item = doc.querySelector(selector).parentNode;
                return item.innerText + item.nextElementSibling.innerText;
            }
        } catch (err) {
            console.log(err);
        }
    }
};