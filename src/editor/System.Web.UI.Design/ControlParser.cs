//
// System.Web.UI.Design.ControlParser
//
// Authors:
//      Gert Driesen (drieseng@users.sourceforge.net)
//	Michael Hutchinson <m.j.hutchinson@dur.ac.uk>
//
// (C) 2004 Novell
//

//
// Permission is hereby granted, free of charge, to any person obtaining
// a copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to
// permit persons to whom the Software is furnished to do so, subject to
// the following conditions:
// 
// The above copyright notice and this permission notice shall be
// included in all copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
// EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
// NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
// LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

using System.ComponentModel.Design;
using System.Web.UI;

namespace System.Web.UI.Design
{
	public sealed class ControlParser
	{
		private ControlParser ()
		{
		}

		public static Control ParseControl (IDesignerHost designerHost, string controlText)
		{
			DesignTimeParseData data = new DesignTimeParseData (designerHost, controlText);
			return DesignTimeTemplateParser.ParseControl (data);
		}

		public static Control ParseControl (IDesignerHost designerHost, string controlText, string directives)
		{

			DesignTimeParseData data = new DesignTimeParseData (designerHost, directives + " " + controlText);
			return DesignTimeTemplateParser.ParseControl (data);
		}

		public static ITemplate ParseTemplate (IDesignerHost designerHost, string templateText)
		{
			DesignTimeParseData data = new DesignTimeParseData (designerHost, templateText);
			return DesignTimeTemplateParser.ParseTemplate (data);
		}

		public static ITemplate ParseTemplate (IDesignerHost designerHost, string templateText, string directives)
		{
			DesignTimeParseData data = new DesignTimeParseData (designerHost, directives + " " + templateText);
			return DesignTimeTemplateParser.ParseTemplate (data);
		}
	}
}
