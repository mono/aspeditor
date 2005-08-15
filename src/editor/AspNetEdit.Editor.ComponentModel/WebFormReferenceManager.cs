 /* 
 * WebFormReferenceManager.cs - tracks references in a WebForm page
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
using System.Web.UI.Design;

namespace AspNetEdit.Editor.ComponentModel
{
	public class WebFormReferenceManager : IWebFormReferenceManager
	{
		#region IWebFormReferenceManager Members

		public Type GetObjectType(string tagPrefix, string typeName)
		{
			throw new NotImplementedException ();
		}

		public string GetRegisterDirectives ()
		{
			throw new NotImplementedException ();
		}

		public string GetTagPrefix (Type objectType)
		{
			return "asp";
		}

		#endregion
		/*
		public string RegisterTagPrefix (Type objectType)
		{
		}
		
		public string GetUserControlPath (string tagPrefix, string tagName)
		{
		}
		
		public Type GetType(string tagPrefix, string tagName)
		{
		}
		*/
	}
}
