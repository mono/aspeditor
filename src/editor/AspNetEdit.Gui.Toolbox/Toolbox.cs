 /* 
 * Toolbox.cs - A toolbox widget
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
using Gtk;
using System.Collections;
using System.Drawing.Design;
using System.ComponentModel.Design;
using System.ComponentModel;
using AspNetEdit.Editor.ComponentModel;

namespace AspNetEdit.Gui.Toolbox
{
	public class Toolbox : VBox
	{
		private ServiceContainer parentServices;
		ToolboxService toolboxService;
		ToolboxStore store;
		NodeView nodeView;
		
		private ScrolledWindow scrolledWindow;
		private Toolbar toolbar;
		private ToggleToolButton filterToggleButton;
		private ToggleToolButton catToggleButton;
		private Entry filterEntry;
		
		public Toolbox(ServiceContainer parentServices)
		{			
			this.parentServices = parentServices;

			//we need this service, so create it if not present
			toolboxService = parentServices.GetService (typeof (IToolboxService)) as ToolboxService;
			if (toolboxService == null) {
				toolboxService = new ToolboxService ();
				parentServices.AddService (typeof (IToolboxService), toolboxService);
			}
			
			#region Toolbar
			toolbar = new Toolbar ();
			toolbar.ToolbarStyle = ToolbarStyle.Icons;
			toolbar.IconSize = IconSize.SmallToolbar;
			base.PackStart (toolbar, false, false, 0);
		
			filterToggleButton = new ToggleToolButton ();
			filterToggleButton.IconWidget = new Image (Stock.MissingImage, IconSize.SmallToolbar);
			filterToggleButton.Toggled += new EventHandler (toggleFiltering);
			toolbar.Insert (filterToggleButton, 0);
			
			catToggleButton = new ToggleToolButton ();
			catToggleButton.IconWidget = new Image (Stock.MissingImage, IconSize.SmallToolbar);
			catToggleButton.Toggled += new EventHandler (toggleCategorisation);
			toolbar.Insert (catToggleButton, 1);
			
			SeparatorToolItem sep = new SeparatorToolItem();
			toolbar.Insert (sep, 2);
			
			filterEntry = new Entry();
			filterEntry.WidthRequest = 150;
			filterEntry.Changed += new EventHandler (filterTextChanged);
			
			#endregion
			
			scrolledWindow = new ScrolledWindow ();
			base.PackEnd (scrolledWindow, true, true, 0);
			
						
			//Initialise model
			
			store = new ToolboxStore ();
			
			//initialise view
			nodeView = new NodeView (store);
			nodeView.Selection.Mode = SelectionMode.Single;
			nodeView.HeadersVisible = false;
			
			//cell renderers
			CellRendererPixbuf pixbufRenderer = new CellRendererPixbuf ();
			CellRendererText textRenderer = new CellRendererText ();
			textRenderer.Ellipsize = Pango.EllipsizeMode.End;
			
			//Main column with text, icons
			TreeViewColumn col = new TreeViewColumn ();
			
			col.PackStart (pixbufRenderer, false);
			col.SetAttributes (pixbufRenderer,
			                      "pixbuf", ToolboxStore.Columns.Icon,
			                      "visible", ToolboxStore.Columns.IconVisible,
			                      "cell-background-gdk", ToolboxStore.Columns.BackgroundColour);
			
			col.PackEnd (textRenderer, true);
			col.SetAttributes (textRenderer,
			                      "text", ToolboxStore.Columns.Label,
			                      "weight", ToolboxStore.Columns.FontWeight,
			                      "cell-background-gdk", ToolboxStore.Columns.BackgroundColour);
			
			nodeView.AppendColumn (col);
			
			//Initialise self
			scrolledWindow.VscrollbarPolicy = PolicyType.Automatic;
			scrolledWindow.HscrollbarPolicy = PolicyType.Never;
			scrolledWindow.WidthRequest = 150;
			scrolledWindow.AddWithViewport (nodeView);
			
			//selection events
			nodeView.NodeSelection.Changed += OnSelectionChanged;
			nodeView.RowActivated  += OnRowActivated;
			
			//update view when toolbox service updated
			toolboxService.ToolboxChanged += new EventHandler (tbsChanged);
			Refresh ();
			
			//set initial state
			filterToggleButton.Active = false;
			catToggleButton.Active = true;
		}
		
		private void tbsChanged (object sender, EventArgs e)
		{
			Refresh ();
		}
		
		#region Toolbar event handlers
		
		private void toggleFiltering (object sender, EventArgs e)
		{
			if (!filterToggleButton.Active && (base.Children.Length == 3)) {
				filterEntry.Text = "";
				base.Remove (filterEntry);
			}
			else if (base.Children.Length == 2) {
				base.PackStart (filterEntry, false, false, 4);
				filterEntry.Show ();
				filterEntry.GrabFocus ();
			}
			else throw new Exception ("Unexpected number of widgets");
		}
		
		private void toggleCategorisation (object sender, EventArgs e)
		{
			store.SetCategorised (catToggleButton.Active);
		}
		
		private void filterTextChanged (object sender, EventArgs e)
		{
			store.SetFilter (filterEntry.Text);
		}
		
		#endregion
		
		#region GUI population
		
		public void Refresh ()
		{
			Repopulate (true);
		}
		
		private void Repopulate	(bool categorised)
		{
			IDesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as IDesignerHost;
			IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
			if (toolboxService == null || host == null) return;
			
			store.Clear ();
			
			ToolboxItemCollection tools = toolboxService.GetToolboxItems (host);
			if (tools == null) return;
			
			ArrayList nodes = new ArrayList (tools.Count);
			
			foreach (ToolboxItem ti in tools) {
				nodes.Add (new ToolboxItemToolboxNode (ti));
			}
			
			store.SetNodes (nodes);
			
				
				
		/*	//get the services we need
			IDesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as IDesignerHost;
			IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
			if (toolboxService == null || host == null) return;
			
			treeStore.Clear ();
			
			ToolboxItemCollection tools;
			ToolboxItem[] toolsArr;
			
			if (categorised) {
				CategoryNameCollection catNames = toolboxService.CategoryNames;
				
				foreach (string name in catNames) {				
					tools = toolboxService.GetToolboxItems (name, host);
					toolsArr = new ToolboxItem [tools.Count];
					tools.CopyTo (toolsArr, 0);
					Array.Sort (toolsArr, new SortByName ());
					
					AddToStore (name, toolsArr);
				}
			}
			else {
				tools = toolboxService.GetToolboxItems (host);
				
				toolsArr = new ToolboxItem [tools.Count];
				tools.CopyTo (toolsArr, 0);
				Array.Sort (toolsArr, new SortByName ());
				
				AddToStore (toolsArr);
			}*/
		}
		
		#endregion
		
		#region Activation/selection handlers, drag'n'drop source, selection state
		
		private void OnSelectionChanged (object sender, EventArgs e) {
			
			ItemToolboxNode selected = nodeView.NodeSelection.SelectedNode as ItemToolboxNode;
			ToolboxItemToolboxNode tb = selected as ToolboxItemToolboxNode;
			
			if (tb != null) {
				//get the services
				DesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as DesignerHost;
				IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
				if (toolboxService == null || host == null)	return;
				
				//toolboxService.SetSelectedToolboxItem (tb.);
			}
		}
		
		private void OnRowActivated (object sender, RowActivatedArgs e)
		{
			ItemToolboxNode selected = nodeView.NodeSelection.SelectedNode as ItemToolboxNode;
			
			if (selected == null) return;
			
			//get the services
			DesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as DesignerHost;
			IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
			if (toolboxService == null || host == null)	return;
			
			//toolboxService.SetSelectedToolboxItem (item);
			selected.Activate (host);
			//toolboxService.SelectedToolboxItemUsed ();
		}	
		#endregion	
	}
}
