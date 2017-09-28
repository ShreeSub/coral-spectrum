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
import ColumnViewCollection from './ColumnViewCollection';
import selectionMode from './selectionMode';
import {transform, validate} from 'coralui-util';

const CLASSNAME = 'coral3-ColumnView-column';

/**
 The number of milliseconds for which scroll events should be debounced.
 
 @type {Number}
 @ignore
 */
const SCROLL_DEBOUNCE = 100;

/**
 Height if every item to avoid using offsetHeight during calculations.
 
 @ignore
 */
const ITEM_HEIGHT = 48;

/**
 @class Coral.ColumnView.Column
 @classdesc A ColumnView Column component
 @htmltag coral-columnview-column
 @extends HTMLElement
 @extends Coral.mixin.component
 */
class ColumnViewColumn extends Component(HTMLElement) {
  constructor() {
    super();
    
    // Events
    this._delegateEvents({
      // we need to use capture as scroll events do not bubble
      'capture:scroll coral-columnview-column-content': '_onContentScroll',
      'click coral-columnview-column-content': '_onColumnContentClick',
  
      // item interaction
      'click coral-columnview-item': '_onItemClick',
      'click coral-columnview-item-thumbnail': '_onItemThumbnailClick',
  
      // item events
      'coral-columnview-item:_activechanged coral-columnview-item': '_onItemActiveChange',
      'coral-columnview-item:_selectedchanged coral-columnview-item': '_onItemSelectedChange'
    });
    
    // Content zone
    this._elements = {
      content: this.querySelector('coral-columnview-column-content') || document.createElement('coral-columnview-column-content')
    };
  
    // default values
    this._bulkSelectionChange = false;
    this._oldSelection = [];
    this._oldActiveItem = null;
  
    // cache bound event handler functions
    this._onDebouncedScroll = this._onDebouncedScroll.bind(this);
  
    this._observer = new MutationObserver(this._handleMutation.bind(this));
    // items outside the scroll area are not supported
    this._observer.observe(this._elements.content, {
      // only watch the childList, items will tell us if selected/value/content changes
      childList: true
    });
  
    // Init the collection mutation observer
    this.items._startHandlingItems(true);
  }
  
  /**
   The current active item.
   
   @type {HTMLElement}
   @readonly
   @default null
   @memberof Coral.ColumnView.Column#
   */
  get activeItem() {
    return this.items._getAllActive()[0] || null;
  }
  
  /**
   The content of the column. This container is where the items should be added and is responsible for handling the
   scrolling.
   
   @type {HTMLElement}
   @contentzone
   @memberof Coral.ColumnView.Column#
   */
  get content() {
    return this._getContentZone(this._elements.content);
  }
  set content(value) {
    this._setContentZone('content', value, {
      handle: 'content',
      tagName: 'coral-columnview-column-content',
      insert: function(content) {
        this.appendChild(content);
      }
    });
  }
  
  /**
   The Collection Interface that allows interacting with the items that the component contains. See
   {@link Coral.Collection} for more details.
   
   @type {Coral.Collection}
   @readonly
   @memberof Coral.ColumnView.Column#
   */
  get items() {
    // we do lazy initialization of the collection
    if (!this._items) {
      this._items = new ColumnViewCollection({
        host: this,
        target: this.content,
        itemTagName: 'coral-columnview-item'
      });
    }
  
    return this._items;
  }
  
  /**
   Returns the first selected item in the ColumnView. The value <code>null</code> is returned if no element is
   selected.
   
   @type {?HTMLElement}
   @readonly
   @memberof Coral.ColumnView.Column#
   */
  get selectedItem() {
    return this._selectionMode !== selectionMode.NONE ? this.items._getFirstSelected() : null;
  }
  
  /**
   Returns an Array containing the set selected items inside this Column.
   
   @type {Array.<HTMLElement>}
   @readonly
   @memberof Coral.ColumnView.Column#
   */
  get selectedItems() {
    return this._selectionMode !== selectionMode.NONE ? this.items._getAllSelected() : [];
  }
  
  /**
   Private property that indicates the selection mode. If the <code>Coral.ColumnView.Column</code> is not inside
   a <code>Coral.ColumnView</code> this value will be <code>undefined</code>.
   
   @type {Coral.ColumnView.selectionMode}
   @memberof Coral.ColumnView.Column#
   @htmlattribute selectionmode
   @htmlattributereflected
   @private
   */
  get _selectionMode() {
    return this.__selectionMode;
  }
  set _selectionMode(value) {
    value  = transform.string(value).toLowerCase();
    this.__selectionMode = validate.enumeration(selectionMode)(value) && value || null;
    this._reflectAttribute('selectionmode', this.__selectionMode);
  
    this._setStateFromDOM();
  }
  
  /** @private */
  _onItemClick(event) {
    // since transform will kill the modification, we trigger the event manually
    if (event.matchedTarget.hasAttribute('active')) {
      // directly calls the event since setting the attribute will not trigger an event
      this._onItemActiveChange(event);
    }
    else {
      // sets the item as active. while handling mouse interaction, items are not toggled
      event.matchedTarget.active = true;
    }
  }
  
