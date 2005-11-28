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

namespace AspNetEdit.Editor.UI
{
	public class Toolbox : ScrolledWindow
	{
		private ServiceContainer parentServices;
		ToolboxService toolboxService;
		TreeStore treeStore;
		TreeView treeView;
		
		public Toolbox(ServiceContainer parentServices)
		{
			this.parentServices = parentServices;

			//we need this service, so create it if not present
			toolboxService = parentServices.GetService (typeof (IToolboxService)) as ToolboxService;
			if (toolboxService == null) {
				toolboxService = new ToolboxService ();
				parentServices.AddService (typeof (IToolboxService), toolboxService);
			}
						
			//Initialise model
			treeStore = new TreeStore (	typeof (ToolboxItem),	//the item
										typeof (Gdk.Pixbuf),	//its icon
										typeof (string),		//the name label
										typeof (int),			//weight, to highlight categories
										typeof (Gdk.Color),		//bgcolor, to highlight categories
										typeof (bool),			//visible, to hide icons for categories
										typeof (bool));			//expandable, to hide expander
										

			
			//initialise view
			treeView = new TreeView (treeStore);
			treeView.Selection.Mode = SelectionMode.Single;
			treeView.HeadersVisible = false;
			
			//cell renderers
			CellRendererPixbuf pixbufRenderer = new CellRendererPixbuf ();
			CellRendererText textRenderer = new CellRendererText ();
			textRenderer.Ellipsize = Pango.EllipsizeMode.End;
			
			//Main column with text, icons
			TreeViewColumn col = new TreeViewColumn ();
			
			col.PackStart (pixbufRenderer, false);
			col.SetAttributes (pixbufRenderer, "pixbuf", 1, "visible", 5, "cell-background-gdk", 4);
			
			col.PackEnd (textRenderer, true);
			col.SetAttributes (textRenderer, "text", 2, "weight", 3, "cell-background-gdk", 4);
			
			treeView.AppendColumn (col);
			
			//Initialise self
			base.VscrollbarPolicy = PolicyType.Automatic;
			base.HscrollbarPolicy = PolicyType.Never;
			base.WidthRequest = 150;
			base.AddWithViewport (treeView);
			
			//events
			treeView.Selection.Changed += OnSelectionChanged;
			treeView.RowActivated  += OnRowActivated;
			
			//update view when toolbox service updated
			toolboxService.ToolboxChanged += new EventHandler (tbsChanged);
			//toolboxService
			Refresh ();
		}
		
		private void tbsChanged (object sender, EventArgs e)
		{
			Refresh ();
		}
		
		#region GUI population
		
		public void Refresh ()
		{
			Repopulate (true);
		}
		
		private void Repopulate	(bool categorised)
		{
			//get the services we need
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
			}
		}
		
		private void AddToStore (ToolboxItem[] items)
		{
			foreach (ToolboxItem item in items) {
				Gdk.Pixbuf icon = (item.Bitmap == null)?
					this.RenderIcon (Stock.MissingImage, IconSize.SmallToolbar, string.Empty)
					:ImageToPixbuf (item.Bitmap);
					
				treeStore.AppendValues (item, icon, "Hello" , 400, base.Style.Base (Gtk.StateType.Normal), true, false);
			}
		}
		
		private void AddToStore (string category, ToolboxItem[] items)
		{
			TreeIter parent = treeStore.AppendValues (null, null, category, 600, base.Style.Base (Gtk.StateType.Insensitive), false, true);
			
			foreach (ToolboxItem item in items) {
				Gdk.Pixbuf icon = (item.Bitmap == null)?
					this.RenderIcon (Stock.MissingImage, IconSize.SmallToolbar, string.Empty)
					:ImageToPixbuf (item.Bitmap);
				
				
				
				treeStore.AppendValues (parent, item, icon, item.DisplayName, 400, base.Style.Base (Gtk.StateType.Normal), true, false);
			}
		}
				
		private class SortByName : IComparer
		{
			public int Compare (object x, object y)
			{
				return ((ToolboxItem) y).DisplayName.CompareTo (((ToolboxItem) x).DisplayName);
			}
		}
		
		private Gdk.Pixbuf ImageToPixbuf (System.Drawing.Image image)
		{
			using (System.IO.MemoryStream stream = new System.IO.MemoryStream ()) {
				image.Save (stream, System.Drawing.Imaging.ImageFormat.Tiff);
				stream.Position = 0;
				return new Gdk.Pixbuf (stream);
			}
		}
		
		#endregion
		
		#region Click handlers, drag'n'drop source, selection state
		
		private void OnSelectionChanged (object sender, EventArgs e) {
			TreeModel model;
			TreeIter iter;
			
			if (treeView.Selection.GetSelected (out model, out iter)) {
				ToolboxItem item = (ToolboxItem) model.GetValue (iter, 0);
				
				//if (item == null) return; //is category
				
				//get the services
				DesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as DesignerHost;
				IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
				if (toolboxService == null || host == null)	return;
				
				toolboxService.SetSelectedToolboxItem (item);
			}
		}
		
		private void OnRowActivated (object sender, RowActivatedArgs e) {
			TreeModel model;
			TreeIter iter;
			
			if (treeView.Selection.GetSelected (out model, out iter)) {
				ToolboxItem item = (ToolboxItem) model.GetValue (iter, 0);
				
				//get the services
				DesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as DesignerHost;
				IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
				if (toolboxService == null || host == null)	return;
				
				toolboxService.SetSelectedToolboxItem (item);
				
				if (item == null) return; //is category
				
				//web controls have sample HTML that need to be deserialised
				//TODO: Fix WebControlToolboxItem so we don't have to mess around with type lookups and attributes here					
				if (item.AssemblyName != null && item.TypeName != null) {
					//look up and register the type
					ITypeResolutionService typeRes = host.GetService(typeof(ITypeResolutionService)) as ITypeResolutionService;
					if (typeRes == null)
						throw new Exception("Host does not provide an ITypeResolutionService");
					
					typeRes.ReferenceAssembly (item.AssemblyName);					
					Type controlType = typeRes.GetType (item.TypeName, true);
					
					//read the WebControlToolboxItem data from the attribute
					AttributeCollection atts = TypeDescriptor.GetAttributes (controlType);
					System.Web.UI.ToolboxDataAttribute tda = (System.Web.UI.ToolboxDataAttribute) atts[typeof(System.Web.UI.ToolboxDataAttribute)];
					
					//if it's present
					if (tda != null && tda.Data.Length > 0) {
						//look up the tag's prefix and insert it into the data						
						System.Web.UI.Design.IWebFormReferenceManager webRef = host.GetService (typeof (System.Web.UI.Design.IWebFormReferenceManager)) as System.Web.UI.Design.IWebFormReferenceManager;
						if (webRef == null)
							throw new Exception("Host does not provide an IWebFormReferenceManager");
						string aspText = String.Format (tda.Data, webRef.GetTagPrefix (controlType));
						System.Diagnostics.Trace.WriteLine ("Toolbox processing ASP.NET item data: " + aspText);
							
						//and add it to the document
						host.RootDocument.DeserializeAndAdd (aspText);
						toolboxService.SelectedToolboxItemUsed ();
						return;
					}
				}
				
				//No ToolboxDataAttribute? Get the ToolboxItem to create the components itself
				item.CreateComponents (host);
				
				toolboxService.SelectedToolboxItemUsed (); 
			}
		}	
		#endregion	
	}
}
