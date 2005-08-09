 /* 
 * TypeResolutionService.cs - resolves types in referenced assemblies
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
using System.ComponentModel.Design;
using System.Reflection;

namespace AspNetEdit.Editor.ComponentModel
{
	public class TypeResolutionService : ITypeResolutionService
	{
		#region ITypeResolutionService Members

		public TypeResolutionService ()
		{
		}
		
		public Assembly GetAssembly (AssemblyName name, bool throwOnError)
		{
			Assembly assembly = GetAssembly (name);

			if (assembly == null)
				throw new Exception ("The assembly could not be found");

			return assembly;
		}

		//TODO: make this work properly!
		//for now, special-casing for System.Web
		public Assembly GetAssembly (AssemblyName name)
		{
			Assembly web = typeof (System.Web.UI.Control).Assembly;

			if (web.GetName ().FullName == name.FullName)
				return web;
			else
				throw new NotImplementedException ();
		}

		public string GetPathOfAssembly (AssemblyName name)
		{
			throw new NotImplementedException();
		}

		public Type GetType (string name, bool throwOnError, bool ignoreCase)
		{
			throw new NotImplementedException ();
		}

		public Type GetType (string name, bool throwOnError)
		{
			//TODO: Look up in other referenced assemblies (project support)
			return Type.GetType (name, throwOnError);
		}

		public Type GetType (string name)
		{
			//TODO: Look up in other referenced assemblies (project support)
			return Type.GetType (name);
		}

		public void ReferenceAssembly (AssemblyName name)
		{
			//TODO: Actually add reference: need project support
			//throw new NotImplementedException ();
		}

		#endregion
	}
}