  /** @private */
  _onItemThumbnailClick(event) {
    if (this._selectionMode && this._selectionMode !== selectionMode.NONE) {
      // stops propagation so that active is not called as well
      event.stopPropagation();
      
      const item = event.matchedTarget.parentElement;
      
      // toggles the selection of the item
      const isSelected = item.hasAttribute('selected');
      item[isSelected ? 'removeAttribute' : 'setAttribute']('selected', '');
    }
  }
  
  /**
   Handles the item activation, this causes the current item to get active and sets the next column to the item's
   src.
   
   @private
   */
  _onItemActiveChange(event) {
    // we stop propagation since it is a private event
    event.stopImmediatePropagation();
    
    // ignores event handling due to bulk select operation
    if (this._bulkSelectionChange) {
      return;
    }
    
    const item = event.matchedTarget;
    
    this._bulkSelectionChange = true;
    // clears the selection and keeps the item active. this force only 1 item to be active per column
    this.items._deselectAndDeactivateAllExcept(item);
    this._bulkSelectionChange = false;
    
    // we check if the selection requires an event to be triggered
    this._validateColumnChange(item);
    
    // loads data using the item as the activator and 0 as the start since it is a new column
    this._loadItems(0, item);
  }
  
  /**
   Handles selecting multiple items in the same column. Selection could result in none, a single or multiple selected
   items.
   
   @private
   */
  _onItemSelectedChange(event) {
    // we stop propagation since it is a private event
    event.stopImmediatePropagation();
    
    // item that was selected
    const item = event.target;
    
    // ignores event handling due to bulk select operation
    if (this._bulkSelectionChange) {
      return;
    }
    
    // when the item is selected, we need to enforce the selection mode
    if (item.selected) {
      this._bulkSelectionChange = true;
      // when there is selection, no item can be active
      this.items._deactivateAll();
      
      // enforces the selection mode
      if (this._selectionMode === selectionMode.SINGLE) {
        this.items._deselectAllExcept(item);
      }
      this._bulkSelectionChange = false;
    }
    
    // we make sure the change event is triggered before the load event.
    this._validateColumnChange();
  }
  
  /** @ignore */
  _tryToLoadAdditionalItems() {
    // makes sure that not too many events are triggered (only one per frame)
    if (this._bulkCollectionChange) {
      return;
    }
    
    this._bulkCollectionChange = true;
    
    const self = this;
    // we use setTimeout instead of nextFrame because macrotasks allow for more flexibility since they are less
    // aggressive in executing the code
    window.setTimeout(function() {
      // trigger 'coral-columnview:loaditems' asynchronously in order to be sure the application is done
      // adding/removing elements. Also make sure that only one event is triggered at once
      
      // bulkCollectionChange has to be reset before loading new items
      self._bulkCollectionChange = false;
      self._loadFittingAdditionalItems();
    }, 0);
  }
  
  /** @private */
  _onContentScroll(event) {
    window.clearTimeout(this._scrollTimeout);
    this._scrollTimeout = window.setTimeout(this._onDebouncedScroll, SCROLL_DEBOUNCE);
  }
  
  /**
   Handles the column click. When the column body is clicked, we need to deselect everything up to that column.
   
   @private
   */
  _onColumnContentClick(event) {
    // we make sure the content was clicked directly and not an item
    if (event.target !== event.matchedTarget) {
      return;
    }
    
    event.preventDefault();
    
    // ignores event handling due to bulk select operation
    if (this._bulkSelectionChange) {
      return false;
    }
    
    this._bulkSelectionChange = true;
    // clears the current column
    this.items._deselectAndDeactivateAllExcept();
    this._bulkSelectionChange = false;
    
    // we check if the selection requires an event to be triggered
    this._validateColumnChange();
  }
  
  /** @private */
  _onDebouncedScroll() {
    const threshold = 20;
    if (this.content.scrollTop + this.offsetHeight >= this.content.scrollHeight - threshold) {
      this._loadItems(this.items.length, undefined);
    }
  }
  
  /** @private */
  _arraysAreDifferent(selection, oldSelection) {
    let diff = [];
    
    if (!oldSelection) {
      debugger;
    }
    if (oldSelection.length === selection.length) {
      diff = oldSelection.filter(function(item) {
        return selection.indexOf(item) === -1;
      });
    }
    
    // since we guarantee that they are arrays, we can start by comparing their size
    return oldSelection.length !== selection.length || diff.length !== 0;
  }
  
