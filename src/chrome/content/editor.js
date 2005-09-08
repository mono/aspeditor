 /*
 * aspdesigner.js - The asp editor object
 * 
 * Authors: 
 *  Blagovest Dachev <blago@dachev.com>
 *  
 * Copyright (C) 2005 Blagovest Dachev
 *
 * This sourcecode is licenced under The MIT License:
 * 
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including
 * without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit
 * persons to whom the Software is furnished to do so, subject to the
 * following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 * OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
 * NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
 * OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

var editor                 = null;
var host                   = null;
var gCancelClick           = false;
var gDirectivePlaceholder  = '';

const DEBUG                            = true;
const ID                               = 'id';
const WIDTH                            = 'width';
const HEIGHT                           = 'height';
const MIN_WIDTH                        = 'min-width';
const MIN_HEIGHT                       = 'min-height';
const DISPLAY                          = 'display';
const BORDER                           = 'border';
const VERTICAL_ALIGN                   = 'vertical-align';
const POSITION                         = 'position';
const Z_INDEX                          = 'z-index';
const BORDER_CAN_DROP_COLOR            = '#ee0000';
const BORDER_CAN_DROP_THICK            = '2';
const BORDER_CAN_DROP_INVERT           = false;
const DIRECTIVE_PLACE_HOLDER_EXP       = /(<directiveplaceholder.[^(><.)]+\/>)/g;
const SCRIPT_PLACE_HOLDER_EXP          = /(<scriptblockplaceholder.[^(><.)]+\/>)/g;
const STRIP_SCRIPT_PLACE_HOLDER_EXP    = /<!(?:--(<scriptblockplaceholder[\s\S]*?)--\s*)?>\s*/g;
const CONTROL_TAG_NAME                 = 'aspcontrol';
const BEGIN_CONTROL_TAG_EXP            = /(<aspcontrol.[^(><.)]+>)/g;
const END_CONTROL_TAG_EXP              = /<\/aspcontrol>/g;
const STRIP_CONTROL_EXP                = /(<span class="ballast".*?><span.*?><div>.*?[\s\S]*?.*?<\/div><\/span><\/span>)/g;
const APPEND_TO_CONTROL_END            = '</div></span></span>';
const APPEND_TO_CONTROL_BEGIN          = "<span class=\"ballast\" style=\"display: block; position: relative\"><span style=\"position: absolute; display: block; z-index: -1;\"><div>";
const EMPTY_CONTROL_MSG                = '<span style=\"color: #bb0000;\">This control has no HTML<br>representation associated.</span>';
const SINGLE_CLICK                     = 'single';
const DOUBLE_CLICK                     = 'double';
const RIGHT_CLICK                      = 'right';
const OBJECT_RESIZER                   = Components.interfaces.nsIHTMLObjectResizer;
const INLINE_TABLE_EDITOR              = Components.interfaces.nsIHTMLInlineTableEditor;
const TABLE_EDITOR                     = Components.interfaces.nsITableEditor;
const EDITOR                           = Components.interfaces.nsIEditor;
const SELECTION_PRIVATE                = Components.interfaces.nsISelectionPrivate;
const STYLE_SHEETS                     = Components.interfaces.nsIEditorStyleSheets;
const EDITOR_CONTENT_STYLE             = 'chrome://aspdesigner/content/editorContent.css';
const OBJECT                           = 'object';
const CUT                              = 'cmd_cut';
const COPY                             = 'cmd_copy';
const PASTE                            = 'cmd_paste';
const UNDO                             = 'cmd_undo';
const REDO                             = 'cmd_redo';


//* ___________________________________________________________________________
// Implementations of some XPCOM interfaces, to observe various editor events
// and actions. Do not remove any of the methods entirely or Mozilla will choke
//_____________________________________________________________________________

// nsISelectionListener implementation
// TODO: Redo this one, accounting for recursive calls
var gNsISelectionListenerImplementation = {
	notifySelectionChanged: function(doc, sel, reason)
	{
		// Make sure we can't focus a control
		//TODO: make it account for md-can-drop="true" controls, which
		// should be able to recieve focus
		if(sel.isCollapsed) {
			var focusNode = sel.focusNode;
			var parentControl =
				editor.base.getElementOrParentByTagName (CONTROL_TAG_NAME,
							focusNode);
			if(parentControl) {
				editor.base.setCaretAfterElement (parentControl);
			}
		}
	}
}

