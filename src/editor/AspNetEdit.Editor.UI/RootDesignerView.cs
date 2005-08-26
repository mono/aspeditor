 /* 
 * RootDesignerView.cs - The Gecko# design surface returned by the WebForms Root Designer.
 * 			
 * Authors: 
 *  Michael Hutchinson <m.j.hutchinson@gmail.com>
 *  
 * Copyright (C) 2005 Michael Hutchinson
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

using System;
using AspNetEdit.JSCall;
using System.ComponentModel.Design;
using System.ComponentModel;
using System.Text;
using AspNetEdit.Editor.ComponentModel;
using System.Web.UI;
using System.Collections;
using Gtk;

namespace AspNetEdit.Editor.UI
{
	public class RootDesignerView : Gecko.WebControl
	{
		private const string geckoChrome = "chrome://aspdesigner/content/aspdesigner.xul"; 
		private CommandManager comm;
		private DesignerHost host;
		private IComponentChangeService changeService;
		private ISelectionService selectionService;
		private IMenuCommandService menuService;
		private bool active = false;
		private string mozPath;

		public RootDesignerView (IDesignerHost host)
			: base()
		{
			//it's through this that we communicate with JavaScript
			comm = new CommandManager (this);

			//we use the host to get services and designers
			this.host =  host as DesignerHost;
			if (this.host == null)
				throw new ArgumentNullException ("host");

			//We use this to monitor component changes and update as necessary
			changeService = host.GetService (typeof (IComponentChangeService)) as IComponentChangeService;
			if (changeService == null)
				throw new Exception ("Could not obtain IComponentChangeService from host");

			//We use this to monitor and set selections
			selectionService = host.GetService (typeof (ISelectionService)) as ISelectionService;
			if (selectionService == null)
				throw new Exception ("Could not obtain ISelectionService from host");

			//This is used to add undo/redo, cut/paste etc commands to menu
			//Also to launch right-click menu
			menuService = host.GetService (typeof (IMenuCommandService)) as IMenuCommandService;
			//if (menuService == null)
			//	return;

			//Now we've got all services, register our events
			changeService.ComponentChanged += new ComponentChangedEventHandler (changeService_ComponentChanged);
			selectionService.SelectionChanged += new EventHandler (selectionService_SelectionChanged);
	
			//Register incoming calls from JavaScript
			comm.RegisterJSHandler ("Click", new ClrCall (JSClick));
			comm.RegisterJSHandler ("SavePage", new ClrCall (JSSave));
			comm.RegisterJSHandler ("Activate", new ClrCall (JSActivate));
			comm.RegisterJSHandler ("ThrowException", new ClrCall (JSException));
			comm.RegisterJSHandler ("DebugStatement", new ClrCall (JSDebugStatement));
			comm.RegisterJSHandler ("ResizeControl", new ClrCall (JSResize));

			//Find our Mozilla JS and XUL files and load them
			//TODO: use resources for Mozilla JS and XUL files
			mozPath = System.Reflection.Assembly.GetAssembly (typeof(RootDesignerView)).Location;
			mozPath = mozPath.Substring(0, mozPath.LastIndexOf (System.IO.Path.DirectorySeparatorChar))
				+ System.IO.Path.DirectorySeparatorChar + "Mozilla" + System.IO.Path.DirectorySeparatorChar;
			
			//TODO: Gecko seems to be taking over DND
			//register for drag+drop
			//TargetEntry te = new TargetEntry(Toolbox.DragDropIdentifier, TargetFlags.App, 0);
			//Drag.DestSet (this, DestDefaults.All, new TargetEntry[] { te }, Gdk.DragAction.Copy);
			//this.DragDataReceived += new DragDataReceivedHandler(view_DragDataReceived);
			base.LoadUrl (geckoChrome);
		}

		#region Change service handlers

		void selectionService_SelectionChanged (object sender, EventArgs e)
		{
			if (!active) return;
			
			//deselect all
			comm.JSCall (GeckoFunctions.SelectControl, null, string.Empty);
			if (selectionService.SelectionCount == 0) return;
			
			ICollection selections = selectionService.GetSelectedComponents ();		
			
			foreach (IComponent comp in selections) {
				if (comp is WebFormPage) continue;
				Control control = comp as Control;
				if (control == null)
					throw new InvalidOperationException ("One of the selected components is not a System.Web.UI.Control.");
				//select the control
				comm.JSCall (GeckoFunctions.SelectControl, null, control.UniqueID);
			}
		}

		void changeService_ComponentChanged (object sender, ComponentChangedEventArgs e)
		{
			if (!active) return;
			
			Control control = e.Component as Control;
			if (control == null)
				throw new InvalidOperationException ("The changed component is not a System.UI.WebControl");
			
			string ctext = Document.RenderDesignerControl (control);
			comm.JSCall (GeckoFunctions.UpdateControl, null, control.UniqueID, ctext);
		}
		
		#endregion
		
		#region document modification accessors for AspNetEdit.Editor.ComponentModel.Document
		
		internal void AddControl(Control control)
		{
			if (!active) return;
			
			string ctext = Document.RenderDesignerControl (control);
			comm.JSCall (GeckoFunctions.AddControl, null, control.UniqueID, ctext);
		}

		internal void RemoveControl(Control control)
		{
			if (!active) return;
			
			comm.JSCall (GeckoFunctions.RemoveControl, null, control.UniqueID);
		}
		
		internal void RenameControl(string oldName, string newName)
		{
			throw new NotImplementedException ();
		}
		
		#endregion

		#region Inbound Gecko functions
		
		//this is because of the Gecko# not wanting to give up its DomDocument until it's been shown.
		///<summary>
		/// Name:	Activate
		///			Called when the XUL document is all loaded and ready to recieve ASP.NET document
		/// Arguments:	none
		/// Returns:	none
		///</summary>
		private string JSActivate (string[] args)
		{
			//load document with filled-in design-time HTML
			comm.JSCall (GeckoFunctions.LoadPage, null, host.RootDocument.ViewDocument ());
			active = true;
			return string.Empty;
		}

		///<summary>
		/// Name:	Click
		///			Called when the docucument is clicked
		/// Arguments:
		///		enum ClickType: The button used to click (Single|Double|Right)
		///		string Component:	The unique ID if a Control, else empty
		/// Returns:	none
		///</summary>
		private string JSClick (string[] args)
		{
			if (args.Length != 2)
				throw new InvalidJSArgumentException ("Click", -1);
			
			//look up our component
			IComponent[] components = null;
			if (args[1].Length != 0)
				components = new IComponent[] {((DesignContainer) host.Container).GetComponent (args[1])};

			//decide which action to perfom and use services to perfom it
			switch (args[0]) {
				case "Single":
					selectionService.SetSelectedComponents (components);
					break;
				case "Double":
					//TODO: what happen when we double-click on the page?
					if (args[1].Length == 0) break;
					
					IDesigner designer = host.GetDesigner (components[0]);

					if (designer != null)
						designer.DoDefaultAction ();
					break;
				case "Right":
					//TODO: show context menu menuService.ShowContextMenu
					break;
				default:
					throw new InvalidJSArgumentException("Click", 0);
			}

			return string.Empty;
		}
		
		///<summary>
		/// Name:	SavePage
		///			Callback function for when host initiates document save
		/// Arguments:
		///		string document:	the document text, with placeholder'd controls
		/// Returns:	none
		///</summary>
		private string JSSave (string[] args)
		{
			if (args.Length != 1)
				throw new InvalidJSArgumentException ("SavePage", -1);
			
			throw new NotImplementedException (args[0]);

			return string.Empty;
		}
		
		///<summary>
		/// Name:	ThrowException
		///			Throws managed exceptions on behalf of Javascript
		/// Arguments:
		///		string location:	some description of where the error occurred
		///		string message:		the exception's message
		/// Returns:	none
		///</summary>
		private string JSException (string[] args)
		{
			if (args.Length != 2)
				throw new InvalidJSArgumentException ("ThrowException", -1);
			
			throw new Exception (string.Format ("Error in javascript at {0}:\n{1}", args[0], args[1]));
		}

		///<summary>
		/// Name:	DebugStatement
		///			Writes to the console on behalf of Javascript
		/// Arguments:
		///		string message:	the debug message
		/// Returns:	none
		///</summary>
		private string JSDebugStatement (string[] args)
		{
			if (args.Length != 1)
				throw new InvalidJSArgumentException ("ThrowException", -1);
			
			Console.WriteLine ("Javascript: " + args[0]);
			return string.Empty;
		}
		
		///<summary>
		/// Name:	ResizeControl
		///			Writes to the console on behalf of Javascript
		/// Arguments:
		///		string id:	the control's ID
		///		string width:	the control's width
		///		string height:	the control's height
		/// Returns:	none
		///</summary>
		private string JSResize (string[] args)
		{
			if (args.Length != 3)
				throw new InvalidJSArgumentException ("ResizeControl", -1);
				
			//look up our component
			IComponent component = ((DesignContainer) host.Container).GetComponent (args[0]);
			System.Web.UI.WebControls.WebControl wc = component as System.Web.UI.WebControls.WebControl;
			if (wc == null)
				throw new InvalidJSArgumentException ("ResizeControl", 0);
			
			PropertyDescriptorCollection pdc = TypeDescriptor.GetProperties (wc);
			PropertyDescriptor pdc_h = pdc.Find("Height", false);
			PropertyDescriptor pdc_w = pdc.Find("Width", false);
			
			//set the values
			pdc_w.SetValue (wc, pdc_w.Converter.ConvertFromInvariantString(args[1]));
			pdc_h.SetValue (wc, pdc_h.Converter.ConvertFromInvariantString(args[2]));

			return string.Empty;
		}

		#endregion
		
		#region Outbound Gecko functions
		
		public class GeckoFunctions
		{
			///<summary>
			/// Add a control to the document
			/// Args:
			/// 	string id:		the unique ID of the control.
			/// 	string content:	The HTML content of the control
			/// Returns: none
			///</summary>
			public static readonly string AddControl = "AddControl";
			
			///<summary>
			/// Updates the design-time HTML of a control to the document
			/// Args:
			/// 	string id:		the unique ID of the control.
			/// 	string content:	The HTML content of the control
			/// Returns: none
			///</summary>
			public static readonly string UpdateControl = "UpdateControl";

			///<summary>
			/// Removes a control from the document
			/// Args:
			/// 	string id:		the unique ID of the control.
			/// Returns: none
			///</summary>
			public static readonly string RemoveControl = "RemoveControl";
			
			///<summary>
			/// Selects a control
			/// Args:
			/// 	string id:		the unique ID of the control, or empty to clear selection.
			/// Returns: none
			///</summary>
			public static readonly string SelectControl = "SelectControl";
			
			///<summary>
			/// Replaces the currently loaded document
			/// Args:
			/// 	string document:	the document text, with placeholder'd controls.
			/// Returns: none
			///</summary>
			public static readonly string LoadPage = "LoadPage";
			
			///<summary>
			/// Replaces the currently loaded document
			/// Args: none
			/// Returns: none
			///</summary>
			public static readonly string GetPage = "GetPage";
		}
		
		#endregion
	}
}
