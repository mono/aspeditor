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

namespace AspNetEdit.Editor.UI
{
	public class Toolbox : ScrolledWindow
	{
		private ServiceContainer parentServices;
		Hashtable expanders = new Hashtable ();
		private VBox vbox;
		IToolboxService toolboxService;


		public Toolbox(ServiceContainer parentServices)
		{
			this.parentServices = parentServices;

			//we need this service, so create it if not present
			toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
			if (toolboxService == null) {
				toolboxService = new AspNetEdit.Editor.ComponentModel.ToolboxService ();
				parentServices.AddService (typeof (IToolboxService), toolboxService);
			}

			base.VscrollbarPolicy = PolicyType.Automatic;
			base.HscrollbarPolicy = PolicyType.Automatic;
			base.WidthRequest = 150;

			vbox = new VBox ();
			base.AddWithViewport (vbox);
		}
		

		#region GUI population

		public void UpdateCategories ()
		{
			//get the services we need
			IDesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as IDesignerHost;
			IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
			if (toolboxService == null || host == null) {
				expanders.Clear ();
				return;
			}

			CategoryNameCollection catNames = toolboxService.CategoryNames;

			//clear out old categories
			foreach (string name in expanders.Keys)
			{
				if (!catNames.Contains (name))
					expanders.Remove (name);
				vbox.Remove ((Expander) (expanders[name]));
			}

			//create expanders for new ones
			foreach (string name in catNames) {
				if (!expanders.ContainsKey (name))
				{
					Expander exp = new Expander ("<b>"+name+"</b>");
					((Label) exp.LabelWidget).UseMarkup = true;
					exp.Expanded = false;
					exp.Add (new VBox());
					expanders[name] = exp;
				}
			}

			//repopulate all of the categories
			foreach (string name in expanders.Keys)
			{
				vbox.PackStart ((Expander) (expanders[name]), false, false, 0);
				ResetCategory (name);
			}

			EventBox bottomWidget = new EventBox ();
			bottomWidget.CanFocus = true;
			vbox.PackEnd (bottomWidget, true, true, 0);
		}
		public void ResetCategory (string category)
		{
			if (!expanders.ContainsKey(category))
				return;

			//get the services we need
			IDesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as IDesignerHost;
			if (host == null) {
				expanders.Clear ();
				return;
			}

			//get the items and add them all
			ToolboxItemCollection tools = toolboxService.GetToolboxItems (category, host);
			foreach (ToolboxItem item in tools) {
				ToolboxItemBox itemBox = new ToolboxItemBox (item);
				itemBox.ButtonReleaseEvent += new ButtonReleaseEventHandler (itemBox_ButtonReleaseEvent);
				itemBox.ButtonPressEvent += new ButtonPressEventHandler (itemBox_ButtonPressEvent);
				itemBox.MotionNotifyEvent += new MotionNotifyEventHandler (itemBox_MotionNotifyEvent);
				((VBox) ((Expander) (expanders[category])).Child).PackEnd (itemBox);
			}
		}

		#endregion

		#region Click handlers, drag'n'drop source, selection state

		public const string DragDropIdentifier = "aspnetedit_toolbox_item";
		private const double DragSensitivity = 1;

		private ToolboxItemBox selectedBox;

		uint lastClickTime = 0;
		bool dndPrimed;
		double dndX, dndY;

		void itemBox_ButtonPressEvent (object o, ButtonPressEventArgs args)
		{
			if (args.Event.Type != Gdk.EventType.ButtonPress)
				return;

			//TODO: context menu for manipulation of items
			if (args.Event.Button != 1)
				return;

			ToolboxItem item = ((ToolboxItemBox) o).ToolboxItem;

			//get the services
			IDesignerHost host = parentServices.GetService (typeof (IDesignerHost)) as IDesignerHost;
			IToolboxService toolboxService = parentServices.GetService (typeof (IToolboxService)) as IToolboxService;
			if (toolboxService == null || host == null)
				return;

			if (selectedBox == (ToolboxItemBox) o) {
				//check for doubleclick and create an item
				if (toolboxService.GetSelectedToolboxItem (host) == item) {
					if (args.Event.Time - lastClickTime <= Settings.DoubleClickTime) {
						item.CreateComponents (host);
						toolboxService.SelectedToolboxItemUsed ();
						return;
					}
				}
			}
			else {
				//select item
				if (selectedBox != null) {
					selectedBox.DragDataGet -= selectedBox_DragDataGet;
					selectedBox.Deselect ();
				}

				selectedBox = (ToolboxItemBox)o;
				selectedBox.Select ();
				selectedBox.DragDataGet += new DragDataGetHandler (selectedBox_DragDataGet);
				toolboxService.SetSelectedToolboxItem (item);
			}

			lastClickTime = args.Event.Time;
			dndPrimed = true;
			dndX = args.Event.X;
			dndY = args.Event.Y;
		}

		void selectedBox_DragDataGet (object o, DragDataGetArgs args)
		{
			ToolboxItemBox itemBox = (ToolboxItemBox) o;
			
			args.SelectionData.Text = (string) toolboxService.SerializeToolboxItem (itemBox.ToolboxItem);
		}

		void itemBox_ButtonReleaseEvent (object sender, ButtonReleaseEventArgs args)
		{
			dndPrimed = false;
		}

		void itemBox_MotionNotifyEvent (object o, MotionNotifyEventArgs args)
		{
			if (!dndPrimed 
				|| Math.Abs (args.Event.X - dndX) < DragSensitivity 
				|| Math.Abs (args.Event.Y - dndY) < DragSensitivity)
				return;

			ToolboxItemBox itemBox = (ToolboxItemBox) o;

			TargetEntry te = new TargetEntry (DragDropIdentifier, TargetFlags.App, 0);
			TargetList tl = new TargetList (new TargetEntry[] { te } );
			
			Gdk.DragContext context = Drag.Begin (itemBox,  tl, Gdk.DragAction.Copy, 1, args.Event);

			Image im = itemBox.Image;
			switch (im.StorageType)
			{
				case ImageType.Stock:
					Drag.SetIconStock (context, im.Stock, 0, 0);
					break;
				case ImageType.Pixmap:
					Drag.SetIconPixmap (context, im.Colormap, im.Pixmap, im.Mask, 0, 0);
					break;
				case ImageType.Pixbuf:
					Drag.SetIconStock (context, im.Stock, 0, 0);
					break;
			}
			
			
			Console.WriteLine (toolboxService.SerializeToolboxItem (itemBox.ToolboxItem).ToString ());;
		}

		#endregion
	}
}
