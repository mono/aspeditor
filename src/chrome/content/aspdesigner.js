var editor                 = null;
var host                   = null;
var gCancelClick           = false;

const DEBUG                     = true;
const BORDER_CAN_DROP_COLOR     = '#ee0000';
const BORDER_CAN_DROP_THICK     = '2';
const BORDER_CAN_DROP_INVERT    = false;
const CONTROL_TAG_NAME          = 'aspcontrol';
const END_CONTROL_TAG_EXP       = /<\/aspcontrol>/g;
const BEGIN_CONTROL_TAG_EXP     = /(<aspcontrol.[^(><.)]+>)/g;
const APPEND_TO_CONTROL_END     = '</div></span>';
const APPEND_TO_CONTROL_BEGIN   = "<span style=\"display: block\"><div>";
const SINGLE_CLICK              = 'single';
const DOUBLE_CLICK              = 'double';
const RIGHT_CLICK               = 'right';
const OBJECT_RESIZER            = Components.interfaces.nsIHTMLObjectResizer;
const INLINE_TABLE_EDITOR       = Components.interfaces.nsIHTMLInlineTableEditor;
const TABLE_EDITOR              = Components.interfaces.nsITableEditor;
const EDITOR                    = Components.interfaces.nsIEditor;
const SELECTION_PRIVATE         = Components.interfaces.nsISelectionPrivate;

var gRepaintElement = 'button1';
var controlId       = 'asptag2';
var injectHTML      = "<!DOCTYPE HTML PUBLIC \"-//IETF//DTD HTML//EN//3.0\"><html><head></head><body><aspcontrol id=\"button1\" md-can-drop=\"false\" md-can-resize=\"true\" height=\"85\" width=\"380\"><img src=\"http://www.go-mono.com/images/mono-new.gif\"/><input type=\"button\" value=\"Button Control\"></aspcontrol>Some text<aspcontrol id=\"button2\"  md-can-drop=\"false\" md-can-resize=\"true\" height=\"75\" width=\"180\"><div>Block text</div><input type=\"button\" value=\"Button Control\" style=\"width: 100px; height: 70px;\"/>Inline text<div>Block text</div></aspcontrol><table id=\"table1\" style=\"border: 5px solid #000000;\"><tr><td width=\"200\" height=\"100\" style=\"background: #eeeeee\" md-can-drop=\"true\"><span>Row One, Cell One</span></td><td width=\"200\" height=\"100\" style=\"background: #f5f5f5\" md-can-drop=\"true\"><span>Row One, Cell Two</span></td></tr><tr><td width=\"200\" height=\"100\" style=\"background: #f5f5f5\" md-can-drop=\"true\"><span>Row Two, Cell One</span></td><td width=\"200\" height=\"100\" style=\"background: #eeeeee\" md-can-drop=\"true\"><span>Row Two, Cell Two</span></td></tr></table><aspcontrol id=\"button3\"  md-can-drop=\"false\" md-can-resize=\"true\" height=\"85\" width=\"150\">Some<input type=\"button\" value=\"Button Control\" style=\"width: 100px; height: 70px;\"/></aspcontrol></body></html>";

var newHTML4 = "<aspcontrol id=\"button2\" md-can-resize=\"true\"><div>!!!   New desigh-time HTML   !!!</div><input type=\"button\" value=\"Button Control\" style=\"width: 200px; height: 140px;\"/>Inline text<div>Block text</div></aspcontrol>";

