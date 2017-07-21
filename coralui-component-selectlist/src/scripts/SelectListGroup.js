/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2017 Adobe Systems Incorporated
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

import Component from 'coralui-mixin-component';
import {SelectableCollection} from 'coralui-collection';
import {transform} from 'coralui-util';

const CLASSNAME = 'coral3-SelectList-group';

/**
 @class Coral.SelectList.Group
 @classdesc A SelectList group component
 @htmltag coral-selectlist-group
 @extends HTMLElement
 @extends Coral.mixin.component
 */
class SelectListGroup extends Component(HTMLElement) {
  constructor() {
    super();
  }
  
  /**
   The label of the group. It reflects the <code>label</code> attribute to the DOM.
   
   @type {String}
   @default ""
   @htmlattribute label
   @htmlattributereflected
   @memberof Coral.SelectList.Group#
   */
  get label() {
    return this._label || '';
  }
  set label(value) {
    this._label = transform.string(value);
    transform.reflect(this, 'label', this._label);
  
    this.setAttribute('aria-label', this._label);
  }
  
  get items() {
    // just init on demand
    if (!this._items) {
      this._items = new SelectableCollection({
        host: this,
        itemTagName: 'coral-selectlist-item'
      });
    }
    return this._items;
  }
  
  static get observedAttributes() {
    return ['label'];
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    this.classList.add(CLASSNAME);
    
    this.setAttribute('role', 'group');
  }
}

export default SelectListGroup;