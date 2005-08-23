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
using Gtk;

namespace AspNetEdit.Editor.UI
{
	public class RootDesignerView : Gecko.WebControl
	{
		private CommandManager comm;
		private IDesignerHost host;
		private IComponentChangeService changeService;
		private ISelectionService selectionService;
		private IMenuCommandService menuService;
		private string mozPath;

		public RootDesignerView (IDesignerHost host)
			: base()
		{
			//it's through this that we communicate with JavaScript
			comm = new CommandManager (this);

			//we use the host to get services and designers
			this.host = host;
			if (host == null)
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
			changeService.ComponentAdded += new ComponentEventHandler (changeService_ComponentAdded);
			changeService.ComponentChanged += new ComponentChangedEventHandler (changeService_ComponentChanged);
			changeService.ComponentRemoved += new ComponentEventHandler (changeService_ComponentRemoved);
			selectionService.SelectionChanged += new EventHandler (selectionService_SelectionChanged);
	
			//Register incoming calls from JavaScript
			comm.RegisterJSHandler ("Click", new ClrCall (JSClick));

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

		}

		#region Change service handlers

		void selectionService_SelectionChanged (object sender, EventArgs e)
		{
			//TODO: selection
			//throw new NotImplementedException ();
		}

		void changeService_ComponentRemoved (object sender, ComponentEventArgs e)
		{
			//TODO: component removal
			//throw new NotImplementedException ();
		}

		void changeService_ComponentChanged (object sender, ComponentChangedEventArgs e)
		{
			//TODO: FIX!!!!
			System.IO.FileStream stream = new System.IO.FileStream(mozPath + "temp.html", System.IO.FileMode.Create);
			System.IO.StreamWriter w = new System.IO.StreamWriter(stream);
			

			string doc = ((DesignerHost)host).RootDocument.ViewDocument();
			w.Write(doc);
			w.Flush();
			stream.Close();
			
			base.LoadUrl(mozPath + "temp.html");
		}

		void changeService_ComponentAdded (object sender, ComponentEventArgs e)
		{
			//TODO: FIX!!!!
			System.IO.FileStream stream = new System.IO.FileStream (mozPath + "temp.html", System.IO.FileMode.Create);
			System.IO.StreamWriter w = new System.IO.StreamWriter (stream);

			string doc = ((DesignerHost)host).RootDocument.ViewDocument ();
			w.Write (doc);
			w.Flush ();
			stream.Close ();
			
			base.LoadUrl (mozPath + "temp.html");
		}

		#endregion

		#region JS handlers

		//JS call handler
		// Name:	Call
		// Arguments:	ClickType (single, double, right)
		//		Component (Asp Component ID, or empty if other)
		// Returns:	n/a
		private string JSClick (string[] args)
		{
			if (args.Length != 2)
				return string.Empty;

			//lookup our component
			IComponent component = null;
			if (args[1] != string.Empty)
				component = ((DesignContainer) host.Container).GetComponent (args[1]);

			//decide which action to perfom and use services to perfom it
			switch (args[0]) {
				case "single":
					selectionService.SetSelectedComponents (new IComponent[] {component});
					break;
				case "double":
					IDesigner designer = host.GetDesigner (component);

					if (designer != null)
						designer.DoDefaultAction ();
					break;
				case "right":
					//TODO: show context menu menuService.ShowContextMenu
					break;
			}

			return string.Empty;
		}

		#endregion

	}
}