var newControl = "<aspcontrol id=\"label1\" md-can-drop=\"false\" md-can-resize=\"true\" height=\"110\" width=\"220\">Some Control with table<table id=\"table2\" style=\"border: 5px solid #000000;\"><tr><td width=\"200\" height=\"100\" style=\"background: #eeeeee\" md-can-drop=\"true\"><span>Row One, Cell One</span></td></tr></table></aspcontrol>";

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
		//alert('did create node');
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
						' Message source: DidDeleteNode()');
					dump ('There is/are '
						+ editor.getControlCount()
						+ ' controls left in the page');
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
						' Message source: DidDeleteSelection()');
					dump ('There is/are ' +
						editor.getControlCount() +
						' controls left in the page');
				}
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
		if(DEBUG) {
			var dumpStr = 'Did insert node ' + node.nodeName;
			dumpStr += (node.nodeType == 1) ?
				', id=' + node.getAttribute('id') :
				'';
			dump (dumpStr);
		}

		// Check to see if we have inserted a new controls. We need to
		// add'em to the control table. Also update reference to all
		// existing controls
		var controls = editor.getDocument ().getElementsByTagName (CONTROL_TAG_NAME);
		if(controls.length > 0) {
			var i = 0;
			var width, height;
			while(controls [i]) {
				if(editor.getControlTable ().getById (controls [i].getAttribute ('id'))) {
					//alert(controls [i].getAttribute ('id'));
					editor.getControlTable ().update (controls [i].getAttribute ('id'),
									controls [i]);
						if(DEBUG)
							dump ('Did update control(id=' +
								controls [i].getAttribute ('id') +
								') reference in table');
				}
				else {
					editor.insertInControlTable (controls [i].getAttribute ('id'),
							controls [i]);
					if(DEBUG) {
						dump ('New control (id=' +
							controls [i].getAttribute ('id') +
							') inserted');
						dump ('There is/are ' +
							editor.getControlCount() +
							' controls in the page');
					}
 				}
				editor.setSelectNone (controls [i]);
				width = controls [i].getAttribute('width');
				height = controls [i].getAttribute('height');
				controls [i].style.setProperty ('min-width',
							width, '');
				controls [i].style.setProperty ('min-height',
							height, '');
				controls [i].style.setProperty ('display',
							'-moz-inline-box', '');
				controls [i].style.setProperty ('border',
							'1px solid #aaaaaa', '');
				controls [i].style.setProperty ('vertical-align',
							'text-bottom', '');
				i++;
			}
		}

		if(DEBUG && editor.getDragState ()) {
			dump ('End drag');
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
			var id = element.getAttribute ('id');
			host.resizeControl (id, newWidth, newHeight);
		}
	},

	onStartResizing: function(element)
	{
		editor.beginBatch ();
		editor.setInResize (true);
			if(DEBUG)
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
		// Control selection
		JSCallRegisterClrHandler ('SelectControl', JSCall_SelectControl);
		
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
	},

	resizeControl: function(aControlId, aWidth, aHeight)
	{
		JSCallPlaceClrCall ('ResizeControl', '', new Array(aControlId, aWidth, aHeight));
		dump ('Resizing ' + aControlId +', new size ' +	aWidth + 'x' + aHeight);
	},
	
	throwException: function (location, msg)
	{
		JSCallPlaceClrCall ('ThrowException', '', new Array(location, msg));
	},
}


/* Directly hooking up the editor's methods as JSCall handler functions
 * means that their access to 'this' is broken so we use these
 * surrogate functions instead
 */

function JSCall_SelectControl (arg)
{
	aControlId = arg[0];
	aAdd = true;
	aPrimary = true;
	return editor.selectControl (aControlId, aAdd, aPrimary);
}

function JSCall_UpdateControl (arg)
{
	aControlId = arg[0];
	aNewDesignTimeHtml = arg[1];
	return editor.updateControl (aControlId, aNewDesignTimeHtml);
}

function JSCall_RemoveControl (arg)
{
	return editor.removeControl (arg[0]);
}

function JSCall_AddControl (arg)
{
	aControlId = arg[0];
	aControlHtml = arg[1];
	dump ('Adding control ' + aControlId + '; aControlHtml is ' + aControlHtml); 
	return editor.addControl (aControlHtml, aControlId);
}

function JSCall_GetPage ()
{
	return editor.getPage ();
}

