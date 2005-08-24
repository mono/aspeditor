var editor                 = null;
var host                   = null;
var gWillFlash             = false;
var gDropOverControlId     = '';
var gCancelClick           = false;

const DEBUG                     = true;
const BORDER_CAN_DROP_COLOR     = '#ee0000';
const BORDER_CAN_DROP_THICK     = '2';
const BORDER_CAN_DROP_INVERT    = false;
const CONTROL_TAG_NAME          = 'aspcontrol';
const SINGLE_CLICK              = 'single';
const DOUBLE_CLICK              = 'double';
const RIGHT_CLICK               = 'right';
const OBJECT_RESIZER            = Components.interfaces.nsIHTMLObjectResizer;
const INLINE_TABLE_EDITOR       = Components.interfaces.nsIHTMLInlineTableEditor;
const TABLE_EDITOR              = Components.interfaces.nsITableEditor;
const EDITOR                    = Components.interfaces.nsIEditor;
const SELECTION_PRIVATE         = Components.interfaces.nsISelectionPrivate;

var controlId = "asptag2";
var injectHTML = "<!DOCTYPE HTML PUBLIC \"-//IETF//DTD HTML//EN//3.0\"><html><head></head><body><aspcontrol id=\"button1\" md-can-resize=\"true\" style=\"-moz-user-select: none; border: 1px solid #aaaaaa;  -moz-user-focus: ignore; -moz-user-input: disabled; vertical-align: text-bottom; display: -moz-inline-box; -moz-user-modify: read-only;\"><span style=\"display: block\"><div><img src=\"http://www.go-mono.com/images/mono-new.gif\"/><input type=\"button\" value=\"Button Control\" style=\"-moz-user-select: none; -moz-user-focus: ignore; -moz-user-input: disabled;\"/></div></span></aspcontrol>Some text<aspcontrol id=\"button2\" md-can-resize=\"true\" style=\"-moz-user-select: none; border: 1px solid #aaaaaa;  -moz-user-focus: ignore; -moz-user-input: disabled; vertical-align: text-bottom; display: -moz-inline-box; min-height: 70px; -moz-user-modify: read-only;\"><span style=\"display: block\"><div><div>Block text</div><input type=\"button\" value=\"Button Control\" style=\"-moz-user-select: none; -moz-user-focus: ignore; -moz-user-input: disabled; width: 100px; height: 70px;\"/>Inline text<div>Block text</div></div></span></aspcontrol><table id=\"table1\"><tr><td width=\"200\" height=\"100\" style=\"background: #eeeeee\" md-can-drop=\"true\"><span>Row One, Cell One</span></td><td width=\"200\" height=\"100\" style=\"background: #f5f5f5\" md-can-drop=\"true\"><span>Row One, Cell Two</span></td></tr><tr><td width=\"200\" height=\"100\" style=\"background: #f5f5f5\" md-can-drop=\"true\"><span>Row Two, Cell One</span></td><td width=\"200\" height=\"100\" style=\"background: #eeeeee\" md-can-drop=\"true\"><span>Row Two, Cell Two</span></td></tr></table><aspcontrol id=\"button3\" md-can-drop=\"true\" md-can-resize=\"true\" style=\"-moz-user-select: none; border: 1px solid #aaaaaa;  -moz-user-focus: ignore; -moz-user-input: disabled; vertical-align: text-bottom; display: -moz-inline-box; -moz-user-modify: read-only;\"><span style=\"display: block\"><div>Some<input type=\"button\" value=\"Button Control\" style=\"-moz-user-select: none; -moz-user-focus: ignore; -moz-user-input: disabled; width: 100px; height: 70px;\"/></div></span></aspcontrol></body></html>";

var newHTML = "<aspcontrol id=\"asptag2\" md-can-resize=\"true\" style=\"-moz-user-select: none; border: 1px solid #aaaaaa; display: block; width: 340;\">Updated Block ASP Control 1</aspcontrol>";