// nsIEditActionListener implementation
var gNsIEditActionListenerImplementation = {
	DidCreateNode: function(tag, node, parent, position, result)
	{
		//alert('did create node');
	},

	// TODO: Check if deleted node contains a control, not only if it is one
	DidDeleteNode: function(child, result)
	{
		if(!editor.inResize && !editor.dragState &&
		   !editor.inUpdate && !editor.inCommandExec) {
			var control = editor.removeLastDeletedControl ();
			if(control) {
				var deletionStr = 'deleteControl(s):';
				deletionStr += ' id=' + control + ',';
				editor.removeFromControlTable (control);
				host.removeControl (control);
				dump (deletionStr +
					' Message source: DidDeleteNode()');
				dump ('There is/are '
					+ editor.controlCount()
					+ ' controls left in the page');
			}
		}
	},

	// For each element in to-be-deleted array, remove control from the control
	// table, let the host know we have deleted a control by calling the
	// respective method, and remove from to-be-deleted array.
	DidDeleteSelection: function(selection)
	{
		if(!editor.inResize && !editor.dragState &&
		   !editor.inUpdate && !editor.inCommandExec) {
			var control = editor.removeLastDeletedControl ();
			if(control) {
				var deletionStr = 'Did delete control(s):';
				while(control) {
					deletionStr += ' id=' + control + ',';
					editor.removeFromControlTable (control);
					host.removeControl (control);
					control = editor.removeLastDeletedControl ();
				}
				dump (deletionStr +
					' Message source: DidDeleteSelection()');
				dump ('There is/are ' +
					editor.controlCount() +
					' controls left in the page');
			}
		}
	},

	DidDeleteText: function(textNode, offset, length, result)
	{
	
	},

	// Make sure to check node contents for controls too. The node could be
	// a table (or any other element) with a control inside.
	DidInsertNode: function(node, parent, position, result)
	{
		var dumpStr = 'Did insert node ' + node.nodeName;
		dumpStr += (node.nodeType == 1) ?
			', id=' + node.getAttribute(ID) :
			'';
		dump (dumpStr);

		// Check to see if we have inserted a new controls. We need to
		// add'em to the control table. Also update reference to all
		// existing controls
		var controls =
			editor.base.document.getElementsByTagName (CONTROL_TAG_NAME);
		if(controls.length > 0) {
			var i = 0;
			var width, height;
			while(controls [i]) {
				if(editor.getControlTable ().getById (controls [i].getAttribute (ID))) {
					editor.getControlTable ().update (controls [i].getAttribute (ID),
									controls [i]);
					dump ('Did update control(id=' +
						controls [i].getAttribute (ID) +
						') reference in table');
				}
				else {
					editor.insertInControlTable (controls [i].getAttribute (ID),
							controls [i]);
					dump ('New control (id=' +
						controls [i].getAttribute (ID) +
						') inserted');
					dump ('There is/are ' +
						editor.controlCount() +
						' controls in the page');
 				}
				editor.setSelectNone (controls [i]);
				width = controls [i].getAttribute(WIDTH);
				height = controls [i].getAttribute(HEIGHT);
				controls [i].style.setProperty (MIN_WIDTH,
							width, '');
				controls [i].style.setProperty (MIN_HEIGHT,
							height, '');
				controls [i].style.setProperty (DISPLAY,
							'-moz-inline-box', '');
				controls [i].style.setProperty (BORDER,
							'1px solid #ff0000', '');
				controls [i].style.setProperty (VERTICAL_ALIGN,
							'text-bottom', '');
				controls [i].style.setProperty (POSITION,
							'relative', '');
				controls [i].style.setProperty (Z_INDEX,
							'1', '');
				i++;
			}
		}

		if(editor.dragState) {
			dump ('End drag');
		}

		if(editor.nodeIsControl (node) &&
		   (node.nodeType == 1 || node.nodeType == 3)) {
			//editor.selectControl (node.getAttribute (ID));
		}
		if(editor.dragState)
			editor.dragState = false;
	},

	DidInsertText: function(textNode, offset, string, result)
	{
	
	},

	DidJoinNodes: function(leftNode, rightNode, parent, result)
	{
		//alert('did join nodes');
	},

	DidSplitNode: function(existingRightNode, offset, newLeftNode, result)
	{
		//alert('did split node');
	},

	WillCreateNode: function(tag, parent, position)
	{
		//alert ('Will create node');
	},

	WillDeleteNode: function(child)
	{
		dump ('will delete node-----------------------');
		if(!editor.inResize && !editor.dragState &&
		   !editor.inUpdate && !editor.inCommandExec) {
			var deletionStr = 'Will delete control(s):';
			var i       = 0;

			// is the node itself control?
			if(editor.nodeIsControl (child)) {
					deletionStr += ' id=' +
						child.getAttribute (ID) + ',';
					editor.addLastDeletedControl (child.getAttribute (ID));
			}

			// does the node contain any controls?
			var control = editor.getControlFromTableByIndex (i);
			while(control) {
				if(editor.isControlChildOf (child, control)) {
					deletionStr += ' id=' +
						control.getAttribute (ID) + ',';
					editor.addLastDeletedControl (control.getAttribute (ID));
				}
				i++;
				control = editor.getControlFromTableByIndex (i);
			}
			if(deletionStr != 'Will delete control(s):')
				dump (deletionStr +
					' Message source: WillDeleteNode()');
		}
	},

	// Check if the selection to be deleted contains controls and prepare
	//for deletion. Load all to-be-deleted controls in an array, so we can
	// access them after actual deletion in order to notify the host.
	WillDeleteSelection: function(selection)
	{
		dump ('will delete selection-----------------------');
		if(!editor.inResize && !editor.dragState &&
		   !editor.inUpdate && !editor.inCommandExec) {
			var i       = 0;
			var control = editor.getControlFromTableByIndex (i);
			var deletionStr = 'Will delete control(s):';
			if(control) {
				while(control) {
					if(selection.containsNode (control, true)) {
						deletionStr += ' id=' +
							control.getAttribute (ID) + ',';
						editor.addLastDeletedControl (control.getAttribute (ID));
					}
					i++;
					control = editor.getControlFromTableByIndex (i);
				}
				if(deletionStr != 'Will delete control(s):')
					dump (deletionStr +
						' Message source: WillDeleteSelection()');
			}
		}
	},

	WillDeleteText: function(textNode, offset, length)
	{
	
	},

	WillInsertNode: function(node, parent, position)
	{

	},

	WillInsertText: function(textNode, offset, string)
	{
	
	},

	WillJoinNodes: function(leftNode, rightNode, parent)
	{
		//alert ('Will join node');
	},

	WillSplitNode: function(existingRightNode, offset)
	{
		//alert ('Will split node');
	},
}

// nsIHTMLObjectResizeListener implementation
var gNsIHTMLObjectResizeListenerImplementation = {
	onEndResizing: function(element, oldWidth, oldHeight, newWidth, newHeight)
	{
		if(editor.nodeIsControl (element)) {
			var id = element.getAttribute (ID);
			host.resizeControl (id, newWidth, newHeight);
		}
		editor.inResize = false;
		dump ('End resize.');
	},

	onStartResizing: function(element)
	{
		if(editor.nodeIsControl (element)) {
			editor.beginBatch ();
		}
		editor.inResize = true;
		dump ('Begin resize.');
	}
}