  /** @private */
  _validateColumnChange(item) {
    const newActiveItem = this.activeItem;
    const oldActiveItem = this._oldActiveItem || null;
    
    // we have to force the event in case the same active item was clicked again, but still try to avoid triggering as
    // less events as possible
    if (newActiveItem !== oldActiveItem || item === newActiveItem) {
      this.trigger('coral-columnview-column:_activeitemchanged', {
        activeItem: newActiveItem,
        oldActiveItem: oldActiveItem
      });
      
      // we cache the active item for the next time
      this._oldActiveItem = newActiveItem;
    }
    
    const newSelection = this.selectedItems;
    const oldSelection = this._oldSelection;
    
    if (this._arraysAreDifferent(newSelection, oldSelection)) {
      this.trigger('coral-columnview-column:_selecteditemchanged', {
        selection: newSelection,
        oldSelection: oldSelection
      });
      
      // changes the old selection array since we selected something new
      this._oldSelection = newSelection;
    }
  }
  
  /**
   Loads additional Items if the current items of the column to not exceed its height and a path this.next is given.
   
   @private
   */
  _loadFittingAdditionalItems() {
    const itemsCount = this.items.length;
    // this value must match $columnview-item-height
    const itemsHeight = itemsCount * ITEM_HEIGHT;
    
    // we request more items if there is still space for them. in case the values are the same, we request more data
    // just to be sure, specially when the value is 0
    if (itemsHeight <= this.offsetHeight) {
      this._loadItems(itemsCount, undefined);
    }
  }
  
  /**
   Loads additional items. If the given item is not <code>active</code>, no data will be requested.
   
   @param {Number} count
   Amount of items in the column.
   @param {?HTMLElement} item
   Item that triggered the load.
   
   @private
   */
  _loadItems(count, item) {
    // if the given item is not active, it should not request data
    if (!item || item.hasAttribute('active')) {
      this.trigger('coral-columnview-column:_loaditems', {
        start: count,
        item: item
      });
    }
  }
  
  /**
   Updates the active and selected options from the DOM.
   
   @ignore
   */
  _setStateFromDOM() {
    // if the selection mode has not been set, we do no try to force selection
    if (this._selectionMode) {
      // single: only the last item is selected
      if (this._selectionMode === selectionMode.SINGLE) {
        this.items._deselectAllExceptLast();
      }
      // none: deselects everything
      else if (this._selectionMode === selectionMode.NONE) {
        this.items._deselectAllExcept();
      }
      
      // makes sure only one item is active
      this.items._deactivateAllExceptFirst();
    }
  }
  
  /** @private */
  _handleMutation(mutations) {
    const mutationsCount = mutations.length;
    for (let i = 0; i < mutationsCount; i++) {
      const mutation = mutations[i];
      // we handle the collection events
      this._triggerCollectionEvents(mutation.addedNodes, mutation.removedNodes);
    }
    
    this._setStateFromDOM();
    
    // in case items were added removed and selection changed
    this._validateColumnChange();
    
    // checks if more items can be added after the childlist change
    this._tryToLoadAdditionalItems();
  }
  
  /** @private */
  _triggerCollectionEvents(addedNodes, removedNodes) {
    let item;
    const addedNodesCount = addedNodes.length;
    for (let i = 0; i < addedNodesCount; i++) {
      item = addedNodes[i];
      if (item.tagName === 'CORAL-COLUMNVIEW-ITEM') {
        this.trigger('coral-collection:add', {
          item: item
        });
      }
    }
    
    const removedNodesCount = removedNodes.length;
    for (let j = 0; j < removedNodesCount; j++) {
      item = removedNodes[j];
      if (item.tagName === 'CORAL-COLUMNVIEW-ITEM') {
        this.trigger('coral-collection:remove', {
          item: item
        });
      }
    }
  }
  
  // For backwards compatibility + Torq
  get defaultContentZone() {return this.content;}
  set defaultContentZone(value) {this.content = value;}
  get _contentZones() {return {'coral-columnview-column-content': 'content'};}
  
  static get observedAttributes() {
    return [
      '_selectionmode',
      '_selectionMode'
    ];
  }
  
  connectedCallback() {
    super.connectedCallback();
    
    this.classList.add(CLASSNAME);
  
    // @a11y
    this.setAttribute('role', 'group');
  
    // @todo: initial collection items needs to be triggered
  
    const content = this._elements.content;
    
    // when the content zone was not created, we need to make sure that everything is added inside it as a content.
    // this stops the content zone from being voracious
    if (!content.parentNode) {
      // move the contents of the item into the content zone
      while (this.firstChild) {
        content.appendChild(this.firstChild);
      }
    }
    
    // Call content zone insert
    this.content = content;
  
    // handles the initial selection
    this._setStateFromDOM();
  
    // we keep a list of the last selection to determine if something changed. we need to do this after
    // validateSelection since it modifies the initial state based on the option
    this._oldSelection = this.selectedItems;
    this._oldActiveItem = this.activeItem;
    
    // instead of being super aggressive on requesting data, we use setTimeout so it is scheduled after all the code
    // has been executed (macrotask), this way events can be added before
    window.setTimeout(function() {
      this._loadFittingAdditionalItems();
    }.bind(this));
  }
}

export default ColumnViewColumn;