var newHTML4 = "<aspcontrol id=\"button2\" md-can-resize=\"true\" style=\"border: 1px solid #aaaaaa; vertical-align: text-bottom; -moz-user-focus: ignore; -moz-user-input: disabled; -moz-user-select: none; display: -moz-inline-box; min-height: 140px\"><span style=\"display: block\"><div><div>!!!   New desigh-time HTML   !!!</div><input type=\"button\" value=\"Button Control\" style=\"-moz-user-select: none; width: 200px; height: 140px;\"/>Inline text<div>Block text</div></div></span></aspcontrol>";

var newControl = "<aspcontrol id=\"label1\" md-can-drop=\"true\" md-can-resize=\"true\" style=\"-moz-user-select: none; border: 1px solid #aaaaaa;  -moz-user-focus: ignore; -moz-user-input: disabled; vertical-align: text-bottom; display: -moz-inline-box; -moz-user-modify: read-only;\"><span style=\"display: block\"><div>Some Control</div></span></aspcontrol>";

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
				editor.getElementOrParentByTagName (CONTROL_TAG_NAME,
					focusNode);
			if(parentControl) {
				//editor.selectElement (parentControl);
				editor.setCaretAfterElement (parentControl);
			}
		}
	}
}

// nsIEditActionListener implementation
var gNsIEditActionListenerImplementation = {
	DidCreateNode: function(tag, node, parent, position, result)
	{
	
	},

	// TODO: Check if deleted node contains a control, not only if it is one
	DidDeleteNode: function(child, result)
	{
		if(!editor.getInResize() && !editor.getDragState ()) {
			var control = editor.removeLastDeletedControl ();
			if(control) {
				var deletionStr = 'deleteControl(s):';
				deletionStr += ' id=' + control + ',';
				editor.removeFromControlTable (control)
				//TODO: call the respective C# metod on the host
				if(DEBUG) {
					dump (deletionStr +
						' Message source: DidDeleteNode()'
						+ '\n');
					dump ('There is/are '
						+ editor.getControlCount()
						+ ' controls left in the page\n');
				}
			}
		}
	},

	// For each element in to-be-deleted array, remove control from the control
	// table, let the host know we have deleted a control by calling the
	// respective method, and remove from to-be-deleted array.
	DidDeleteSelection: function(selection)
	{
		if(!editor.getInResize () && !editor.getDragState ()) {
			var control = editor.removeLastDeletedControl ();
			if(control) {
				var deletionStr = 'Did delete control(s):';
				while(control) {
					deletionStr += ' id=' + control + ',';
					editor.removeFromControlTable (control)
					//TODO: call the respective C# metod in the host
					control = editor.removeLastDeletedControl ();
				}
				if(DEBUG) {
					dump (deletionStr +
						' Message source: DidDeleteSelection()'
						+ '\n');
					dump ('There is/are ' +
						editor.getControlCount() +
						' controls left in the page\n');
				}
			}
		}
	},

	DidDeleteText: function(textNode, offset, length, result)
	{
	
	},

	// TODO: If we are inserting a control, check if it's already
	// registered in the control table. If it is, update reference.
	// If not, register it.
	// Make sure to check node contents for controls too. The node could be
	// a table (or any other element) with a control inside.
	DidInsertNode: function(node, parent, position, result)
	{
		if(DEBUG) {
			var dumpStr = 'Did insert node ' + node.nodeName;
			dumpStr += (node.nodeType == 1) ?
				', id=' + node.getAttribute('id') :
				'';
			dumpStr += '\n';
			dump (dumpStr);
		}

		// Are we inserting an already existing control? If we are, then
		// it probably comes from Drag&Drop operation. Anyway, we have
		// to update its reference in the local control table
		if(node.nodeType == 1 &&
		   editor.getControlTable ().getById(node.getAttribute ('id'))) {
			editor.getControlTable ().update (node.getAttribute ('id'), node);
		editor.collapseBeforeInsertion ("end");
		editor.selectElement (node);
			if(DEBUG)
				dump ('Did update control(id=' +
					node.getAttribute ('id') +
					') reference in table' +
					'\n');
		}

		// If we have just concluded a Drag&Drop operation, we should
		// set back moz-user-select to "none" on any controls we have
		// posibly droped over or near
		if(gDropOverControlId) {
			var i       = 0;
			var control = editor.getControlFromTableByIndex (i);
			if(control) {
				while(control) {
					editor.setSelectNone (control);
					i++;
					control = editor.getControlFromTableByIndex (i);
				}
			}
			gDropOverControlId = '';
		}

		// Check to see if we have inserted a new control. We need to
		// add it to the control table.
		// TODO: Check to see if there is any nested controls
		if(editor.nodeIsControl (node) &&
		   !editor.getControlFromTableById (node.getAttribute ('id'))) {
			editor.insertInControlTable (node.getAttribute ('id'), node);
			if(DEBUG)
				dump ('New control (id=' +
					node.getAttribute ('id') +
					') inserted\n');
		}

		if(DEBUG && editor.getDragState ()) {
			dump ('End drag\n');
		}

		if(editor.nodeIsControl (node) &&
		   (node.nodeType == 1 || node.nodeType == 3)) {
			var element = editor.getElementById(node.getAttribute ('id'));
			editor.selectElement (element);
		}
		if(editor.getDragState ())
			editor.setDragState (false);
	},

	DidInsertText: function(textNode, offset, string, result)
	{
	
	},

	DidJoinNodes: function(leftNode, rightNode, parent, result)
	{
	
	},

	DidSplitNode: function(existingRightNode, offset, newLeftNode, result)
	{
	
	},

	WillCreateNode: function(tag, parent, position)
	{
		//alert ('Will create node');
	},

	WillDeleteNode: function(child)
	{
		if(!editor.getInResize () && !editor.getDragState ()) {
			var i       = 0;
			var control = editor.getControlFromTableByIndex (i);
			while(control) {
				if(child == control) {
					editor.addLastDeletedControl (control.getAttribute ('id'));
					alert (control.getAttribute('id'));
				}
				i++;
				control = editor.getControlFromTableByIndex (i);
			}
		}
	},

	// Check if the selection to be deleted contains controls and prepare
	//for deletion. Load all to-be-deleted controls in an array, so we can
	// access them after actual deletion in order to notify the host.
	WillDeleteSelection: function(selection)
	{
		if(!editor.getInResize () && !editor.getDragState ()) {
			var i       = 0;
			var control = editor.getControlFromTableByIndex (i);
			var deletionStr = 'Will delete control(s):';
			if(control) {
				while(control) {
					if(selection.containsNode (control, true)) {
						deletionStr += ' id=' +
							control.getAttribute ('id') + ',';
						editor.addLastDeletedControl (control.getAttribute ('id'));
					}
					i++;
					control = editor.getControlFromTableByIndex (i);
				}
				if(DEBUG)
					dump (deletionStr +
						' Message source: WillDeleteSelection()' +
						'\n');
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
			var id = element.getAttribute ('id');
			host.resizeControl (id, newWidth, newHeight);
		}
	},

	onStartResizing: function(element)
	{
		editor.beginBatch ();
		editor.setInResize (true);
			if(DEBUG)
				dump ('Begin resize.\n');
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
		JSCallRegisterClrHandler ('loadPage', editor.loadPage);
		JSCallRegisterClrHandler ('getPage', editor.getPage);
		JSCallRegisterClrHandler ('addControl', editor.addControl);
		JSCallRegisterClrHandler ('removeControl', editor.removeControl);
		JSCallRegisterClrHandler ('updateControl', editor.updateControl);
		// Control selection
		JSCallRegisterClrHandler ('selectControl', editor.selectControl);
		JSCallRegisterClrHandler ('clearSelection', editor.clearSelection);

	},

	click: function(aType, aControlId)
	{
 		if(!aControlId) {
			dump ('Deselecting all controls\n');
		}
		
		else if(aType == SINGLE_CLICK) {
			dump ("Single click over <aspcontrol id=\"" + aControlId + "\">\n");
		}
		
		else if(aType == DOUBLE_CLICK) {
			dump ("Double click over <aspcontrol id=\"" + aControlId + "\">\n");
		}
		
		else if(aType == RIGHT_CLICK) {
			dump ("Right click over <aspcontrol id=\"" + aControlId + "\">\n");
		}
	},

	resizeControl: function(aControlId, aWidth, aHeight)
	{
		switch(aControlId) {
		case "asptag2":
			editor.updateControl (aControlId, newHTML);
			if(DEBUG)
				dump ('resizeControl: id=' +
					aControlId +
					', new size: ' +
					aWidth +
					'x' +
					aHeight +
					'\n');
			break;
		case "asptag1":
			editor.updateControl (aControlId, newHTML1);
			if(DEBUG)
				dump ('resizeControl: id=' +
					aControlId +
					', new size: ' +
					aWidth +
					'x' +
					aHeight +
					'\n');
			break;
		case "nest1":
			editor.updateControl (aControlId, newHTML2);
			if(DEBUG)
				dump ('resizeControl: id=' +
					aControlId +
					', new size: ' +
					aWidth +
					'x' +
					aHeight +
					'\n');
			break;
		case "button1":
			editor.updateControl (aControlId, newHTML3);
			if(DEBUG)
				dump ('resizeControl: id=' +
					aControlId +
					', new size: ' +
					aWidth +
					'x' +
					aHeight +
					'\n');
			break;
		case "button2":
			editor.updateControl (aControlId, newHTML4);
			if(DEBUG)
				dump ('resizeControl: id=' +
					aControlId +
					', new size: ' +
					aWidth +
					'x' +
					aHeight +
					'\n');
			break;
		case "nest2":
			editor.updateControl (aControlId, newHTML5);
			if(DEBUG)
				dump ('resizeControl: id=' +
					aControlId +
					', new size: ' +
					aWidth +
					'x' +
					aHeight +
					'\n');
			break;
		}
	}
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
//_____________________________________________________________________________
var controlTable = {
	hash                      : new Array (),
	array                     : new Array (),
	length                    : 0,
      
	add: function(aControlId, aControlRef)
	{
		if(this.hash [aControlId]) {
			if(DEBUG)
				dump ('Panic: atempt to add an already existing control with id=' +
					aControlId +
					'. Remove first.\n');
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
			if(DEBUG)
				dump ('Panic: atempt to remove control with unexisting id=' +
					aControlId +
					'\n');
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
	editor = new aspNetEditor ();
	editor.initialize ();
	host = new aspNetHost ();
	host.initialize ();
}

function aspNetEditor()
{

}

aspNetEditor.prototype = 
{
	mNsIHtmlEditor            : null,
	mNsIEditor                : null,
	mNsITableEditor           : null,
	mNsIHtmlObjectResizer     : null,
	mNsIHTMLInlineTableEditor : null,
	mNsISelectionPrivate      : null,
	mShell                    : null,

	mDropInElement            : null,
	mControlTable             : null,
	mLastDeletedControls      : null,
	mLastSelectedControls     : null,
	mInResize                 : null,
	mInDrag                   : null,

	initialize: function()
	{
		var editorElement = document.getElementById ('aspeditor');
		editorElement.makeEditable ('html',false);

		this.mNsIHtmlEditor =
			editorElement.getHTMLEditor(document.getElementById('aspeditor').contentWindow);
		this.mNsIEditor =
			this.mNsIHtmlEditor.QueryInterface(EDITOR);
		this.mNsITableEditor =
			this.mNsIHtmlEditor.QueryInterface(TABLE_EDITOR);
		this.mNsIHTMLInlineTableEditor =
			this.mNsIHtmlEditor.QueryInterface(INLINE_TABLE_EDITOR);
		this.mNsIHtmlObjectResizer =
			this.mNsIHtmlEditor.QueryInterface(OBJECT_RESIZER);
		this.mShell =
			XPCU.getService ("@mozilla.org/inspector/flasher;1",
				"inIFlasher");

		if(this.mShell) {
			this.mShell.color               = BORDER_CAN_DROP_COLOR;
			this.mShell.thickness           = BORDER_CAN_DROP_THICK;
			this.mShell.invert              = BORDER_CAN_DROP_INVERT;
			gWillFlash = true;
		}

		var selectionPrivate = this.getSelection().QueryInterface (SELECTION_PRIVATE);
		selectionPrivate.addSelectionListener (gNsISelectionListenerImplementation);
		this.mNsIHtmlEditor.addObjectResizeEventListener (gNsIHTMLObjectResizeListenerImplementation);
		this.mNsIHtmlEditor.addEditActionListener (gNsIEditActionListenerImplementation);
		// ?????????????????????????????????????????????????????????????????????????
		// Bug in Mozilla's InsertHTMLWithContext?
		//this.mNsIHtmlEditor.addInsertionListener (gNsIContentFilterImplementation);

		// All of our event listeners are added to the document here
		this.getDocument ().addEventListener ('mousedown',
			selectFromClick,
			true);
		this.getDocument ().addEventListener ('mouseup',
			suppressMouseUp,
			true);
		this.getDocument ().addEventListener ('click',
			detectSingleClick,
			true);
		this.getDocument ().addEventListener ('dblclick',
			detectDoubleClick,
			true);
		this.getDocument ().addEventListener ('contextmenu',
			handleContextMenu,
			true);
		this.getDocument ().addEventListener ('draggesture',
			handleDragStart,
			true);
		this.getDocument ().addEventListener ('dragdrop',
			handleDrop,
			true);
		this.getDocument ().addEventListener ('dragover',
			dragOverControl,
			true);
		this.getDocument ().addEventListener ('keypress',
			handleKeyPress,
			true);

		this.mLastDeletedControls  = new Array();
		this.mLastSelectedControls = new Array();
		this.mControlTable         = controlTable;
		this.mInResize             = false;
		this.mInDrag               = false;
	},

	getSelection: function()
	{
		if(this.mNsIHtmlEditor)
			return this.mNsIHtmlEditor.selection;
	},

	getDocument: function()
	{
		if(this.mNsIHtmlEditor)
			return this.mNsIHtmlEditor.document;
	},

	getSelectedElement: function(aTagName)
	{
		if(this.mNsIHtmlEditor)
			return this.mNsIHtmlEditor.getSelectedElement (aTagName);
	},

	getSelectedControl: function()
	{
		if(this.mNsIHtmlEditor) {
			var selectedElement = this.getSelectedElement ('');
			if(selectedElement && this.nodeIsControl (selectedElement))
				return selectedElement;
			else
				return null;
		}
	},

	getControlCount: function()
	{
		return this.mControlTable.getCount ();
	},

	getResizedObject: function()
	{
		return this.mNsIHtmlEditor.resizedObject;
	},
  
	getInResize: function()
	{
		return this.mInResize;
	},
  
	setInResize: function(aBool)
	{
		this.mInResize = aBool;
	},
  
	getDragState: function()
	{
		return this.mInDrag;
	},
  
	setDragState: function(aBool)
	{
		this.mInDrag = aBool;
	},
  
	getLastSelectedControls: function()
	{
		return this.mLastSelectedControls;
	},
  
	setLastSelectedControls: function(aNewSelectedControls)
	{
		
	},
  
	beginBatch: function()
	{
		this.mNsIHtmlEditor.transactionManager.beginBatch ();
	},
  
	endBatch: function()
	{
		this.mNsIHtmlEditor.transactionManager.endBatch ();
	},

	getElementOrParentByTagName: function(aTagName, aTarget)
	{
		if(this.mNsIHtmlEditor)
			return this.mNsIHtmlEditor.getElementOrParentByTagName (aTagName, aTarget);
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
  
	emptyLastDeletedControl: function()
	{
		
	},
  
	nodeIsControl: function(aNode)
	{
		var name = aNode.nodeName;
		name = name.toLowerCase ();
		if(name == CONTROL_TAG_NAME)
			return true;
		return false;
	},

	loadPage: function(aHtml)
	{
		if(aHtml) {
			try {
				this.selectAll ();
				this.deleteSelection ();
				this.insertHTML (aHtml);
				// TODO: we might have a legasy control table
				// so empty it
			} catch (e) { ;}
		}
	},
  
	insertHTML: function(aHtml)
	{
		this.mNsIHtmlEditor.insertHTML (aHtml);
	},
  
	insertHTMLWithContext: function(aInputString, aContextStr, aInfoStr,
					aFlavor, aSourceDoc, aDestinationNode,
					aDestinationOffset, aDeleteSelection)
	{
		this.mNsIHtmlEditor.insertHTMLWithContext (aInputString,
			aContextStr, aInfoStr, aFlavor, aSourceDoc,
			aDestinationNode, aDestinationOffset, aDeleteSelection);
	},

	collapseBeforeInsertion: function(aPoint)
	{
		switch(aPoint) {
		case "start":
			this.getSelection().collapseToStart ();
			break;
		case   "end":
			this.getSelection().collapseToEnd ();
			break;
		}
	},

	//  Loading/Saving/ControlState
	loadPage: function(aHtml)
	{
		if(aHtml) {
			try {
				this.selectAll ();
				this.deleteSelection ();
				this.insertHTML (aHtml);
				// TODO: we might have a legasy control table
				// so empty it
			} catch (e) { ;}
		}
	},

	getPage: function()
	{
		var html = this.serializePage ();
		alert (html);
	},

	addControl: function(aControlHtml, aControlId)
	{
		if(aControlHtml) {
			var insertIn = null;
			var destinationOffset = 0;
			var selectedElement = this.getSelectedElement ('');
			var focusNode = this.getSelection ().focusNode;
			
			// If we have a single-element selection and the element
			// happens to be a control
			if (selectedElement &&
			    this.nodeIsControl (selectedElement)) {
				insertIn = selectedElement.parentNode;
				while(selectedElement != insertIn.childNodes [destinationOffset])
					destinationOffset++;
				destinationOffset++;
			}
			
			// If selection is somewhere inside a control
			if(focusNode) {
				var parentControl =
					this.getElementOrParentByTagName (CONTROL_TAG_NAME,
						focusNode);
				if(parentControl){
					insertIn = parentControl.parentNode;
					while(parentControl != insertIn.childNodes [destinationOffset])
						destinationOffset++;
					destinationOffset++;
				}
			}

			// If none of the above is true, we are just inserting
			// with defaults insertIn=null, destinationOffset=0
			this.insertHTMLWithContext (aControlHtml, '', '', '',
				null, insertIn, destinationOffset, false);
			this.selectElement (this.getElementById (aControlId));
			this.showResizers (this.getElementById (aControlId));
		}
	},

	removeControl: function(aControlId)
	{
		var control = this.getDocument ().getElementById (aControlId);
		if(control) {
			this.selectElement (control);
			this.deleteSelection ();
		}
	},

	updateControl: function(aControlId, aNewDesignTimeHtml)
	{
		if(aControlId && aNewDesignTimeHtml &&
		   this.getDocument ().getElementById (aControlId)) {
			this.hideResizers ();
			try {
				var oldControl =
					this.getDocument ().getElementById (aControlId);
				this.collapseBeforeInsertion ("start");
				this.selectElement (oldControl);
				this.insertHTML (aNewDesignTimeHtml);
			} catch (e) { }
			this.endBatch ();
			this.updateControlInTable(aControlId,
				this.getDocument ().getElementById (aControlId));
			if(DEBUG)
				dump ('End resize.\n');
			this.setInResize (false);
		}
	},

	// Control selection
	selectControl: function(aControlId, aAdd, aPrimary)
	{
		// TODO: talk to Michael about selecting controls. Why do we
		// need to have multiple controls selected and what is primary?
		var controlRef = this.getControlTable ().getById(aControlId);
		this.clearSelection ();
		this.selectElement (controlRef);
		this.showResizers (controlRef);
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
  
	insertFromDrop: function(aEvent)
	{
		this.mNsIEditor.insertFromDrop (aEvent);
	},

	// TODO: Notify host to delete component, and remove control
	// from local control table
	cut: function()
	{
		this.mNsIEditor.cut ();
	},

	// TODO: Check if a selection contains any controls, if yes
	// strat a copy-control transaction
	copy: function()
	{
		this.mNsIEditor.copy ();
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
		var focusNode = this.getSelection ().focusNode;
		var control =
			this.getElementOrParentByTagName (CONTROL_TAG_NAME,
				focusNode);
		if(control) {
			this.selectElement (control);
		}
		this.collapseBeforeInsertion ("end");
		if(this.mNsIEditor.canPaste (1))
			this.mNsIEditor.paste (1);

		//this.collapseBeforeInsertion ("end");
		//if(this.mNsIEditor.canPaste (1))
			//this.mNsIEditor.paste (1);
	},

	undo: function()
	{
		this.mNsIEditor.undo (1);
	},

	redo: function()
	{
		this.mNsIEditor.redo (1);
	},

	serializePage: function()
	{
		var xml =
			this.mNsIHtmlEditor.outputToString (this.mNsIHtmlEditor.contentsMIMEType, 256);
		return xml;
	},

	hideTableUI: function()
	{
		this.mNsIHTMLInlineTableEditor.hideInlineTableEditingUI ();
	},

	showResizers: function(aElement)
	{
		if(this.nodeIsControl (aElement) &&
		   aElement.getAttribute ('md-can-resize')) {
			this.mNsIHtmlEditor.hideResizers ();
			this.mNsIHtmlEditor.showResizers (aElement);
		}
	},

	hideResizers: function()
	{
		this.mNsIHtmlEditor.hideResizers ();
	},

	selectElement: function(aElement)
	{
		this.mNsIHtmlEditor.selectElement (aElement);
	},
  
	deleteSelection: function()
	{
		this.mNsIHtmlEditor.deleteSelection (1);
	},

	setCaretAfterElement: function(aElement)
	{
		this.mNsIHtmlEditor.setCaretAfterElement (aElement);
	},

	selectAll: function(aElement)
	{
		this.mNsIHtmlEditor.selectAll (aElement);
	},

	hideSelection: function()
	{
		if(this.mNsIHtmlEditor)
			this.mNsIHtmlEditor.selectionController.setDisplaySelection (0);
	},

	highlightOnCanDrop: function(aElement)
	{
		var oldElement = this.mDropInElement;
		if(oldElement != aElement) {
			if(oldElement) {
				if(DEBUG)
					dump ('ajasent can drop\n');
				this.mShell.repaintElement (oldElement);
				this.mShell.drawElementOutline (aElement);
				this.mDropInElement = aElement;
			}
			else {
				if(DEBUG)
					dump ('enter new can drop ' +
						oldElement + aElement + '\n');
				this.mDropInElement = aElement;
				this.mShell.drawElementOutline (aElement);
			}
			//if(DEBUG)
				//dump ('can drop in this ' + aElement.nodeName + '\n');
		}
	},

	highlightOffCanDrop: function()
	{
		var restore = this.mDropInElement;
		if(restore) {
			this.mShell.repaintElement (restore);
			this.mDropInElement = null;
		}
	},

	getElementOrParentByAttribute: function(aNode, aAttribute) {
		// Change the entire function to the more efficient
		// XULElement.getElementsByAttribute ( attrib , value )
		// It will return all the children with the specified
		// attribute
		if(aNode.nodeType == 1)
			var canDrop = aNode.getAttribute (aAttribute);
		if(canDrop)
			return aNode;

		aNode = aNode.parentNode;
		while(aNode) {
			if(aNode.nodeType == 1)
				canDrop = aNode.getAttribute (aAttribute);
			if(canDrop)
				return aNode;
			aNode = aNode.parent;
		}
		return null;
	},

	getElementById: function(aElementId) {
		return this.getDocument ().getElementById (aElementId);
	}
};

//* ___________________________________________________________________________
// Event handlers
//_____________________________________________________________________________
function selectFromClick(aEvent)
{
	control = editor.getElementOrParentByTagName(CONTROL_TAG_NAME,
			aEvent.target);

	if(control) {
		if(editor.getSelectAll (control)) {
			editor.setDragState (false);
			editor.setSelectNone (control);
		}

		if(editor.getResizedObject ()) {
			editor.hideResizers ();
			editor.hideTableUI ();
		 }
		editor.selectElement (control);
		editor.showResizers (control);
	}
}

function suppressMouseUp(aEvent) {
	if(editor.getResizedObject ()) {
		if(DEBUG) {
			var object = editor.getResizedObject ();
			dump ('handles around <' + object.tagName + ' id=' +
				object.getAttribute('id') + '>\n');
		}
		else {
			aEvent.stopPropagation ();
			aEvent.preventDefault ();
		}
	}
}

function dragOverControl(aEvent) {
	if(gWillFlash && aEvent.target.nodeType == 1) {
		var element = editor.getElementOrParentByAttribute (aEvent.target,
					'md-can-drop');
    
		if(element)
			editor.highlightOnCanDrop (element);
		else
			editor.highlightOffCanDrop ();
	}
}

function handleDragStart(aEvent) {
	// If we are resizing, do nothing - false call
	if(editor.getInResize ())
		return;
	// else
	editor.setDragState (true);
		if(DEBUG)
			dump ('Begin drag.\n');
}

function handleDrop(aEvent) {
	// Controls are "-moz-user-select: none" by default. Here we switch to
	// "-moz-user-select: all" in preparation for insertFromDrop(). We
	// revert back to -moz-user-select: none later in DidInsertNode(),
	// which is the real end of a Drag&Drop operation
	var parentControlRef = editor.getElementOrParentByTagName(CONTROL_TAG_NAME,
					aEvent.target);
	if(parentControlRef) {
		editor.hideResizers ();
		gDropOverControlId = parentControlRef.getAttribute('id');
		editor.setSelectAll (parentControlRef);
	}
	else {
		var i       = 0;
		var control = editor.getControlFromTableByIndex (i);
		if(control) {
			while(control) {
				editor.setSelectAll (control);
				i++;
				control = editor.getControlFromTableByIndex (i);
			}
		}
	}
}

function handleSingleClick(aButton, aTarget) {
	if(!gCancelClick) {
		control = editor.getElementOrParentByTagName(CONTROL_TAG_NAME,
				aTarget);
		var controlId =
			(control) ? control.getAttribute ('id') : '';

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
	control = editor.getElementOrParentByTagName(CONTROL_TAG_NAME,
			aEvent.target);
	var controlId =
		(control) ? control.getAttribute ('id') : '';

	host.click (DOUBLE_CLICK, controlId);
}

function handleContextMenu(aEvent)
{
	aEvent.stopPropagation ();
	aEvent.preventDefault ();
} 

// We have to detect cut, copy and paste, for they may involve controls
// If we copy a control and then past it, the host must be notified so
// it can create a new instance and assign the pasted control a new id
function handleKeyPress(aEvent) {
	// Handle cut
	if(aEvent.ctrlKey && aEvent.charCode == 120) {
		editor.cut ();
		aEvent.stopPropagation ();
		aEvent.preventDefault ();
	}
	// Handle copy
	else if(aEvent.ctrlKey && aEvent.charCode == 99) {
		editor.copy ();
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
		var selectedElement = editor.getSelectedElement ('');
		if(selectedElement)
			var control =
				editor.getElementOrParentByTagName (CONTROL_TAG_NAME,
					selectedElement);

		if(control) {
			//editor.selectElement (control);
			editor.hideResizers ();
			editor.setSelectAll (control);
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
		
	}
	// Arrow right
	else if(aEvent.keyCode == aEvent.DOM_VK_RIGHT) {
		
	}
}

function dump(aTxtAppend) {
	if(DEBUG) {
		var oldValue = document.getElementById('debugWin').value;
		document.getElementById('debugWin').value = aTxtAppend + oldValue;
	}
}