// nsIContentFilter implementation
// In future we should use this one to manage all insertion coming from
// paste, drag&drop, insertHTML(), and page load. Currently not working.
// Mozilla throws an INVALID_POINTER exception
var gNsIContentFilterImplementation = {
	notifyOfInsertion: function(mimeType,
				    contentSourceURL,
				    sourceDocument,
				    willDeleteSelection,
				    docFragment,
				    contentStartNode,
				    contentStartOffset,
				    contentEndNode,
				    contentEndOffset,
				    insertionPointNode,
				    insertionPointOffset,
				    continueWithInsertion)
	{
		
	}
}

//* ___________________________________________________________________________
// This class is responsible for communication with the host system and
// implements part of the AspNetDesigner interface
//_____________________________________________________________________________

function aspNetHost()
{

}
aspNetHost.prototype =
{
	initialize: function()
	{
		// Register our interface methods with the host
		JSCallInit ();

		//  Loading/Saving/ControlState
		JSCallRegisterClrHandler ('LoadPage', JSCall_LoadPage);
		JSCallRegisterClrHandler ('GetPage', JSCall_GetPage);
		JSCallRegisterClrHandler ('AddControl', JSCall_AddControl);
		JSCallRegisterClrHandler ('RemoveControl', JSCall_RemoveControl);
		JSCallRegisterClrHandler ('UpdateControl', JSCall_UpdateControl);
		JSCallRegisterClrHandler ('RenameControl', JSCall_RenameControl);
		// Control selection
		JSCallRegisterClrHandler ('SelectControl', JSCall_SelectControl);
		// HTML editing
		JSCallRegisterClrHandler ('DoCommand', JSCall_DoCommand);
		JSCallRegisterClrHandler ('InsertFragment', JSCall_InsertFragment);

		//tell the host we're ready for business
		JSCallPlaceClrCall ('Activate', '', '');
	},

	click: function(aType, aControlId)
	{
		var clickType;

		if(aType == SINGLE_CLICK) {
			clickType = 'Single';
		}
		else if(aType == DOUBLE_CLICK) {
			clickType = 'Double';
		}
		else if(aType == RIGHT_CLICK) {
			clickType = 'Right';
		}
		
 		if(!aControlId) {
			dump (clickType + ' click over no control; deselecting all controls');
		}
		else {
			dump (clickType + " click over aspcontrol \"" + aControlId + "\"");
		}
		
		JSCallPlaceClrCall ('Click', '', new Array(clickType, aControlId));
		dump ('Outbound call to Click() ' + aControlId);
	},

	resizeControl: function(aControlId, aWidth, aHeight)
	{
		JSCallPlaceClrCall ('ResizeControl', '', new Array(aControlId, aWidth, aHeight));
		dump ('Outbound call to ResizeControl() id=' + aControlId +
			', new size ' + aWidth + 'x' + aHeight);
	},
	
	throwException: function (location, msg)
	{
		JSCallPlaceClrCall ('ThrowException', '', new Array(location, msg));
	},
	
	removeControl: function (aControlId)
	{
		JSCallPlaceClrCall ('RemoveControl', '', new Array(aControlId));
		dump ('Outbound call to removeControl() id=' + aControlId);
	},
}


/* Directly hooking up the editor's methods as JSCall handler functions
 * means that their access to 'this' is broken so we use these
 * surrogate functions instead
 */

function JSCall_SelectControl (arg) {
	aControlId = arg [0];
	aAdd = true;
	aPrimary = true;
	return editor.selectControl (aControlId, aAdd, aPrimary);
}

function JSCall_UpdateControl (arg) {
	aControlId = arg [0];
	aNewDesignTimeHtml = arg [1];
	return editor.updateControl (aControlId, aNewDesignTimeHtml);
}

function JSCall_RemoveControl (arg) {
	return editor.removeControl (arg [0]);
}

function JSCall_RenameControl (arg) {
	return editor.renameControl (arg [0], arg [1]);
}

function JSCall_AddControl (arg) {
	aControlId = arg [0];
	aControlHtml = arg [1];
	return editor.addControl (aControlHtml, aControlId);
}

function JSCall_GetPage () {
	return editor.getPage ();
}

function JSCall_LoadPage (arg) {
	return editor.loadPage (arg [0]);
}

function JSCall_DoCommand (arg) {
	var command = arg [0];
	dump ('Executing command "' + command +'"...');
	editor.doCommand (command);
	return "";
}

function JSCall_InsertFragment (arg) {
	return editor.insertFragment (arg [0]);
}

//* ___________________________________________________________________________
// A rather strange data structure to store current controls in the page.
// Insertion is O(1), removal is O(n), memory usage is O(2n), but query by
// index and id are both O(1). We have to keep track of controls on the
// Mozilla side, so it's easier to handle special cases like undo() that
// restores a deleted control
// TODO: store deleted controls' html (maybe more) in a deleted controls array.
// This will help reinstating controls on the host side.
// TODO: keep a counter of the undo redo operation that involve control
// deletion and insertion and peg it to the editor's counter
// !!! Do we really need it?
//_____________________________________________________________________________
var controlTable = {
	hash                      : new Array (),
	array                     : new Array (),
	length                    : 0,

	add: function(aControlId, aControlRef)
	{
		if(this.hash [aControlId]) {
			dump ('Panic: atempt to add an already existing control with id=' +
				aControlId +
				'. Remove first.');
		}
		else {
			this.hash [aControlId] = aControlRef;
			this.array.push (aControlRef);
			this.length++;
		}
	},

	remove: function(aControlId)
	{
		if(this.hash [aControlId]) {
			var i = 0;
			while(this.array [i] != this.hash[aControlId]) {
				i++;
			}
			this.array.splice (i, 1);
			this.hash [aControlId] = null;
			this.length--;
		}
		else {
			dump ('Panic: atempt to remove control with unexisting id=' +
				aControlId);
		}
	},

	update: function(aControlId, aControlRef)
	{
		this.remove (aControlId);
		this.add (aControlId, aControlRef);
	},
 
	getById: function(aControlId)
	{
		return this.hash [aControlId];
	},

	getByIndex: function(aIndex)
	{
		return this.array [aIndex];
	},

	getCount: function()
	{
		return this.length;
	}
}

