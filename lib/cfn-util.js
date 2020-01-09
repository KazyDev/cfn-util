'use babel';

import CfnUtilView from './cfn-util-view';
import { CompositeDisposable } from 'atom';

export default {

  cfnUtilView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.cfnUtilView = new CfnUtilView(state.cfnUtilViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.cfnUtilView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'cfn-util:toggle': () => this.toggle()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.cfnUtilView.destroy();
  },

  serialize() {
    return {
      cfnUtilViewState: this.cfnUtilView.serialize()
    };
  },

  toggle() {
    console.log('CfnUtil was toggled!');
    return (
      this.modalPanel.isVisible() ?
      this.modalPanel.hide() :
      this.modalPanel.show()
    );
  }

};