function JSCall_LoadPage (arg)
{
	return editor.loadPage (arg[0]);
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
			if(DEBUG)
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
	editor = new aspNetEditor ();
	editor.initialize ();
	var buttonBox = document.getElementById ('buttonBox');
	var debugBox  = document.getElementById ('debugBox');
	if(!DEBUG) {
		buttonBox.style.display = 'none';
		debugBox.style.display  = 'none';
	}

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
	mNsIEditorStyleSheets     : null,
	mShell                    : null,

	mDropInElement            : null,
	mControlTable             : null,
	mLastDeletedControls      : null,
	mLastSelectedControls     : null,
	mInResize                 : null,
	mInDrag                   : null,
	mWillFlash                : false,

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
		if ((typeof XPCU) == 'object');
			this.mShell =
				XPCU.getService ("@mozilla.org/inspector/flasher;1",
					"inIFlasher");

		if(this.mShell) {
			this.mShell.color               = BORDER_CAN_DROP_COLOR;
			this.mShell.thickness           = BORDER_CAN_DROP_THICK;
			this.mShell.invert              = BORDER_CAN_DROP_INVERT;
			this.mWillFlash                 = true;
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

	getDocument: function()
	{
		if(this.mNsIHtmlEditor)
			return this.mNsIHtmlEditor.document;
	},

	getControlCount: function()
	{
		return this.mControlTable.getCount ();
	},

	getResizedObject: function()
	{
		return this.mNsIHtmlEditor.resizedObject;
	},

	getWillFlash: function()
	{
		return this.mWillFlash;
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

	transformControlsInHtml: function(aHTML)
	{
		var aHTML = aHTML.replace (BEGIN_CONTROL_TAG_EXP, "$&" + APPEND_TO_CONTROL_BEGIN);
		var aHTML = aHTML.replace (END_CONTROL_TAG_EXP, APPEND_TO_CONTROL_END + "$&");
		return (aHTML);
	},

	//  Loading/Saving/ControlState
	loadPage: function(aHtml)
	{
		if(aHtml) {
			try {
				this.selectAll ();
				this.deleteSelection ();
				var html = this.transformControlsInHtml(aHtml);
				this.insertHTML (html);
				// TODO: we might have a legasy control table
				// so empty it
			} catch (e) { ;}
		}
	},

	getPage: function()
	{
		var html = this.serializePage ();
		return html;
	},

	addControl: function(aControlHtml, aControlId)
	{
		if(aControlHtml) {
			var insertIn = null;
			var destinationOffset = 0;
			var selectedElement = this.getSelectedElement ('');
			var focusNode = this.getSelection ().focusNode;

			var controlHTML = this.transformControlsInHtml (aControlHtml);

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
			this.insertHTMLWithContext (controlHTML, '', '', '',
				null, insertIn, destinationOffset, false);
			var newControl = this.getElementById (aControlId);

			this.selectElement (this.getElementById (aControlId));
			//this.repaintElement (newControl);
			//this.showResizers (this.getElementById (aControlId));
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
			var newDesignTimeHtml =
				this.transformControlsInHtml (aNewDesignTimeHtml);
			try {
				var oldControl =
					this.getDocument ().getElementById (aControlId);
				this.collapseBeforeInsertion ("start");
				this.selectElement (oldControl);
				this.insertHTML (newDesignTimeHtml);
			} catch (e) { }
			this.endBatch ();
			this.updateControlInTable(aControlId,
				this.getDocument ().getElementById (aControlId));
			if(DEBUG)
				dump ('End resize.');
			this.setInResize (false);
		}
	},

	// Control selection
	selectControl: function(aControlId, aAdd, aPrimary)
	{
		// TODO: talk to Michael about selecting controls. Why do we
		// need to have multiple controls selected and what is primary?
		
		this.clearSelection ();
		
		if (aControlId == '') {
			dump ("Deselecting all controls");
			return;
		}
		
		dump ("Selecting control "+aControlId);
		var controlRef = this.getControlTable ().getById(aControlId);
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
		   aElement.getAttribute ('md-can-resize') == 'true') {
			this.mNsIHtmlEditor.hideResizers ();
			this.mNsIHtmlEditor.showResizers (aElement);
		}
	},

	getSelection: function()
	{
		if(this.mNsIHtmlEditor)
			return this.mNsIHtmlEditor.selection;
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

	repaintSelection: function(aElementId)
	{
  this.getSelection ();
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
					dump ('ajacent can drop');
				this.mShell.repaintElement (oldElement);
				this.mShell.drawElementOutline (aElement);
				this.mDropInElement = aElement;
			}
			else {
				if(DEBUG)
					dump ('enter new can drop ' +
						oldElement + aElement);
				this.mDropInElement = aElement;
				this.mShell.drawElementOutline (aElement);
			}
			//if(DEBUG)
				//dump ('can drop in this ' + aElement.nodeName);
		}
	},

	repaintElement: function(aElementId)
	{
		var element = this.getElementById (aElementId);
		if(element && this.mWillFlash)
			this.mShell.repaintElement (element);
	},

	highlightOffCanDrop: function()
	{
		var restore = this.mDropInElement;
		if(restore) {
			this.mShell.repaintElement (restore);
			this.mDropInElement = null;
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
				object.getAttribute('id') + '>');
		}
		else {
			aEvent.stopPropagation ();
			aEvent.preventDefault ();
		}
	}
}

function dragOverControl(aEvent) {
	if(editor.getWillFlash () && aEvent.target.nodeType == 1) {
		var element = editor.getElementOrParentByAttribute (aEvent.target,
					'md-can-drop', 'true');
    
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

	// Controls are "-moz-user-select: none" by default. Here we switch to
	// "-moz-user-select: all" in preparation for insertFromDrop(). We
	// revert back to -moz-user-select: none later in DidInsertNode(),
	// which is the real end of a Drag&Drop operation
	//alert(aEvent.target.nodeName);
	editor.hideResizers ();
	var selectedControl = editor.getSelectedControl ();
	var controls = editor.getDocument ().getElementsByTagName (CONTROL_TAG_NAME);
	if(controls.length > 0) {
		var i = 0;
		while(controls [i]) {
			if(selectedControl != controls [i])
				editor.setSelectAll (controls [i]);
			i++;
		}
	}

	//TODO: Handle drags involving controls and cancell default
	//aEvent.stopPropagation ();
	//aEvent.preventDefault ();
	//editor.mNsIHtmlEditor.doDrag (aEvent);

	editor.setDragState (true);
		if(DEBUG)
			dump ('Begin drag.');
}

function handleDrop(aEvent) {
	//Nothing special here for now
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
		JSCallPlaceClrCall ('DebugStatement', '', new Array(aTxtAppend));
	}
}