//* ___________________________________________________________________________
// The editor class and initialization
//_____________________________________________________________________________
function aspNetEditor_initialize()
{
	dump ("Initialising...");
	dump ("\tCreating host...");
	editor = new aspNetEditor ();
	dump ("\tCreated editor, initialising...");
	editor.initialize ();
	dump ("\tEditor initialised, creating host...");
	host = new aspNetHost ();
	dump ("\tHost created, initialising...");
	host.initialize ();
	dump ("Initialised.");
}

function aspNetEditor()
{

}

aspNetEditor.prototype = 
{
	mNsIHtmlEditor            : null,
	mNsIEditor                : null,
	mNsIHtmlObjectResizer     : null,
	mNsIHTMLInlineTableEditor : null,
	mNsIEditorStyleSheets     : null,
	mNsICommandManager        : null,

	mEditorWindow             : null,
	mDropInElement            : null,
	mControlTable             : null,
	mLastDeletedControls      : null,
	mLastSelectedControls     : null,
	mInResize                 : false,
	mInCommandExec            : false,
	mInUpdate                 : false,
	mInDrag                   : false,

	initialize: function()
	{
		var editorElement = document.getElementById ('aspeditor');
		editorElement.makeEditable ('html', false);

		this.mEditorWindow = editorElement.contentWindow;
		this.mNsIHtmlEditor =
			editorElement.getHTMLEditor(this.mEditorWindow);
		this.mNsICommandManager =
			editorElement.commandManager;
		this.mNsIEditor =
			this.mNsIHtmlEditor.QueryInterface(EDITOR);
		this.mNsIHTMLInlineTableEditor =
			this.mNsIHtmlEditor.QueryInterface(INLINE_TABLE_EDITOR);
		this.mNsIHtmlObjectResizer =
			this.mNsIHtmlEditor.QueryInterface(OBJECT_RESIZER);

		var selectionPrivate =
			this.base.selection.QueryInterface (SELECTION_PRIVATE);
		selectionPrivate.addSelectionListener (gNsISelectionListenerImplementation);
		this.mNsIHtmlEditor.addObjectResizeEventListener (gNsIHTMLObjectResizeListenerImplementation);
		this.mNsIHtmlEditor.addEditActionListener (gNsIEditActionListenerImplementation);
		// ?????????????????????????????????????????????????????????????????????????
		// Bug in Mozilla's InsertHTMLWithContext?
		//this.mNsIHtmlEditor.addInsertionListener (gNsIContentFilterImplementation);

		// All of our event listeners are added to the document here
		this.base.document.addEventListener ('mousedown',
						selectFromClick,
						true);
		this.base.document.addEventListener ('mouseup',
						suppressMouseUp,
						true);
		this.base.document.addEventListener ('click',
						detectSingleClick,
						true);
		this.base.document.addEventListener ('dblclick',
						detectDoubleClick,
						true);
		this.base.document.addEventListener ('contextmenu',
						handleContextMenu,
						true);
		this.base.document.addEventListener ('draggesture',
						handleDragStart,
						true);
		this.base.document.addEventListener ('dragdrop',
						handleDrop,
						true);
		this.base.document.addEventListener ('keypress',
						handleKeyPress,
						true);

		this.mLastDeletedControls  = new Array();
		this.mLastSelectedControls = new Array();
		this.mControlTable         = controlTable;
	},

	get inResize()           { return this.mInResize },
	set inResize(aBool)      { this.mInResize = aBool },

	get inUpdate()           { return this.mInUpdate },
	set inUpdate(aBool)      { this.mInUpdate = aBool },

	get dragState()          { return this.mInDrag; },
	set dragState(aBool)     { this.mInDrag = aBool },

	get inCommandExec()      { return this.mInCommandExec },
	set inCommandExec(aBool) { this.mInCommandExec = aBool },

	get base()               { return this.mNsIHtmlEditor },
	get controlCount()       { return this.mControlTable.getCount () },

	beginBatch: function()
	{
		//this.mNsIHtmlEditor.transactionManager.beginBatch ();
	},

	endBatch: function()
	{
		//this.mNsIHtmlEditor.transactionManager.endBatch ();
	},

	removeFromControlTable: function(aControlId)
	{
		this.mControlTable.remove (aControlId);
	},

	insertInControlTable: function(aControlId, aControlRef)
	{
		this.mControlTable.add (aControlId, aControlRef);
	},

	getControlFromTableById: function(aControlId)
	{
		return this.mControlTable.getById (aControlId);
	},

	getControlFromTableByIndex: function(aIndex)
	{
		return this.mControlTable.getByIndex (aIndex);
	},
  
	updateControlInTable: function(aControlId, aControlref)
	{
		this.mControlTable.update (aControlId, aControlref);
	},

	getControlTable: function()
	{
		return this.mControlTable;
	},

	addLastDeletedControl: function(aControl)
	{
		this.mLastDeletedControls.push (aControl);
	},

	removeLastDeletedControl: function()
	{
		return this.mLastDeletedControls.pop ();
	},

	nextSiblingIsControl: function()
	{
		var next        = null;
		var focusNode   = this.base.selection.focusNode;
		var focusOffset = this.base.selection.focusOffset;
		// Are we at the end offset of a text node?
		if(this.atEndOfTextNode ()) {
			next = focusNode.nextSibling;
			if(next && this.nodeIsControl (next))
				return next;
		}
		// If not at the end offset of a text node, focus offset is our
		// current element; use it to get next
		else {
			next = focusNode.childNodes [focusOffset];
			if(next && this.nodeIsControl (next))
				return next;
		}
		return false;
	},

	previousSiblingIsControl: function()
	{
		var prev        = null;
		var focusNode   = this.base.selection.focusNode;
		var focusOffset = this.base.selection.focusOffset;
		// Are we at the beginning offset of a text node?
		if(this.atBeginningOfTextNode ()) {
			prev = focusNode.previousSibling;
			if(prev && this.nodeIsControl (prev))
				return prev;
		}
		// If not at the beginning offset of a text node, focus offset
		// minus 1 is our current element; use it to get next
		else {
			prev = focusNode.childNodes [focusOffset - 1];
			if(prev && this.nodeIsControl (prev))
				return prev;
		}
		return false;
	},

	atBeginningOfTextNode: function()
	{
		if(this.base.selection.focusNode) {
			var focusNode =
				this.base.selection.focusNode;
			var focusOffset =
				this.base.selection.focusOffset;
			// If we are at offset zero of a text node
			if(focusNode.nodeType == 3 && focusOffset == 0) {
				return true;
			}
			return false;
		}
		return false;
	},

	atEndOfTextNode: function()
	{
		if(this.base.selection.focusNode) {
			var focusNode =
				this.base.selection.focusNode;
			var focusOffset
				= this.base.selection.focusOffset;
			// Are we in a text node?
			if (focusNode.nodeType == 3) {
				var focusNodeLength = focusNode.nodeValue.length;
				// If we are at the end offset of a text node
				if(focusNodeLength == focusOffset)
					return true;
				else
					return false;
			}
			return false;
		}
		return false;
	},

	nodeIsControl: function(aNode)
	{
		var name = aNode.nodeName;
		name = name.toLowerCase ();
		if(name == CONTROL_TAG_NAME)
			return true;
		return false;
	},

	collapseBeforeInsertion: function(aPoint)
	{
		switch(aPoint) {
		case "start":
			this.base.selection.collapseToStart ();
			break;
		case   "end":
			this.base.selection.collapseToEnd ();
			break;
		}
	},

	transformBeforeInput: function(aHTML, aPageload)
	{
		// Give controls a default value
		var emptyControl =
			aHTML.match(/(<aspcontrol.[^(><.)]+><\/aspcontrol>)/g);
		var controlBegin = "$&" + APPEND_TO_CONTROL_BEGIN;
		controlBegin = (emptyControl) ?
					controlBegin + EMPTY_CONTROL_MSG :
					controlBegin;

		// Add the aux control spans and divs
		var htmlOut = aHTML.replace (BEGIN_CONTROL_TAG_EXP, controlBegin);
		htmlOut = htmlOut.replace (END_CONTROL_TAG_EXP,
					APPEND_TO_CONTROL_END + "$&");

		// Put comments around any script placeholders that we may have
		// in the HTML
		if (aPageload)
			htmlOut = htmlOut.replace (SCRIPT_PLACE_HOLDER_EXP,
						 '<!--' + "$&" + '-->');

		// Save any directive placeholders that we may have in the HTML
		if (aPageload) {
			gDirectivePlaceholder =
				htmlOut.match (DIRECTIVE_PLACE_HOLDER_EXP);
			if (!gDirectivePlaceholder)
				return htmlOut;
			htmlOut =
				htmlOut.replace (DIRECTIVE_PLACE_HOLDER_EXP, '');
		}
		return (htmlOut);
	},

	transformBeforeOutput: function(aHTML, aPageSave)
	{
		//alert (aHTML);
		// Strip any aux spans and divs from the controls
		var htmlOut = aHTML.replace(STRIP_CONTROL_EXP, '');

		if (aPageSave) {
			// Add back any directive placeholders
			if(gDirectivePlaceholder) {
				htmlOut = gDirectivePlaceholder + htmlOut;
			}

			// Strip the comments from all script placeholders
	 		htmlOut = htmlOut.replace (STRIP_SCRIPT_PLACE_HOLDER_EXP,
						"$1");
		}

		//alert (htmlOut);
		return (htmlOut);
	},

	//  Loading/Saving/ControlState
	loadPage: function(aHtml)
	{
		if(aHtml) {
			try {
				var html = this.transformBeforeInput(aHtml, true);
				dump ("Loading page: " + html);
				this.mNsIHtmlEditor.rebuildDocumentFromSource (html);

				// Show caret
				if (this.base.document.forms.length > 0) {
					var firstForm =
						this.base.document.forms [0];
					this.base.selection.collapse (firstForm,
										0);
				}
				else {
					var rootElement =
						this.mNsIHtmlEditor.rootElement;
					this.base.selection.collapse (rootElement,
										0);
				}

				// Load editing stylesheet
				var baseEditor = this.base;
				baseEditor.QueryInterface(STYLE_SHEETS);
				baseEditor.addOverrideStyleSheet(EDITOR_CONTENT_STYLE);
			} catch (e) {host.throwException ('loadPage()', e);}
		}
	},

	getPage: function()
	{
		var htmlOut = this.serializePage ();
		htmlOut = this.transformBeforeOutput(htmlOut, true);
		dump (htmlOut);
		return htmlOut;
	},

	addControl: function(aControlHtml, aControlId)
	{
		if(aControlHtml && aControlId) {
			dump ('Will add control:' + aControlId);
			this.hideResizers ();
			var insertionPoint =
				{insertIn: null, destinationOffset: 0};
			this.findInsertionPoint (insertionPoint);
			var controlHTML =
				this.transformBeforeInput (aControlHtml, false);

			this.base.insertHTMLWithContext (controlHTML, '',
					'', 'text/html', null,
					insertionPoint.insertIn,
					insertionPoint.destinationOffset, false);

			var newControl =
				this.base.document.getElementById (aControlId);
			this.setSelectNone (newControl);
			this.selectControl (aControlId);
			dump ('Did add control:' + controlHTML);
		}
	},

	removeControl: function(aControlId)
	{
		var control =
			this.base.document.getElementById (aControlId);
		if(control) {
			dump ('Will remove control:' + aControlId);
			this.base.selectElement (control);
			this.base.deleteSelection (0);
			dump ('Did remove control:' + aControlId);
		}
	},

	updateControl: function(aControlId, aNewDesignTimeHtml)
	{
		if(aControlId && aNewDesignTimeHtml &&
		   this.base.document.getElementById (aControlId)) {
			this.inUpdate = true;
			dump ('Will update control:' + aControlId);
			this.hideResizers ();
			var newDesignTimeHtml =
				this.transformBeforeInput (aNewDesignTimeHtml, false);
			try {
				var oldControl =
					this.base.document.getElementById (aControlId);
				this.collapseBeforeInsertion ("start");
				this.base.selectElement (oldControl);
				this.base.insertHTML (newDesignTimeHtml);
				dump ('Updated control ' + aControlId +
					'; newDesignTimeHtml is ' +
					newDesignTimeHtml);
				} catch (e) { }
			this.inUpdate = false;
			this.endBatch ();
			this.updateControlInTable(aControlId,
			this.base.document.getElementById (aControlId));
			dump ('Did update control:' + aControlId);
		}
	},

	renameControl: function(aOldControlId, aNewControlId)
	{
		var control =
			this.base.document.getElementById (aOldControlId);
		if (!aOldControlId || !aNewControlId) {
			host.throwException ('renameControl () ',
					'Too few or no arguments');
			return;
		}
		else if (!control) {
			host.throwException ('renameControl () ',
					'Invalid control name');
			return;
		}
		else
			control.setAttribute (ID, aNewControlId);
	},

	// Control selection
	selectControl: function(aControlId, aAdd, aPrimary)
	{
		// TODO: talk to Michael about selecting controls. Why do we
		// need to have multiple controls selected and what is primary?
		if (aControlId == '') {
			if(this.base.resizedObject && this.nodeIsControl (this.base.resizedObject)){
				this.hideResizers ();
			}
			dump ("Deselecting all controls");
			return;
		}

		dump ("Selecting control " + aControlId);
		this.clearSelection ();
		var controlRef =
			this.base.document.getElementById (aControlId);
		this.base.selectElement (controlRef);
		this.showResizers (controlRef);
	},

	// TODO: Handle commands on controls independently
	doCommand: function (aCommand)
	{
		this.inCommandExec = true;
		if (this.mNsICommandManager.isCommandSupported (aCommand, this.mEditorWindow))
			this.mNsICommandManager.doCommand (aCommand, null,
							this.mEditorWindow);
		else
			host.throwException ('doCommand (' + aCommand + ')',
					'Command not supported');
		dump ("Executed command: " + aCommand);
		this.inCommandExec = false;
	},

	insertFragment: function (aHtml)
	{
		if(aHtml) {
			var insertionPoint =
				{insertIn: null, destinationOffset: 0};
			this.findInsertionPoint (insertionPoint);
			var HTML = this.transformBeforeInput (aHtml, false);

			this.base.insertHTMLWithContext (HTML, '', '',
				'text/html', null, insertionPoint.insertIn,
				insertionPoint.destinationOffset, false);
		}
	},

	getChildControls: function (aNode, aRetArray)
	{
		var i = 0;
		while(aNode.childNodes [i]) {
			if(this.nodeIsControl (aNode.childNodes [i]))
				aRetArray.arr.push (aNode.childNodes [i]);
			this.getChildControls (aNode.childNodes [i], aRetArray);
			i++;
		}
	},

	isControlChildOf: function (aNode, aControl)
	{
		var i = 0;
		var ret = false;
		while(aNode.childNodes [i]) {
			if(aNode.childNodes [i] == aControl) {
				ret = true;
				break;
			}
			else {
				ret = this.isControlChildOf (aNode.childNodes [i],
						aControl);
				if(ret)
					break;
			}
			i++;
		}
		return ret;
	},

	findInsertionPoint: function(aInsertionPoint)
	{
		aInsertionPoint.insertIn = null;
		aInsertionPoint.destinationOffset = 0;
		var selectedElement = this.base.getSelectedElement ('');
		var focusNode = this.base.selection.focusNode;
		var parentControl =
			this.base.getElementOrParentByTagName (CONTROL_TAG_NAME,
						focusNode);

		// If we have a single-element selection and the element
		// happens to be a control
		if (selectedElement &&
		    this.nodeIsControl (selectedElement)) {
			aInsertionPoint.insertIn = selectedElement.parentNode;
			while(selectedElement != aInsertionPoint.insertIn.childNodes [aInsertionPoint.destinationOffset])
				aInsertionPoint.destinationOffset++;
			aInsertionPoint.destinationOffset++;
		}

		else if(focusNode) {
			// If selection is somewhere inside a control
			if(parentControl){
				aInsertionPoint.insertIn = parentControl.parentNode;
				while(parentControl != aInsertionPoint.insertIn.childNodes [aInsertionPoint.destinationOffset])
					aInsertionPoint.destinationOffset++;
				aInsertionPoint.destinationOffset++;
			}
		}
	},

	clearSelection: function()
	{
		this.collapseBeforeInsertion ("end");
	},

	getSelectAll: function(aElement)
	{
		var style = aElement.style;
		if(style.getPropertyValue ('MozUserSelect') == 'all' ||
		   style.getPropertyValue ('-moz-user-select') == 'all')
			return true;
		return false;
	},

	getSelectNone: function(aElement)
	{
		var style = aElement.style;
		if(style.getPropertyValue ('MozUserSelect') == 'none' ||
		   style.getPropertyValue ('-moz-user-select') == 'none')
			return true;
		return false;
	},

	setSelectAll: function(aElement)
	{
		aElement.style.setProperty ('MozUserSelect', 'all', '');
		aElement.style.setProperty ('-moz-user-select', 'all', '');
	},

	setSelectNone: function(aElement)
	{
		aElement.style.setProperty ('MozUserSelect', 'none', '');
		aElement.style.setProperty ('-moz-user-select', 'none', '');
	},

	// TODO: Check if we have any copy-control transaction, and
	// if we are pasting those same controls. If yes, notify host
	// (it will create new objects), get new element id's from it,
	// proceed to paste, and then change pasted controls' id's.
	//
	// If we are pasting controls, but no copy-control transaction
	// has been started, then they are probably coming from cut, so
	// notify host of new controls and paste them.
	//
	// If a copy-control transaction has been started, but not controls are
	// pasted, then the transaction is obsolite and we should terminate
	// transaction.
	//
	// If no controls are pasted and no copy-control transaction started,
	// proceed with pasting and do nothing else.
	paste: function(aEvent)
	{
		var focusNode = this.base.selection.focusNode;
		var control =
			this.base.getElementOrParentByTagName (CONTROL_TAG_NAME,
						focusNode);
		if(control) {
			var controlId = control.getAttribute (ID);
			this.selectControl (controlId);
		}
		this.collapseBeforeInsertion ("end");
		if(this.mNsIEditor.canPaste (1))
			this.mNsIEditor.paste (1);
	},

	serializePage: function()
	{
		var xml =
			this.base.outputToString (this.base.contentsMIMEType,
						256);
		return xml;
	},

	hideTableUI: function()
	{
		this.mNsIHTMLInlineTableEditor.hideInlineTableEditingUI ();
	},

	showResizers: function(aElement)
	{
		this.mNsIHtmlEditor.hideResizers ();
		if(this.nodeIsControl (aElement) &&
		   aElement.getAttribute ('-md-can-resize') == 'true') {
			this.mNsIHtmlEditor.showResizers (aElement);
		}
	},

	hideResizers: function()
	{
		this.mNsIHtmlEditor.hideResizers ();
	},

	getSelectedControl: function()
	{
		if(this.mNsIHtmlEditor) {
			var selectedElement =
				this.base.getSelectedElement ('');
			if(selectedElement && this.nodeIsControl (selectedElement))
				return selectedElement;
			else
				return null;
		}
	},

	getElementOrParentByAttribute: function(aNode, aAttribute, aValue) {
		// Change the entire function to the (probably) more efficient
		// XULElement.getElementsByAttribute ( attrib , value )
		// It will return all the children with the specified
		// attribute
		if(aNode.nodeType == 1)
			var attrbiute = aNode.getAttribute (aAttribute);
		if(attrbiute == aValue)
			return aNode;

		aNode = aNode.parentNode;
		while(aNode) {
			if(aNode.nodeType == 1)
				attrbiute = aNode.getAttribute (aAttribute);
			if(attrbiute == aValue)
				return aNode;
			aNode = aNode.parent;
		}
		return null;
	},
};

