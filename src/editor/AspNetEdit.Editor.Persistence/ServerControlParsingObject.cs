/* 
* ServerControlParsingObject.cs - A ParsingObject for server controls
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
using System.Collections;
using System.Text;
using System.ComponentModel;
using System.Web.UI;
using System.Web.UI.Design;
using System.ComponentModel.Design;
using System.Globalization;

namespace AspNetEdit.Editor.Persistence
{
	internal class ServerObjectParsingObject : ParsingObject
	{
		private const string controlSubstitute = "<aspcontrol name=\"{0}\" />";
		private object obj;
		ParseChildrenAttribute parseAtt;
		PropertyDescriptorCollection pdc;
		private ParseChildrenMode mode;
		private string innerText = String.Empty;

		public ServerObjectParsingObject(Type type, Hashtable attributes, string tagid, ParsingObject parent)
			: base (tagid, parent)
		{
			//create the object
			obj = Activator.CreateInstance (type);

			//and populate it from the attributes
			pdc = TypeDescriptor.GetProperties (obj);
			foreach (DictionaryEntry de in attributes) {
				if (0 == string.Compare((string)de.Key, "runat"))
					continue;
				//use the dash subproperty syntax
				string[] str = ((string)de.Key).Split ('-');
				PropertyDescriptor pd = pdc.Find (str[0], true);

				//if property not found, try events
				if (str.Length == 1 && pd == null && CultureInfo.InvariantCulture.CompareInfo.IsPrefix (str[0], "On")) {
					IEventBindingService iebs = (IEventBindingService) DesignerHost.GetService (typeof (IEventBindingService));
					if (iebs == null)
						throw new Exception ("Could not obtain IEventBindingService from host");

					EventDescriptorCollection edc = TypeDescriptor.GetEvents (obj);
					EventDescriptor e = edc.Find (str[0].Remove(0,2), true);
					if (e != null)
						pd = iebs.GetEventProperty(e);
					else
						throw new Exception ("Could not find event " + str[0].Remove(0,2));
				}

				object loopObj = obj;
				
				for (int i = 0; i < str.Length; i++ )
				{
					if (pd == null)
						throw new Exception ("Could not find property " + (string)de.Key);

					if (i == str.Length - 1) {
						pd.SetValue (obj, pd.Converter.ConvertFromString ((string) de.Value));
						break;
					}

					loopObj = pd.GetValue (loopObj);
					pd = TypeDescriptor.GetProperties (loopObj).Find (str[0], true);
					
				}
			}

			parseAtt = TypeDescriptor.GetAttributes (obj)[typeof(ParseChildrenAttribute )] as ParseChildrenAttribute;
			if (parseAtt == null)
				parseAtt = ParseChildrenAttribute.Default;
			Console.WriteLine(tagid);
			//FIXME: fix this in MCS
			if (string.Empty.Equals (parseAtt.DefaultProperty))
				parseAtt.DefaultProperty = null;

			//work out how we're trying to parse the children
			if (parseAtt.DefaultProperty != null) {
				Console.WriteLine(parseAtt.DefaultProperty.ToString());
				PropertyDescriptor pd = pdc[parseAtt.DefaultProperty];
				if (pd == null)
					throw new Exception ("Default property does not exist");
				if (pd.PropertyType.GetInterface("System.Collections.IList") == (typeof(IList)))
					mode = ParseChildrenMode.DefaultCollectionProperty;
				else
					mode = ParseChildrenMode.DefaultProperty;
			}
			else if (parseAtt.ChildrenAsProperties)
				mode = ParseChildrenMode.Properties;
			else
				mode = ParseChildrenMode.Controls;
		}

		public override void AddText (string text)
		{
			switch (mode) {
				case ParseChildrenMode.Controls:
					this.AddControl (new LiteralControl (text));
					return;
				case ParseChildrenMode.DefaultCollectionProperty:
				case ParseChildrenMode.Properties:
					if (IsWhiteSpace(text))
						return;
					else
						throw new Exception ("Unexpected text found in child properties");
				case ParseChildrenMode.DefaultProperty:
					innerText += text;
					return;
			}
		}

		private bool IsWhiteSpace(string s)
		{
			bool onlyWhitespace = true;
			foreach (char c in s)
				if (!Char.IsWhiteSpace (c)) {
					onlyWhitespace = false;
					break;
				}
			return onlyWhitespace;
		}

		public override ParsingObject CloseObject (string closingTagText)
		{
			//we do this here in case we have tags inside
			if (mode == ParseChildrenMode.DefaultProperty) {
				PropertyDescriptor pd = pdc[parseAtt.DefaultProperty];
				pd.SetValue(obj, pd.Converter.ConvertFromString(innerText));
			}
			//FIME: what if it isn't?
			if (obj is Control)
				base.AddText ( String.Format (controlSubstitute, ((Control)obj).ID));
			base.AddControl (obj);
			return base.CloseObject (closingTagText);
		}

		public override ParsingObject CreateChildParsingObject (ILocation location, string tagid, TagAttributes attributes)
		{
			
			switch (mode) {
				case ParseChildrenMode.DefaultProperty:
					//oops, we didn't need to parse this.
					innerText += location.PlainText;
					//how do we get end tag?
					throw new NotImplementedException();
				case ParseChildrenMode.Controls:
					//html tags
					if (tagid.IndexOf(':') == -1)
						return new HtmlParsingObject (location.PlainText, tagid, this);
					goto case ParseChildrenMode.DefaultCollectionProperty;
				case ParseChildrenMode.DefaultCollectionProperty:
					string[] str = tagid.Split(':');
					if (str.Length != 2)
						throw new ParseException (location, "Server tag name is not of form prefix:name");

					Type tagType = WebFormReferenceManager.GetObjectType(str[0], str[1]);
					if (tagType == null)
						throw new ParseException(location, "The tag " + tagid + "has not been registered");

					return new ServerObjectParsingObject (tagType, attributes.GetDictionary(null), tagid, this);
				case ParseChildrenMode.Properties:
					throw new NotImplementedException ();
			}
			throw new NotImplementedException();
		}

		protected override void AddControl(object control)
		{
			switch (mode) {
				case ParseChildrenMode.DefaultProperty:
				case ParseChildrenMode.Properties:
					throw new Exception ("Cannot add a control to default property");
				case ParseChildrenMode.DefaultCollectionProperty:
					PropertyDescriptor pd = pdc[parseAtt.DefaultProperty];
					((IList)pd.GetValue(obj)).Add(control);
					return;
				case ParseChildrenMode.Controls:
					throw new NotImplementedException();					
			}
		}
	}

	public enum ParseChildrenMode
	{
		DefaultProperty,
		DefaultCollectionProperty,
		Properties,
		Controls
	}
}
