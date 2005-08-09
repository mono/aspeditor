 /* 
 * ToolboxItemBox.cs - Gtk widget representing a toolbox item
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
using System.Drawing.Design;

namespace AspNetEdit.Editor.UI
{
	internal class ToolboxItemBox : EventBox
	{
		private ToolboxItem item;
		Image image;

		public ToolboxItemBox (ToolboxItem item)
		{
			this.item = item;

			//create all the widgets we need to display this item
			Gtk.Label lab = new Label ();
			lab.Text = item.DisplayName;
			lab.Xalign = 0;
			lab.Xpad = 3;

			//TODO: load image from ToolboxItem's bitmap (need to implement that too!)
			image = new Image (Stock.MissingImage, IconSize.SmallToolbar);

			HBox hbox = new HBox ();
			hbox.PackStart (image, false, false, 2);
			hbox.PackEnd (lab, true, true, 2);

			base.Add (hbox);
		}

		public ToolboxItem ToolboxItem {
			get { return item; }
			set { item = value; }
		}

		public void Select ()
		{
			base.ModifyBg (StateType.Normal, base.Style.Background (StateType.Selected));
			base.ModifyFg (StateType.Normal, base.Style.Foreground (StateType.Selected));
		}

		public void Deselect ()
		{
			base.ModifyBg (StateType.Normal, Parent.Style.Background (StateType.Normal));
			base.ModifyFg (StateType.Normal, Parent.Style.Foreground (StateType.Normal));
		}

		public Image Image {
			get { return image; }
		}
	}
}