//* ___________________________________________________________________________
// Event handlers
//_____________________________________________________________________________
function selectFromClick(aEvent)
{
	control = editor.base.getElementOrParentByTagName (CONTROL_TAG_NAME,
					aEvent.target);

	if(control) {
		if(editor.getSelectAll (control)) {
			editor.dragState = false;
			editor.setSelectNone (control);
		}

		if(editor.base.resizedObject) {
			editor.hideResizers ();
			editor.hideTableUI ();
		}
		var controlId = control.getAttribute (ID);
		editor.selectControl (controlId);
	}
}

function suppressMouseUp(aEvent) {
	if(editor.base.resizedObject) {
		var object = editor.base.resizedObject;
		dump ('handles around <' + object.tagName + ' id=' +
			object.getAttribute(ID) + '>');
	}
}

function handleDragStart(aEvent) {
	// If we are resizing, do nothing - false call
	if(editor.inResize)
		return;

	// Controls are "-moz-user-select: none" by default. Here we switch to
	// "-moz-user-select: all" in preparation for insertFromDrop(). We
	// revert back to -moz-user-select: none later in DidInsertNode(),
	// which is the real end of a Drag&Drop operation
	editor.hideResizers ();
	var selectedControl = editor.getSelectedControl ();
	var controls =
		editor.base.document.getElementsByTagName (CONTROL_TAG_NAME);
	if(controls.length > 0) {
		var i = 0;
		while(controls [i]) {
			if(selectedControl != controls [i])
				editor.setSelectAll (controls [i]);
			i++;
		}
	}

	editor.dragState = true;
	dump ('Begin drag.');
}

function handleDrop(aEvent) {
	//Nothing special here for now
}

function handleSingleClick(aButton, aTarget) {
	if(!gCancelClick) {
		control =
			editor.base.getElementOrParentByTagName (CONTROL_TAG_NAME,
						aTarget);
		var controlId =
			(control) ? control.getAttribute (ID) : '';

		switch (aButton) {
		case 0:
			host.click (SINGLE_CLICK, controlId);
			break;
		case 2:
			host.click (RIGHT_CLICK, controlId);
			break;
		}
	}
}

function detectSingleClick(aEvent)
{
	gCancelClick = false;
	var button = aEvent.button;
	var target = aEvent.target;
	setTimeout (function() { handleSingleClick(button, target); }, 300);
}

function detectDoubleClick(aEvent)
{
	gCancelClick = true;
	control = editor.base.getElementOrParentByTagName (CONTROL_TAG_NAME,
					aEvent.target);
	var controlId =
		(control) ? control.getAttribute (ID) : '';


	host.click (DOUBLE_CLICK, controlId);
	alert (editor.getPage ());
}

function handleContextMenu(aEvent)
{
	aEvent.stopPropagation ();
	aEvent.preventDefault ();
} 

// We have to detect cut, copy and paste, for they may involve controls
// If we copy a control and then past it, the host must be notified so
// it can create a new instance and assign the pasted control a new id
// TODO: Make those key really work
function handleKeyPress(aEvent) {
	// Handle cut
	if(aEvent.ctrlKey && aEvent.charCode == 120) {
		editor.doCommand (CUT);
		aEvent.stopPropagation ();
		aEvent.preventDefault ();
	}
	// Handle copy
	else if(aEvent.ctrlKey && aEvent.charCode == 99) {
		editor.doCommand (COPY);
		aEvent.stopPropagation ();
		aEvent.preventDefault ();
	}
	// Handle paste
	else if(aEvent.ctrlKey && aEvent.charCode == 118) {
		editor.paste ();
		aEvent.stopPropagation ();
		aEvent.preventDefault ();
	}
	// Handle delete
	else if(aEvent.keyCode == aEvent.DOM_VK_DELETE) {
		var control = editor.getSelectedControl ();
		var resizedObject = editor.base.resizedObject;

		// Special case: if we have resizers shown, but no single control
		// is selected we should reselect the control with resizers so it
		// gets deleted entirely. We get here when selecting ajasent
		// controls with the arrow keys
		//if(resizedObject && !control && editor.nextSiblingIsControl ()) {
			//editor.selectControl(editor.nextSiblingIsControl ());
			//editor.hideResizers ();
			//editor.setSelectAll (editor.getResizedObject ());
		//}

		// If we have a single element selected and it happens to be a
		// control
		if(control) {
			editor.hideResizers ();
			editor.setSelectAll (control);
		}

		// If selection is collapsed, caret is shown, and it's at the
		// of a text node
		else if (editor.atEndOfTextNode ()) {
			// If next sibling is a control, we should select it so
			// it gets entirely deleted
			if(editor.nextSiblingIsControl ()) {
				var focusNode =
					editor.base.selection.focusNode;
				control = focusNode.nextSibling;
				var controlId = control.getAttribute (ID);
				editor.selectControl (controlId);
				editor.hideResizers ();
			}
		}
	}
	// Backspace
	else if (aEvent.keyCode == aEvent.DOM_VK_BACK_SPACE) {
		var control = editor.getSelectedControl ();
		var resizedObject = editor.base.resizedObject;

		// Special case: if we have resizers shown, but no single control
		// is selected we should reselect the control with resizers so it
		// gets deleted entirely. We get here when selecting ajasent
		// controls with the arrow keys
		if(resizedObject && !control) {
			editor.selectControl(resizedObject.getAttribute(ID));
			editor.hideResizers ();
			editor.setSelectAll (resizedObject);
		}

		// If we have a single element selected and it happens to be a
		// control
		else if(control) {
			editor.hideResizers ();
			editor.setSelectAll (control);
		}

		// If selection is collapsed, caret is shown, and it's at the
		// beginning of a text node
		else if (editor.atBeginningOfTextNode ()) {
			// If previous sibling is a control, we should select
			// it so it gets entirely deleted
			if(editor.previousSiblingIsControl ()) {
				var focusNode =
					editor.base.selection.focusNode;
				var control = focusNode.previousSibling;
				var controlId = control.getAttribute (ID);
				editor.selectControl (controlId);
				editor.hideResizers ();
			}
		}
	}
	// Arrow up
	else if(aEvent.keyCode == aEvent.DOM_VK_UP) {
		
	}
	// Arrow down
	else if(aEvent.keyCode == aEvent.DOM_VK_DOWN) {
		
	}
	// Arrow left
	else if(aEvent.keyCode == aEvent.DOM_VK_LEFT) {
		var control = editor.previousSiblingIsControl ();
		var controlId = '';
		// If previous sibling is control and we don't have a single
		// control selected (in which case we only need to collapse and
		// show caret)
		if(control && !editor.getSelectedControl ()) {
			controlId = control.getAttribute (ID);
			editor.selectControl (controlId);
			// Hack. We should change the way selection works
			host.click (SINGLE_CLICK, controlId);
			aEvent.stopPropagation ();
			aEvent.preventDefault ();
		}
	}
	// Arrow right
	else if(aEvent.keyCode == aEvent.DOM_VK_RIGHT) {
		var control = editor.nextSiblingIsControl ();
		var controlId = '';
		// If next sibling is control and we don't have a single control
		// selected (in which case we only need to collapse and show
		// caret)
		if(control && !editor.getSelectedControl ()) {
			controlId = control.getAttribute (ID);
			editor.selectControl (controlId);
			// Hack. We should change the way selection works
			host.click (SINGLE_CLICK, controlId);
			aEvent.stopPropagation ();
			aEvent.preventDefault ();
		}
	}
}

function dump(aTxtAppend) {
	if(DEBUG) {
		JSCallPlaceClrCall ('DebugStatement', '', new Array(aTxtAppend));
	}
}
